import { Type } from "@sinclair/typebox";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
  stringEnum,
  type OpenClawPluginApi,
} from "openclaw/plugin-sdk";
import { SensorTowerClient, type SensorTowerSearchApp } from "./client.js";
import { resolveSensorTowerConfig, type SensorTowerMetadataOs } from "./config.js";

type JsonRecord = Record<string, unknown>;

type SalesRow = {
  date?: string;
  country?: string;
  downloads?: number;
  revenue?: number;
};

type TopCountry = {
  country: string;
  downloadsEstimate: number | null;
  revenueEstimate: number | null;
};

const PARAM_WRAPPER_KEYS = ["input", "args", "arguments", "params", "payload", "data"] as const;
const SEARCH_RESULTS_LIMIT = 10;
const MIN_QUERY_MATCH_SCORE = 0.55;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeParamKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function collectParamRecords(root: JsonRecord): JsonRecord[] {
  const out: JsonRecord[] = [root];
  const seen = new Set<JsonRecord>([root]);
  let frontier: JsonRecord[] = [root];
  for (let depth = 0; depth < 3; depth += 1) {
    const next: JsonRecord[] = [];
    for (const record of frontier) {
      for (const wrapperKey of PARAM_WRAPPER_KEYS) {
        const wrapped = asRecord(record[wrapperKey]);
        if (!wrapped || seen.has(wrapped)) {
          continue;
        }
        seen.add(wrapped);
        out.push(wrapped);
        next.push(wrapped);
      }
    }
    if (next.length === 0) {
      break;
    }
    frontier = next;
  }
  return out;
}

function readInputStringParam(params: JsonRecord, keys: string[]): string | undefined {
  const lookup = new Set(keys.map((key) => normalizeParamKey(key)));
  const records = collectParamRecords(params);
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "string") {
        continue;
      }
      if (!lookup.has(normalizeParamKey(key))) {
        continue;
      }
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function readInputNumberParam(params: JsonRecord, keys: string[]): number | undefined {
  const lookup = new Set(keys.map((key) => normalizeParamKey(key)));
  const records = collectParamRecords(params);
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!lookup.has(normalizeParamKey(key))) {
        continue;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value.trim());
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }
  return undefined;
}

function readBestEffortAppQuery(params: JsonRecord): string | undefined {
  const explicit = readInputStringParam(params, [
    "app_query",
    "appQuery",
    "query",
    "search",
    "term",
    "keyword",
    "app_name",
    "appName",
    "name",
  ]);
  if (explicit) {
    return explicit;
  }

  // Fallback for degraded tool calls that pass a lone free-form string field.
  const records = collectParamRecords(params);
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "string") {
        continue;
      }
      const normalized = normalizeParamKey(key);
      if (["month", "metadataos", "appid", "unifiedappid", "id"].includes(normalized)) {
        continue;
      }
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function readString(record: JsonRecord | null, keys: string[]): string | undefined {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function readNumber(record: JsonRecord | null, keys: string[]): number | undefined {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function isUnifiedAppId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

function toIsoDateUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveMonthWindow(monthInput?: string): {
  month: string;
  startDate: string;
  endDate: string;
} {
  let year: number;
  let month: number;
  if (monthInput) {
    const match = monthInput.trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new Error("month must use YYYY-MM format");
    }
    year = Number.parseInt(match[1] ?? "", 10);
    month = Number.parseInt(match[2] ?? "", 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new Error("month must be a valid YYYY-MM value");
    }
  } else {
    const now = new Date();
    const prevMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    year = prevMonthFirst.getUTCFullYear();
    month = prevMonthFirst.getUTCMonth() + 1;
  }
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    startDate: toIsoDateUtc(start),
    endDate: toIsoDateUtc(end),
  };
}

function parseReleaseDate(details: JsonRecord | null): string | undefined {
  const asDateString = readString(details, [
    "release_date",
    "released",
    "published_date",
    "launch_date",
    "first_seen_at",
  ]);
  if (asDateString) {
    const dateOnly = asDateString.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    const parsed = Date.parse(asDateString);
    if (!Number.isNaN(parsed)) {
      return toIsoDateUtc(new Date(parsed));
    }
  }
  const asEpoch = readNumber(details, ["released_at", "release_timestamp", "first_seen_ts"]);
  if (typeof asEpoch === "number") {
    const ms = asEpoch > 10_000_000_000 ? asEpoch : asEpoch * 1000;
    return toIsoDateUtc(new Date(ms));
  }
  return undefined;
}

