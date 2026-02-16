import type { SensorTowerMetadataOs, SensorTowerPluginConfig } from "./config.js";
import { getRateLimiter, sleepMs } from "./rate-limiter.js";

type JsonRecord = Record<string, unknown>;

export type SensorTowerSearchApp = {
  unifiedAppId: string;
  name?: string;
  raw: JsonRecord;
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function readString(record: JsonRecord, keys: string[]): string | undefined {
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

function isUnifiedAppId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

function normalizeToArray(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => asRecord(entry))
      .filter((entry): entry is JsonRecord => Boolean(entry));
  }
  const record = asRecord(payload);
  if (!record) {
    return [];
  }
  const keys = ["data", "results", "items", "apps"];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) => asRecord(entry))
        .filter((entry): entry is JsonRecord => Boolean(entry));
    }
  }
  return [record];
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const asSeconds = Number.parseFloat(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }
  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) {
    return null;
  }
  return Math.max(0, asDate - Date.now());
}

function formatEndpointPath(pathTemplate: string, params: { os?: SensorTowerMetadataOs }): string {
  return pathTemplate.replaceAll("{os}", params.os ?? "unified");
}

function resolveAppIdType(os: SensorTowerMetadataOs): string {
  if (os === "ios") {
    return "itunes";
  }
  if (os === "android") {
    return "android";
  }
  return "unified";
}

export class SensorTowerClient {
  private readonly limiter;

  constructor(private readonly config: SensorTowerPluginConfig) {
    this.limiter = getRateLimiter(this.config.baseUrl, this.config.requestsPerMinute);
  }

  async searchUnifiedApps(term: string, limit = 5): Promise<SensorTowerSearchApp[]> {
    const payload = await this.requestJson(this.config.endpoints.searchEntities, {
      entity_type: "app",
      term,
      limit: String(Math.max(1, Math.min(100, Math.floor(limit)))),
    });
    const rows = normalizeToArray(payload);
    const results: SensorTowerSearchApp[] = [];
    for (const row of rows) {
      const id = readString(row, ["$id", "unified_app_id", "app_id", "id"]);
      if (!id || !isUnifiedAppId(id)) {
        continue;
      }
      results.push({
        unifiedAppId: id.toLowerCase(),
        name: readString(row, ["name", "title", "app_name"]),
        raw: row,
      });
    }
    return results;
  }

  /**
   * Resolves a unified app ID to platform-specific app IDs via `/v1/unified/apps`.
   * Returns the raw mapping record which may contain `itunes_id`, `android_id`,
   * `ios_app_id`, `android_app_id`, etc.
   */
  async resolveUnifiedAppIds(unifiedAppId: string): Promise<{
    iosAppId?: string;
    androidAppId?: string;
    raw: JsonRecord | null;
  }> {
    const payload = await this.requestJson("/v1/unified/apps", {
      app_id_type: "unified",
      app_ids: unifiedAppId,
    });
    const rows = normalizeToArray(payload);
    const record = rows[0] ?? null;
    if (!record) {
      return { raw: null };
    }

    // Extract iOS app ID from nested itunes_apps array
    // Note: iOS app IDs are returned as numbers, so we need to convert to string
    let iosAppId: string | undefined;
    const itunesApps = record.itunes_apps;
    if (Array.isArray(itunesApps) && itunesApps.length > 0) {
      const firstItunesApp = asRecord(itunesApps[0]);
      if (firstItunesApp) {
        // Try reading as string first, then as number
        iosAppId = readString(firstItunesApp, ["app_id", "itunes_id", "ios_app_id", "ios_id"]);
        if (!iosAppId && typeof firstItunesApp.app_id === "number") {
          iosAppId = String(firstItunesApp.app_id);
        }
      }
    }
    // Fallback to direct fields if nested structure doesn't exist
    if (!iosAppId) {
      iosAppId = readString(record, [
        "itunes_id",
        "ios_app_id",
        "ios_id",
        "app_id_ios",
      ]);
    }

    // Extract Android app ID from nested android_apps array
    let androidAppId: string | undefined;
    const androidApps = record.android_apps;
    if (Array.isArray(androidApps) && androidApps.length > 0) {
      const firstAndroidApp = asRecord(androidApps[0]);
      if (firstAndroidApp) {
        androidAppId = readString(firstAndroidApp, [
          "app_id",
          "android_id",
          "android_app_id",
          "android_package",
        ]);
      }
    }
    // Fallback to direct fields if nested structure doesn't exist
    if (!androidAppId) {
      androidAppId = readString(record, [
        "android_id",
        "android_app_id",
        "android_package",
        "app_id_android",
        "google_play_id",
      ]);
    }

    return { iosAppId, androidAppId, raw: record };
  }

