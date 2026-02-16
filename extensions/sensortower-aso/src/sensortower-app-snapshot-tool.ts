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
const DEFAULT_CANDIDATES_LIMIT = 5;
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

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  return undefined;
}

function readInputBooleanParam(params: JsonRecord, keys: string[]): boolean | undefined {
  const lookup = new Set(keys.map((key) => normalizeParamKey(key)));
  const records = collectParamRecords(params);
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!lookup.has(normalizeParamKey(key))) {
        continue;
      }
      const parsed = parseBoolean(value);
      if (typeof parsed === "boolean") {
        return parsed;
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
    // Sensor Tower may return either verbose keys (country, unified_units, ...)
    // or compact keys (c, u, r, d) depending on endpoint/account.
    date: readString(row, ["date", "month", "period", "d"]),
    country: readString(row, ["country", "country_code", "c"]),
    downloads: readNumber(row, ["unified_units", "units", "downloads", "u"]),
    revenue: readNumber(row, ["unified_revenue", "revenue", "r"]),
  }));
}

function isAggregateCountry(country: string | undefined): boolean {
  if (!country) {
    return false;
  }
  const normalized = country.trim().toUpperCase();
  return normalized === "WW" || normalized === "WORLDWIDE" || normalized === "ALL";
}

function sumNumbersOrNull(values: Array<number | undefined>): number | null {
  let total = 0;
  let hasNumeric = false;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    total += value;
    hasNumeric = true;
  }
  return hasNumeric ? total : null;
}

function buildTopCountries(rows: SalesRow[], limit: number): TopCountry[] {
  const byCountry = new Map<
    string,
    { downloads: number; revenue: number; hasDownloads: boolean; hasRevenue: boolean }
  >();
  for (const row of rows) {
    const country = row.country?.trim().toUpperCase();
    if (!country || isAggregateCountry(country)) {
      continue;
    }
    const next = byCountry.get(country) ?? {
      downloads: 0,
      revenue: 0,
      hasDownloads: false,
      hasRevenue: false,
    };
    if (typeof row.downloads === "number" && Number.isFinite(row.downloads)) {
      next.downloads += row.downloads;
      next.hasDownloads = true;
    }
    if (typeof row.revenue === "number" && Number.isFinite(row.revenue)) {
      next.revenue += row.revenue;
      next.hasRevenue = true;
    }
    byCountry.set(country, next);
  }
  return Array.from(byCountry.entries())
    .filter(([, metrics]) => metrics.hasDownloads)
    .map(([country, metrics]) => ({
      country,
      downloadsEstimate: metrics.downloads,
      revenueEstimate: metrics.hasRevenue ? metrics.revenue : null,
    }))
    .toSorted((a, b) => (b.downloadsEstimate ?? 0) - (a.downloadsEstimate ?? 0))
    .slice(0, limit);
}