function normalizeLanguageList(value: unknown): string[] {
  if (Array.isArray(value)) {
    const fromStrings = value
      .map((entry) => {
        if (typeof entry === "string") {
          return entry.trim();
        }
        const record = asRecord(entry);
        if (!record) {
          return "";
        }
        return readString(record, ["language", "language_code", "code", "locale", "name"]) ?? "";
      })
      .filter(Boolean);
    return Array.from(new Set(fromStrings));
  }
  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/[,\s]+/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
  }
  if (value && typeof value === "object") {
    return Array.from(
      new Set(
        Object.keys(value as JsonRecord)
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
  }
  return [];
}

function extractLanguages(details: JsonRecord | null): string[] {
  if (!details) {
    return [];
  }
  const candidates = [
    "languages",
    "language_codes",
    "supported_languages",
    "locales",
    "locale_codes",
    "translation_languages",
  ];
  for (const key of candidates) {
    const next = normalizeLanguageList(details[key]);
    if (next.length > 0) {
      return next;
    }
  }
  return [];
}

function parseSalesRows(rows: JsonRecord[]): SalesRow[] {
  return rows.map((row) => ({
    date: readString(row, ["date", "month", "period"]),
    country: readString(row, ["country", "country_code"]),
    downloads: readNumber(row, ["unified_units", "units", "downloads"]),
    revenue: readNumber(row, ["unified_revenue", "revenue"]),
  }));
}

function isAggregateCountry(country: string | undefined): boolean {
  if (!country) {
    return false;
  }
  const normalized = country.trim().toUpperCase();
  return normalized === "WW" || normalized === "WORLDWIDE" || normalized === "ALL";
}

function sumNumbers(values: Array<number | undefined>): number {
  return values.reduce((acc, value) => acc + (typeof value === "number" ? value : 0), 0);
}

function buildTopCountries(rows: SalesRow[], limit: number): TopCountry[] {
  const byCountry = new Map<string, { downloads: number; revenue: number }>();
  for (const row of rows) {
    const country = row.country?.trim().toUpperCase();
    if (!country || isAggregateCountry(country)) {
      continue;
    }
    const next = byCountry.get(country) ?? { downloads: 0, revenue: 0 };
    next.downloads += row.downloads ?? 0;
    next.revenue += row.revenue ?? 0;
    byCountry.set(country, next);
  }
  return Array.from(byCountry.entries())
    .map(([country, metrics]) => ({
      country,
      downloadsEstimate: metrics.downloads,
      revenueEstimate: metrics.revenue,
    }))
    .sort((a, b) => (b.downloadsEstimate ?? 0) - (a.downloadsEstimate ?? 0))
    .slice(0, limit);
}

function extractTopCountriesFromDetails(details: JsonRecord | null, limit: number): TopCountry[] {
  if (!details) {
    return [];
  }
  const candidates = [
    "top_countries",
    "countries",
    "country_codes",
    "available_countries",
    "supported_countries",
  ];
  for (const key of candidates) {
    const value = details[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const parsed = value
      .map((entry) => {
        if (typeof entry === "string") {
          const country = entry.trim().toUpperCase();
          return country
            ? ({ country, downloadsEstimate: null, revenueEstimate: null } satisfies TopCountry)
            : null;
        }
        const record = asRecord(entry);
        if (!record) {
          return null;
        }
        const country = readString(record, ["country", "country_code", "code", "name"])
          ?.trim()
          .toUpperCase();
        if (!country) {
          return null;
        }
        return {
          country,
          downloadsEstimate: readNumber(record, ["downloads", "units"]) ?? null,
          revenueEstimate: readNumber(record, ["revenue"]) ?? null,
        } satisfies TopCountry;
      })
      .filter((entry): entry is TopCountry => Boolean(entry))
      .slice(0, limit);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
}

function resolveLastMonthMetrics(rows: SalesRow[]): {
  downloadsEstimate: number | null;
  revenueEstimate: number | null;
  rowsForTopCountries: SalesRow[];
} {
  const nonAggregates = rows.filter((row) => !isAggregateCountry(row.country));
  if (nonAggregates.length > 0) {
    return {
      downloadsEstimate: sumNumbers(nonAggregates.map((row) => row.downloads)),
      revenueEstimate: sumNumbers(nonAggregates.map((row) => row.revenue)),
      rowsForTopCountries: nonAggregates,
    };
  }
  if (rows.length === 0) {
    return {
      downloadsEstimate: null,
      revenueEstimate: null,
      rowsForTopCountries: [],
    };
  }
  return {
    downloadsEstimate: sumNumbers(rows.map((row) => row.downloads)),
    revenueEstimate: sumNumbers(rows.map((row) => row.revenue)),
    rowsForTopCountries: [],
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}

function inferOsFromAppId(appId: string): SensorTowerMetadataOs | null {
  const trimmed = appId.trim();
  if (/^\d+$/.test(trimmed)) {
    return "ios";
  }
  if (trimmed.includes(".")) {
    return "android";
  }
  return null;
}

function isLikelyAndroidPackageId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  return /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(trimmed);
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeCompact(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "");
}

function scoreNameMatch(query: string, candidateName: string): number {
  const queryCompact = normalizeCompact(query);
  const candidateCompact = normalizeCompact(candidateName);
  if (!queryCompact || !candidateCompact) {
    return 0;
  }
  if (queryCompact === candidateCompact) {
    return 1;
  }

  if (candidateCompact.startsWith(queryCompact) || queryCompact.startsWith(candidateCompact)) {
    const ratio =
      Math.min(queryCompact.length, candidateCompact.length) /
      Math.max(queryCompact.length, candidateCompact.length);
    return Math.min(0.97, 0.82 + ratio * 0.15);
  }

  const queryTokens = new Set(normalizeTokens(query));
  const candidateTokens = new Set(normalizeTokens(candidateName));
  if (queryTokens.size === 0 || candidateTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    }
  }
  if (overlap === 0) {
    return 0;
  }

  const recall = overlap / queryTokens.size;
  const precision = overlap / candidateTokens.size;
  const union = queryTokens.size + candidateTokens.size - overlap;
  const jaccard = union > 0 ? overlap / union : 0;
  return recall * 0.6 + precision * 0.3 + jaccard * 0.1;
}

function selectBestSearchResult(
  query: string,
  searchResults: SensorTowerSearchApp[],
): { result: SensorTowerSearchApp; score: number; candidates: string[] } | null {
  if (searchResults.length === 0) {
    return null;
  }
  const ranked = searchResults
    .map((result) => {
      const name = result.name?.trim();
      const score = name ? scoreNameMatch(query, name) : 0;
      return { result, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) {
    return null;
  }
  return {
    result: best.result,
    score: best.score,
    candidates: ranked.slice(0, 5).map((entry) => entry.result.name ?? entry.result.unifiedAppId),
  };
}

export function createSensorTowerAppSnapshotTool(api: OpenClawPluginApi) {
  return {
    name: "sensortower_app_snapshot",
    description:
      "Generates a Sensor Tower app snapshot by aggregating metadata from `/v1/{os}/apps` and performance metrics from `/v1/{os}/sales_report_estimates`. Returns overall revenue, RDP, last-month downloads, metadata text, top countries, and languages. Requires one app identifier: app_query/query, app_id, or unified_app_id.",
    parameters: Type.Object({
      app_query: Type.Optional(
        Type.String({
          description:
            "App search query if unified_app_id/app_id is not provided. This is the preferred input for names.",
        }),
      ),
      query: Type.Optional(
        Type.String({
          description: "Alias for app_query.",
        }),
      ),
      unified_app_id: Type.Optional(
        Type.String({
          description: "Sensor Tower unified app id (24-char hex).",
        }),
      ),
      app_id: Type.Optional(
        Type.String({
          description: "Platform app id (iOS numeric id or Android package name).",
        }),
      ),
      month: Type.Optional(
        Type.String({
          description: "Month in YYYY-MM. Defaults to previous calendar month (UTC).",
        }),
      ),
      metadata_os: Type.Optional(
        stringEnum(["unified", "ios", "android"], {
          description: "OS namespace for app details lookup. Defaults to plugin config value.",
        }),
      ),
      top_countries_limit: Type.Optional(
        Type.Number({
          minimum: 1,
          maximum: 25,
          description: "Max countries in top_countries output (default 10).",
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      try {
        const config = resolveSensorTowerConfig(api.pluginConfig);
        if (!config.authToken) {
          throw new Error(
            "Sensor Tower auth token missing. Set plugins.entries.sensortower-aso.config.authToken or SENSORTOWER_AUTH_TOKEN.",
          );
        }

        const safeParams = asRecord(params) ?? {};
        const unifiedAppIdInput =
          readStringParam(params, "unified_app_id") ??
          readInputStringParam(safeParams, ["unified_app_id", "unifiedAppId", "unified_id"]);
        const appIdInput =
          readStringParam(params, "app_id") ??
          readInputStringParam(safeParams, [
            "app_id",
            "appId",
            "ios_app_id",
            "android_app_id",
            "bundle_id",
            "package_name",
            "id",
          ]);
        const rawAppQuery = readStringParam(params, "app_query") ?? readBestEffortAppQuery(safeParams);
        const inferredAppIdFromQuery =
          !appIdInput && rawAppQuery && isLikelyAndroidPackageId(rawAppQuery)
            ? rawAppQuery.trim()
            : undefined;
        const effectiveAppIdInput = appIdInput ?? inferredAppIdFromQuery;
        const appQuery = inferredAppIdFromQuery ? undefined : rawAppQuery;

        if (!unifiedAppIdInput && !effectiveAppIdInput && !appQuery) {
          return jsonResult({
            ok: false,
            error: "Missing app identifier. Provide unified_app_id, app_id, or app_query.",
            retryHint:
              'Retry with at least one field, e.g. {"app_query":"AiRide"} or {"app_id":"284882215","metadata_os":"ios"}.',
            acceptedKeys: [
              "app_query",
              "query",
              "app_id",
              "unified_app_id",
              "metadata_os",
              "month",
              "top_countries_limit",
            ],
          });
        }
        if (
          unifiedAppIdInput &&
          !isUnifiedAppId(unifiedAppIdInput) &&
          !effectiveAppIdInput &&
          !appQuery
        ) {
          throw new Error("unified_app_id must be a 24-char hex string.");
        }

        const metadataOsInput = (readStringParam(params, "metadata_os") ??
          readInputStringParam(safeParams, ["metadata_os", "metadataOs", "os"])) as
          | SensorTowerMetadataOs
          | undefined;
        const monthWindow = resolveMonthWindow(
          readStringParam(params, "month") ?? readInputStringParam(safeParams, ["month"]),
        );
        const topCountriesLimit =
          readNumberParam(params, "top_countries_limit", { integer: true }) ??
          readInputNumberParam(safeParams, ["top_countries_limit", "topCountriesLimit"]) ??
          config.defaultTopCountriesLimit;
        const normalizedTopCountriesLimit = Math.max(
          1,
          Math.min(25, Math.floor(topCountriesLimit)),
        );

        const client = new SensorTowerClient(config);

        let unifiedAppId = unifiedAppIdInput?.toLowerCase();
        let appId = unifiedAppId;
        let salesOs: SensorTowerMetadataOs = "unified";
        let detailsOs: SensorTowerMetadataOs = metadataOsInput ?? config.defaultMetadataOs;
        let appNameFromSearch: string | undefined;
        let queryResolutionNote: string | undefined;
        // The platform-specific app ID used for metadata (may differ from appId
        // which is used for sales). When we have a unified ID we resolve to a
        // platform ID so we can call `/v1/{ios|android}/apps` for rich metadata.
        let detailsAppId: string | undefined;

        if (effectiveAppIdInput) {
          appId = effectiveAppIdInput.trim();
          const inferredOs = inferOsFromAppId(appId);
          if (!metadataOsInput) {
            if (config.defaultMetadataOs === "unified") {
              detailsOs = inferredOs ?? "ios";
            } else {
              detailsOs = config.defaultMetadataOs;
            }
          }
          if (detailsOs === "unified") {
            detailsOs = inferredOs ?? "ios";
          }
          salesOs = detailsOs;
          detailsAppId = appId;
          unifiedAppId = null;
        } else if (!unifiedAppId) {
          const queryText = appQuery ?? "";
          const searchResults = await client.searchUnifiedApps(queryText, SEARCH_RESULTS_LIMIT);
          const resolved = selectBestSearchResult(queryText, searchResults);
          if (!resolved) {
            throw new Error(`No Sensor Tower app found for query: ${appQuery}`);
          }
          if (resolved.score < MIN_QUERY_MATCH_SCORE) {
            throw new Error(
              `No confident Sensor Tower app match for query "${queryText}". Top candidates: ${resolved.candidates.join(", ")}`,
            );
          }
          unifiedAppId = resolved.result.unifiedAppId;
          appId = unifiedAppId;
          appNameFromSearch = resolved.result.name;
          if (resolved.result.name && resolved.score < 0.75) {
            queryResolutionNote = `Query "${queryText}" weakly matched "${resolved.result.name}" (score ${resolved.score.toFixed(2)}). Verify before relying on this snapshot.`;
          }
          salesOs = "unified";
        } else {
          appId = unifiedAppId;
          salesOs = "unified";
        }

        if (!appId) {
          throw new Error("Unable to resolve app id.");
        }

        // When we have a unified app ID, resolve it to a platform-specific ID
        // so we can call `/v1/{ios|android}/apps` for metadata. The
        // `/v1/unified/apps` endpoint is only a mapping endpoint and does NOT
        // return description, subtitle, languages, etc.
        if (unifiedAppId && !detailsAppId) {
          const resolved = await client.resolveUnifiedAppIds(unifiedAppId);
          if (resolved.iosAppId) {
            detailsAppId = resolved.iosAppId;
            detailsOs = "ios";
          } else if (resolved.androidAppId) {
            detailsAppId = resolved.androidAppId;
            detailsOs = "android";
          } else {
            // Fallback: use the unified ID itself with ios (best effort)
            detailsAppId = unifiedAppId;
            detailsOs = metadataOsInput === "android" ? "android" : "ios";
          }
        }
        if (!detailsAppId) {
          detailsAppId = appId!;
        }

        // Safety check: The /v1/unified/apps endpoint does NOT return rich metadata
        // (description, subtitle, languages). If detailsOs is still "unified" at this
        // point, force it to "ios" to ensure we get complete metadata.
        if (detailsOs === "unified") {
          detailsOs = "ios";
        }

        // Now call the platform-specific `/v1/{os}/apps` endpoint to get rich
        // metadata: name, description, subtitle, languages, release_date, etc.
        const details = await client.getAppDetails({
          appId: detailsAppId,
          os: detailsOs,
        });

        if (!unifiedAppId) {
          const detailsUnifiedId = readString(details, ["$id", "unified_app_id", "unified_id"]);
          unifiedAppId =
            detailsUnifiedId && isUnifiedAppId(detailsUnifiedId)
              ? detailsUnifiedId.toLowerCase()
              : null;
        }

        const releaseDate = parseReleaseDate(details) ?? config.allTimeFallbackStartDate;
        const today = toIsoDateUtc(new Date());

        const [allTimeSalesRaw, monthSalesRaw] = await Promise.all([
          client.getSalesRows({
            appId,
            os: salesOs,
            startDate: releaseDate,
            endDate: today,
            dateGranularity: "monthly",
            countries: config.defaultCountry,
          }),
          client.getSalesRows({
            appId,
            os: salesOs,
            startDate: monthWindow.startDate,
            endDate: monthWindow.endDate,
            dateGranularity: "monthly",
          }),
        ]);

        const allTimeSales = parseSalesRows(allTimeSalesRaw);
        const monthSales = parseSalesRows(monthSalesRaw);

        const overallRevenue = sumNumbers(allTimeSales.map((row) => row.revenue));
        const overallDownloads = sumNumbers(allTimeSales.map((row) => row.downloads));
        const overallRdp = overallDownloads > 0 ? overallRevenue / overallDownloads : null;

        const monthMetrics = resolveLastMonthMetrics(monthSales);
        const salesTopCountries = buildTopCountries(
          monthMetrics.rowsForTopCountries,
          normalizedTopCountriesLimit,
        );
        const topCountries =
          salesTopCountries.length > 0
            ? salesTopCountries
            : extractTopCountriesFromDetails(details, normalizedTopCountriesLimit);

        const subtitleOrShortDescription = readString(details, ["subtitle", "short_description"]);
        const longDescription = readString(details, ["description"]);
        const appName =
          readString(details, ["name", "app_name", "title"]) ?? appNameFromSearch ?? null;
        const languages = unique(extractLanguages(details));

        return jsonResult({
          unifiedAppId,
          appId,
          appOs: salesOs,
          appName,
          month: monthWindow.month,
          metadata: {
            subtitleOrShortDescription,
            longDescription,
            languages,
          },
          metrics: {
            overall: {
              revenueWwEstimate: Number.isFinite(overallRevenue) ? overallRevenue : null,
              downloadsWwEstimate: Number.isFinite(overallDownloads) ? overallDownloads : null,
              rdpWwEstimate: overallRdp,
            },
            lastMonth: {
              startDate: monthWindow.startDate,
              endDate: monthWindow.endDate,
              downloadsEstimate: monthMetrics.downloadsEstimate,
              revenueEstimate: monthMetrics.revenueEstimate,
              topCountriesByDownloads: topCountries,
            },
          },
          sources: {
            searchEndpoint: config.endpoints.searchEntities,
            detailsEndpoint: config.endpoints.appDetails,
            salesEndpoint: config.endpoints.salesReport,
          },
          notes: [
            "All values are Sensor Tower estimates.",
            "Plugin enforces request pacing via requestsPerMinute (default 6).",
            "Default auth mode is query token to match Sensor Tower API examples.",
            "If top countries are absent in sales response, the plugin falls back to metadata fields when available.",
            ...(queryResolutionNote ? [queryResolutionNote] : []),
          ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ ok: false, error: message });
      }
    },
  };
}