  async getAppDetails(params: {
    appId: string;
    os: SensorTowerMetadataOs;
  }): Promise<JsonRecord | null> {
    // Build query params based on OS type. The /v1/unified/apps endpoint
    // requires app_id_type, but /v1/{ios,android}/apps does not accept it;
    // instead it takes an optional country param for richer metadata.
    const queryParams: Record<string, string> = {
      app_ids: params.appId,
    };
    if (params.os === "unified") {
      queryParams.app_id_type = resolveAppIdType(params.os);
    } else {
      queryParams.country = "US";
    }
    const payload = await this.requestJson(
      formatEndpointPath(this.config.endpoints.appDetails, { os: params.os }),
      queryParams,
    );
    const rows = normalizeToArray(payload);
    if (rows.length === 0) {
      return null;
    }
    const target = params.appId.toLowerCase();
    const match = rows.find((row) => {
      const id = readString(row, ["$id", "unified_app_id", "app_id", "id"])?.toLowerCase();
      return id === target;
    });
    return match ?? rows[0] ?? null;
  }

  async getSalesRows(params: {
    appId: string;
    os: SensorTowerMetadataOs;
    startDate: string;
    endDate: string;
    dateGranularity: "monthly" | "daily" | "yearly";
    countries?: string | undefined;
  }): Promise<JsonRecord[]> {
    // The OpenAPI spec uses `app_ids` (plural, array) for ALL OS variants
    // (ios, android, unified). The previous code used `app_id` (singular)
    // for non-unified requests, which the API doesn't recognize.
    const query: Record<string, string> = {
      app_ids: params.appId,
      start_date: params.startDate,
      end_date: params.endDate,
      date_granularity: params.dateGranularity,
    };
    if (params.countries && params.countries.trim()) {
      query.countries = params.countries.trim();
    }
    const payload = await this.requestJson(
      formatEndpointPath(this.config.endpoints.salesReport, { os: params.os }),
      query,
    );
    return normalizeToArray(payload);
  }

  private buildUrl(pathTemplate: string, params: Record<string, string>): URL {
    const base = this.config.baseUrl.endsWith("/")
      ? this.config.baseUrl
      : `${this.config.baseUrl}/`;
    const relative = pathTemplate.startsWith("/") ? pathTemplate.slice(1) : pathTemplate;
    const url = new URL(relative, base);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    if (this.config.authMode === "query" || this.config.authMode === "both") {
      url.searchParams.set("auth_token", this.config.authToken);
    }
    return url;
  }

  private async requestJson(
    pathTemplate: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const url = this.buildUrl(pathTemplate, params);
    const headers = new Headers();
    headers.set("accept", "application/json");
    if (this.config.authMode === "bearer" || this.config.authMode === "both") {
      headers.set("authorization", `Bearer ${this.config.authToken}`);
    }

    const fallbackRetryMs = Math.ceil(60_000 / Math.max(1, this.config.requestsPerMinute));

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await this.limiter.waitTurn();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        if (response.status === 429 && attempt < 2) {
          const retryMs = parseRetryAfterMs(response.headers.get("retry-after")) ?? fallbackRetryMs;
          await sleepMs(retryMs);
          continue;
        }
        if (!response.ok) {
          const errorText = (await response.text()).trim();
          throw new Error(
            `Sensor Tower request failed (${response.status}) at ${url.pathname}: ${errorText || response.statusText}`,
          );
        }
        const text = (await response.text()).trim();
        if (!text) {
          return [];
        }
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`Sensor Tower returned non-JSON payload at ${url.pathname}`);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error(`Sensor Tower request timed out after ${this.config.timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    return [];
  }
}