function resolveLastMonthMetrics(rows: SalesRow[]): {
  downloadsEstimate: number | null;
  revenueEstimate: number | null;
  rowsForTopCountries: SalesRow[];
} {
  const nonAggregates = rows.filter((row) => !isAggregateCountry(row.country));
  if (nonAggregates.length > 0) {
    return {
      downloadsEstimate: sumNumbersOrNull(nonAggregates.map((row) => row.downloads)),
      revenueEstimate: sumNumbersOrNull(nonAggregates.map((row) => row.revenue)),
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
    downloadsEstimate: sumNumbersOrNull(rows.map((row) => row.downloads)),
    revenueEstimate: sumNumbersOrNull(rows.map((row) => row.revenue)),
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
    .toSorted((a, b) => b.score - a.score);

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

function readIdentifierInputs(params: Record<string, unknown>): {
  safeParams: JsonRecord;
  unifiedAppIdInput: string | undefined;
  appIdInput: string | undefined;
  appQuery: string | undefined;
} {
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
  return {
    safeParams,
    unifiedAppIdInput,
    appIdInput: appIdInput ?? inferredAppIdFromQuery,
    appQuery: inferredAppIdFromQuery ? undefined : rawAppQuery,
  };
}

type QueryCandidate = {
  rank: number;
  unifiedAppId: string;
  name: string | null;
  score: number;
};

type QueryResolution = {
  appNameFromSearch?: string;
  queryResolutionNote?: string;
};

async function listQueryCandidates(
  client: SensorTowerClient,
  appQuery: string | undefined,
  limit: number,
): Promise<QueryCandidate[]> {
  const queryText = appQuery ?? "";
  const searchResults = await client.searchUnifiedApps(queryText, SEARCH_RESULTS_LIMIT);
  if (searchResults.length === 0) {
    return [];
  }
  const ranked = searchResults
    .map((result) => {
      const name = result.name?.trim();
      const score = name ? scoreNameMatch(queryText, name) : 0;
      return { result, score };
    })
    .toSorted((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(SEARCH_RESULTS_LIMIT, limit)));

  return ranked.map((entry, index) => ({
    rank: index + 1,
    unifiedAppId: entry.result.unifiedAppId,
    name: entry.result.name ?? null,
    score: Number(entry.score.toFixed(4)),
  }));
}

async function resolveUnifiedFromQuery(
  client: SensorTowerClient,
  appQuery: string | undefined,
): Promise<{ unifiedAppId: string } & QueryResolution> {
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
  return {
    unifiedAppId: resolved.result.unifiedAppId,
    appNameFromSearch: resolved.result.name,
    queryResolutionNote:
      resolved.result.name && resolved.score < 0.75
        ? `Query "${queryText}" weakly matched "${resolved.result.name}" (score ${resolved.score.toFixed(2)}). Verify before relying on this result.`
        : undefined,
  };
}

export function createSensorTowerAppSnapshotTool(api: OpenClawPluginApi) {
  return {
    name: "sensortower_app_snapshot",
    description:
      "Sensor Tower metadata tool. Returns ONE app's metadata from `/v1/{os}/apps`: appName, subtitleOrShortDescription, longDescription, languages. Inputs: app_id (literal iOS numeric ID or Android package), unified_app_id (24-char hex), or app_query/query (name search). Candidate mode: set return_candidates=true with app_query/query and no IDs to return ranked candidates (no metadata fetch), then call again with chosen unified_app_id/app_id. If app_id is provided, it is treated as a literal ID (not a name search).",
    parameters: Type.Object({
      app_query: Type.Optional(
        Type.String({
          description:
            "App name/search text. Preferred when you do not have an ID and when the input is a name.",
        }),
      ),
      query: Type.Optional(
        Type.String({
          description: "Alias for app_query (same behavior).",
        }),
      ),
      unified_app_id: Type.Optional(
        Type.String({
          description: "Sensor Tower unified app ID (24-char hex).",
        }),
      ),
      app_id: Type.Optional(
        Type.String({
          description:
            "Literal platform app ID only (iOS numeric ID or Android package). Do not pass human app names here.",
        }),
      ),
      return_candidates: Type.Optional(
        Type.Boolean({
          description:
            "If true and app_query/query is provided (without IDs), return candidate list only. No metadata call is made.",
        }),
      ),
      candidates_limit: Type.Optional(
        Type.Number({
          minimum: 1,
          maximum: SEARCH_RESULTS_LIMIT,
          description: "Candidate count in candidate mode (default 5, max 10).",
        }),
      ),
      metadata_os: Type.Optional(
        stringEnum(["unified", "ios", "android"], {
          description:
            "OS namespace for metadata lookup. Defaults to plugin config. If unified is unresolved, tool may resolve to ios/android for richer metadata.",
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

        const { safeParams, unifiedAppIdInput, appIdInput, appQuery } = readIdentifierInputs(params);

        if (!unifiedAppIdInput && !appIdInput && !appQuery) {
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
              "return_candidates",
              "candidates_limit",
              "metadata_os",
            ],
          });
        }
        if (unifiedAppIdInput && !isUnifiedAppId(unifiedAppIdInput) && !appIdInput && !appQuery) {
          throw new Error("unified_app_id must be a 24-char hex string.");
        }

        const metadataOsInput = (readStringParam(params, "metadata_os") ??
          readInputStringParam(safeParams, ["metadata_os", "metadataOs", "os"])) as
          | SensorTowerMetadataOs
          | undefined;
        const returnCandidates =
          parseBoolean(params.return_candidates) ??
          readInputBooleanParam(safeParams, ["return_candidates", "returnCandidates"]) ??
          false;
        const candidatesLimitRaw =
          readNumberParam(params, "candidates_limit", { integer: true }) ??
          readInputNumberParam(safeParams, ["candidates_limit", "candidatesLimit"]) ??
          DEFAULT_CANDIDATES_LIMIT;
        const candidatesLimit = Math.max(
          1,
          Math.min(SEARCH_RESULTS_LIMIT, Math.floor(candidatesLimitRaw)),
        );

        const client = new SensorTowerClient(config);
        if (returnCandidates && appQuery && !appIdInput && !unifiedAppIdInput) {
          const candidates = await listQueryCandidates(client, appQuery, candidatesLimit);
          if (candidates.length === 0) {
            return jsonResult({
              ok: false,
              error: `No Sensor Tower app found for query: ${appQuery}`,
            });
          }
          return jsonResult({
            mode: "candidates",
            query: appQuery,
            candidates,
            nextStep:
              "Choose one candidate and call sensortower_app_snapshot with unified_app_id (or resolved app_id) to fetch metadata.",
            notes: [
              "Candidate mode is intended for LLM orchestration before selecting one app.",
              "No metadata fetch is performed in candidate mode.",
            ],
          });
        }

        let unifiedAppId = unifiedAppIdInput?.toLowerCase();
        let appId = unifiedAppId;
        let detailsOs: SensorTowerMetadataOs = metadataOsInput ?? config.defaultMetadataOs;
        let appNameFromSearch: string | undefined;
        let queryResolutionNote: string | undefined;
        // The platform-specific app ID used for metadata. When we have a unified
        // ID we resolve to a platform ID so we can call `/v1/{ios|android}/apps`
        // for rich metadata.
        let detailsAppId: string | undefined;

        if (appIdInput) {
          appId = appIdInput.trim();
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
          detailsAppId = appId;
          unifiedAppId = null;
        } else if (!unifiedAppId) {
          const resolved = await resolveUnifiedFromQuery(client, appQuery);
          unifiedAppId = resolved.unifiedAppId;
          appId = unifiedAppId;
          appNameFromSearch = resolved.appNameFromSearch;
          queryResolutionNote = resolved.queryResolutionNote;
        } else {
          appId = unifiedAppId;
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

        const subtitleOrShortDescription = readString(details, ["subtitle", "short_description"]);
        const longDescription = readString(details, ["description"]);
        const appName =
          readString(details, ["name", "app_name", "title"]) ?? appNameFromSearch ?? null;
        const languages = unique(extractLanguages(details));

        return jsonResult({
          unifiedAppId,
          appId: detailsAppId,
          appOs: detailsOs,
          appName,
          metadata: {
            subtitleOrShortDescription,
            longDescription,
            languages,
          },
          sources: {
            searchEndpoint: config.endpoints.searchEntities,
            detailsEndpoint: config.endpoints.appDetails,
          },
          notes: [
            "All values are Sensor Tower estimates.",
            "Plugin enforces request pacing via requestsPerMinute (default 6).",
            "Default auth mode is query token to match Sensor Tower API examples.",
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

export function createSensorTowerAppSalesDownloadsTool(api: OpenClawPluginApi) {
  return {
    name: "sensortower_app_sales_downloads",
    description:
      "Sensor Tower sales/download estimates tool. Returns ONE app's monthly estimates from `/v1/{os}/sales_report_estimates`: metrics.worldwide (downloadsEstimate, revenueEstimate) and metrics.lastMonth (downloadsEstimate, revenueEstimate, topCountriesByDownloads with downloadsEstimate + revenueEstimate). Inputs: app_id (literal iOS numeric ID or Android package), unified_app_id, or app_query/query. Candidate mode: set return_candidates=true with app_query/query and no IDs to return ranked candidates only (no sales fetch), then call again with chosen unified_app_id/app_id.",
    parameters: Type.Object({
      app_query: Type.Optional(
        Type.String({
          description:
            "App name/search text. Preferred when you do not have an ID and when the input is a name.",
        }),
      ),
      query: Type.Optional(
        Type.String({
          description: "Alias for app_query (same behavior).",
        }),
      ),
      unified_app_id: Type.Optional(
        Type.String({
          description: "Sensor Tower unified app ID (24-char hex).",
        }),
      ),
      app_id: Type.Optional(
        Type.String({
          description:
            "Literal platform app ID only (iOS numeric ID or Android package). Do not pass human app names here.",
        }),
      ),
      return_candidates: Type.Optional(
        Type.Boolean({
          description:
            "If true and app_query/query is provided (without IDs), return candidate list only. No sales call is made.",
        }),
      ),
      candidates_limit: Type.Optional(
        Type.Number({
          minimum: 1,
          maximum: SEARCH_RESULTS_LIMIT,
          description: "Candidate count in candidate mode (default 5, max 10).",
        }),
      ),
      month: Type.Optional(
        Type.String({
          description: "Month in YYYY-MM. Defaults to previous calendar month (UTC).",
        }),
      ),
      sales_os: Type.Optional(
        stringEnum(["unified", "ios", "android"], {
          description:
            "OS namespace for sales lookup. Defaults to inferred OS when app_id is provided, otherwise unified.",
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

        const { safeParams, unifiedAppIdInput, appIdInput, appQuery } = readIdentifierInputs(params);
        if (!unifiedAppIdInput && !appIdInput && !appQuery) {
          return jsonResult({
            ok: false,
            error: "Missing app identifier. Provide unified_app_id, app_id, or app_query.",
            retryHint:
              'Retry with at least one field, e.g. {"app_query":"AiRide"} or {"app_id":"com.aimarket.ai_ride"}.',
            acceptedKeys: [
              "app_query",
              "query",
              "app_id",
              "unified_app_id",
              "return_candidates",
              "candidates_limit",
              "month",
              "sales_os",
              "top_countries_limit",
            ],
          });
        }
        if (unifiedAppIdInput && !isUnifiedAppId(unifiedAppIdInput) && !appIdInput && !appQuery) {
          throw new Error("unified_app_id must be a 24-char hex string.");
        }

        const monthWindow = resolveMonthWindow(
          readStringParam(params, "month") ?? readInputStringParam(safeParams, ["month"]),
        );
        const requestedSalesOs = (readStringParam(params, "sales_os") ??
          readInputStringParam(safeParams, ["sales_os", "salesOs", "os"])) as
          | SensorTowerMetadataOs
          | undefined;
        const returnCandidates =
          parseBoolean(params.return_candidates) ??
          readInputBooleanParam(safeParams, ["return_candidates", "returnCandidates"]) ??
          false;
        const candidatesLimitRaw =
          readNumberParam(params, "candidates_limit", { integer: true }) ??
          readInputNumberParam(safeParams, ["candidates_limit", "candidatesLimit"]) ??
          DEFAULT_CANDIDATES_LIMIT;
        const candidatesLimit = Math.max(
          1,
          Math.min(SEARCH_RESULTS_LIMIT, Math.floor(candidatesLimitRaw)),
        );
        const topCountriesLimit =
          readNumberParam(params, "top_countries_limit", { integer: true }) ??
          readInputNumberParam(safeParams, ["top_countries_limit", "topCountriesLimit"]) ??
          config.defaultTopCountriesLimit;
        const normalizedTopCountriesLimit = Math.max(1, Math.min(25, Math.floor(topCountriesLimit)));

        const client = new SensorTowerClient(config);
        if (returnCandidates && appQuery && !appIdInput && !unifiedAppIdInput) {
          const candidates = await listQueryCandidates(client, appQuery, candidatesLimit);
          if (candidates.length === 0) {
            return jsonResult({
              ok: false,
              error: `No Sensor Tower app found for query: ${appQuery}`,
            });
          }
          return jsonResult({
            mode: "candidates",
            query: appQuery,
            candidates,
            nextStep:
              "Choose one candidate and call sensortower_app_sales_downloads with unified_app_id (or resolved app_id) to fetch sales/download estimates.",
            notes: [
              "Candidate mode is intended for LLM orchestration before selecting one app.",
              "No sales/download fetch is performed in candidate mode.",
            ],
          });
        }

        let unifiedAppId = unifiedAppIdInput?.toLowerCase() ?? null;
        let appId = unifiedAppId;
        let salesOs: SensorTowerMetadataOs = requestedSalesOs ?? "unified";
        let appNameFromSearch: string | undefined;
        let queryResolutionNote: string | undefined;

        if (appIdInput) {
          appId = appIdInput.trim();
          const inferredOs = inferOsFromAppId(appId);
          salesOs = requestedSalesOs ?? inferredOs ?? "unified";
          unifiedAppId = isUnifiedAppId(appId) ? appId.toLowerCase() : null;
        } else if (!unifiedAppId) {
          const resolved = await resolveUnifiedFromQuery(client, appQuery);
          unifiedAppId = resolved.unifiedAppId;
          appId = unifiedAppId;
          appNameFromSearch = resolved.appNameFromSearch;
          queryResolutionNote = resolved.queryResolutionNote;
          salesOs = requestedSalesOs ?? "unified";
        } else {
          appId = unifiedAppId;
          salesOs = requestedSalesOs ?? "unified";
        }

        if (!appId) {
          throw new Error("Unable to resolve app id.");
        }

        if (unifiedAppId && salesOs !== "unified") {
          const resolvedIds = await client.resolveUnifiedAppIds(unifiedAppId);
          if (salesOs === "ios" && resolvedIds.iosAppId) {
            appId = resolvedIds.iosAppId;
          } else if (salesOs === "android" && resolvedIds.androidAppId) {
            appId = resolvedIds.androidAppId;
          } else {
            throw new Error(
              `Unable to resolve ${salesOs} app id from unified_app_id ${unifiedAppId}. Retry with app_id or set sales_os to unified.`,
            );
          }
        }

        const [worldwideRaw, monthByCountryRaw] = await Promise.all([
          client.getSalesRows({
            appId,
            os: salesOs,
            startDate: monthWindow.startDate,
            endDate: monthWindow.endDate,
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

        const worldwideRows = parseSalesRows(worldwideRaw);
        const byCountryRows = parseSalesRows(monthByCountryRaw);
        const worldwideMetrics = resolveLastMonthMetrics(worldwideRows);
        const monthMetrics = resolveLastMonthMetrics(byCountryRows);
        const topCountries = buildTopCountries(
          monthMetrics.rowsForTopCountries,
          normalizedTopCountriesLimit,
        );

        return jsonResult({
          unifiedAppId,
          appId,
          appOs: salesOs,
          appName: appNameFromSearch ?? null,
          month: monthWindow.month,
          metrics: {
            worldwide: {
              downloadsEstimate: worldwideMetrics.downloadsEstimate,
              revenueEstimate: worldwideMetrics.revenueEstimate,
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
            salesEndpoint: config.endpoints.salesReport,
          },
          notes: [
            "All values are Sensor Tower estimates.",
            "Plugin enforces request pacing via requestsPerMinute (default 6).",
            "Default auth mode is query token to match Sensor Tower API examples.",
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
