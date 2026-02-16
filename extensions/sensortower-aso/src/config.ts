export type SensorTowerMetadataOs = "unified" | "ios" | "android";
export type SensorTowerAuthMode = "bearer" | "query" | "both";

export type SensorTowerPluginConfig = {
  baseUrl: string;
  authToken: string;
  authMode: SensorTowerAuthMode;
  requestsPerMinute: number;
  timeoutMs: number;
  defaultMetadataOs: SensorTowerMetadataOs;
  defaultCountry: string;
  defaultTopCountriesLimit: number;
  allTimeFallbackStartDate: string;
  endpoints: {
    searchEntities: string;
    appDetails: string;
    salesReport: string;
  };
};

const DEFAULT_BASE_URL = "https://api.sensortower.com";
const DEFAULT_AUTH_MODE: SensorTowerAuthMode = "query";
const DEFAULT_REQUESTS_PER_MINUTE = 6;
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_METADATA_OS: SensorTowerMetadataOs = "unified";
const DEFAULT_COUNTRY = "WW";
const DEFAULT_TOP_COUNTRIES_LIMIT = 10;
const DEFAULT_ALL_TIME_FALLBACK_START_DATE = "2014-01-01";

const DEFAULT_SEARCH_ENDPOINT = "/v1/unified/search_entities";
const DEFAULT_DETAILS_ENDPOINT = "/v1/{os}/apps";
const DEFAULT_SALES_ENDPOINT = "/v1/{os}/sales_report_estimates";

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readInteger(
  value: unknown,
  options: { min?: number; max?: number; fallback: number },
): number {
  const { min, max, fallback } = options;
  const source =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;
  if (!Number.isFinite(source)) {
    return fallback;
  }
  let next = Math.floor(source);
  if (typeof min === "number") {
    next = Math.max(min, next);
  }
  if (typeof max === "number") {
    next = Math.min(max, next);
  }
  return next;
}

function readAuthMode(value: unknown): SensorTowerAuthMode {
  const v = readString(value)?.toLowerCase();
  if (v === "bearer" || v === "query" || v === "both") {
    return v;
  }
  return DEFAULT_AUTH_MODE;
}

function readMetadataOs(value: unknown): SensorTowerMetadataOs {
  const v = readString(value)?.toLowerCase();
  if (v === "unified" || v === "ios" || v === "android") {
    return v;
  }
  return DEFAULT_METADATA_OS;
}

function readToken(pluginConfig: Record<string, unknown>, env: NodeJS.ProcessEnv): string {
  const fromConfig = readString(pluginConfig.authToken);
  if (fromConfig) {
    return fromConfig;
  }
  const envCandidates = [
    env.SENSORTOWER_AUTH_TOKEN,
    env.SENSOR_TOWER_AUTH_TOKEN,
    env.SENSORTOWER_API_KEY,
    env.SENSOR_TOWER_API_KEY,
  ];
  for (const candidate of envCandidates) {
    const token = readString(candidate);
    if (token) {
      return token;
    }
  }
  return "";
}

export function resolveSensorTowerConfig(
  pluginConfig: Record<string, unknown> | undefined,
  env: NodeJS.ProcessEnv = process.env,
): SensorTowerPluginConfig {
  const raw = pluginConfig ?? {};
  const rawEndpoints =
    raw.endpoints && typeof raw.endpoints === "object" && !Array.isArray(raw.endpoints)
      ? (raw.endpoints as Record<string, unknown>)
      : {};
  return {
    baseUrl: readString(raw.baseUrl) ?? DEFAULT_BASE_URL,
    authToken: readToken(raw, env),
    authMode: readAuthMode(raw.authMode),
    requestsPerMinute: readInteger(raw.requestsPerMinute, {
      min: 1,
      max: 60,
      fallback: DEFAULT_REQUESTS_PER_MINUTE,
    }),
    timeoutMs: readInteger(raw.timeoutMs, {
      min: 1_000,
      fallback: DEFAULT_TIMEOUT_MS,
    }),
    defaultMetadataOs: readMetadataOs(raw.defaultMetadataOs),
    defaultCountry: readString(raw.defaultCountry)?.toUpperCase() ?? DEFAULT_COUNTRY,
    defaultTopCountriesLimit: readInteger(raw.defaultTopCountriesLimit, {
      min: 1,
      max: 25,
      fallback: DEFAULT_TOP_COUNTRIES_LIMIT,
    }),
    allTimeFallbackStartDate:
      readString(raw.allTimeFallbackStartDate) ?? DEFAULT_ALL_TIME_FALLBACK_START_DATE,
    endpoints: {
      searchEntities: readString(rawEndpoints.searchEntities) ?? DEFAULT_SEARCH_ENDPOINT,
      appDetails: readString(rawEndpoints.appDetails) ?? DEFAULT_DETAILS_ENDPOINT,
      salesReport:
        readString(rawEndpoints.salesReport) ??
        readString(rawEndpoints.unifiedSalesReport) ??
        DEFAULT_SALES_ENDPOINT,
    },
  };
}
