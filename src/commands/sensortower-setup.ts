import type { OpenClawConfig } from "../config/config.js";

export const SENSORTOWER_PLUGIN_ID = "sensortower-aso";
export const SENSORTOWER_TOOL_NAME = "sensortower_app_snapshot";
export const SENSORTOWER_DEFAULT_REQUESTS_PER_MINUTE = 6;
export const SENSORTOWER_DEFAULT_AUTH_MODE = "query";

const SENSORTOWER_TOKEN_ENV_KEYS = [
  "SENSORTOWER_AUTH_TOKEN",
  "SENSOR_TOWER_AUTH_TOKEN",
  "SENSORTOWER_API_KEY",
  "SENSOR_TOWER_API_KEY",
] as const;

export type SensorTowerPromptIo = {
  note: (message: string, title?: string) => void | Promise<void>;
  confirm: (params: { message: string; initialValue?: boolean }) => Promise<boolean>;
  text: (params: {
    message: string;
    initialValue?: string;
    placeholder?: string;
  }) => Promise<string>;
};

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readFiniteInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, parsed);
    }
  }
  return undefined;
}

function readAuthMode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "bearer" || normalized === "query" || normalized === "both"
    ? normalized
    : undefined;
}

function resolveSensorTowerPluginConfig(cfg: OpenClawConfig): Record<string, unknown> {
  const entry = cfg.plugins?.entries?.[SENSORTOWER_PLUGIN_ID];
  if (!entry || !entry.config || typeof entry.config !== "object" || Array.isArray(entry.config)) {
    return {};
  }
  return entry.config;
}

function hasToolAllowEntry(cfg: OpenClawConfig, value: string): boolean {
  const allow = cfg.tools?.allow;
  return Array.isArray(allow) ? allow.includes(value) : false;
}

export function resolveSensorTowerEnvToken(env: NodeJS.ProcessEnv = process.env): string {
  for (const key of SENSORTOWER_TOKEN_ENV_KEYS) {
    const token = readTrimmedString(env[key]);
    if (token) {
      return token;
    }
  }
  return "";
}

export function resolveSensorTowerConfiguredToken(cfg: OpenClawConfig): string {
  const pluginConfig = resolveSensorTowerPluginConfig(cfg);
  return readTrimmedString(pluginConfig.authToken);
}

export function applySensorTowerSetup(params: {
  cfg: OpenClawConfig;
  token?: string;
}): OpenClawConfig {
  const { cfg } = params;
  const existingEntry = cfg.plugins?.entries?.[SENSORTOWER_PLUGIN_ID] ?? {};
  const existingConfig = resolveSensorTowerPluginConfig(cfg);
  const existingRpm = readFiniteInteger(existingConfig.requestsPerMinute);
  const existingAuthMode = readAuthMode(existingConfig.authMode);
  const token = readTrimmedString(params.token);

  const nextPluginConfig: Record<string, unknown> = {
    ...existingConfig,
    requestsPerMinute: existingRpm ?? SENSORTOWER_DEFAULT_REQUESTS_PER_MINUTE,
    authMode: existingAuthMode ?? SENSORTOWER_DEFAULT_AUTH_MODE,
  };
  if (token) {
    nextPluginConfig.authToken = token;
  }

  const nextToolsAllow = Array.isArray(cfg.tools?.allow) ? [...cfg.tools.allow] : [];
  if (
    !nextToolsAllow.includes(SENSORTOWER_TOOL_NAME) &&
    !hasToolAllowEntry(cfg, SENSORTOWER_PLUGIN_ID)
  ) {
    nextToolsAllow.push(SENSORTOWER_TOOL_NAME);
  }

  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      entries: {
        ...(cfg.plugins?.entries ?? {}),
        [SENSORTOWER_PLUGIN_ID]: {
          ...existingEntry,
          enabled: true,
          config: nextPluginConfig,
        },
      },
    },
    tools: {
      ...cfg.tools,
      allow: nextToolsAllow,
    },
  };
}

export async function promptSensorTowerSetup(params: {
  cfg: OpenClawConfig;
  io: SensorTowerPromptIo;
  initialEnable?: boolean;
}): Promise<OpenClawConfig> {
  const { cfg, io } = params;
  const existingToken = resolveSensorTowerConfiguredToken(cfg);
  const envToken = resolveSensorTowerEnvToken(process.env);
  const existingEnabled = cfg.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.enabled === true;
  const existingToolAllowed =
    hasToolAllowEntry(cfg, SENSORTOWER_TOOL_NAME) || hasToolAllowEntry(cfg, SENSORTOWER_PLUGIN_ID);

  await io.note(
    [
      "Sensor Tower integration adds the `sensortower_app_snapshot` tool for app intelligence workflows.",
      "It can return overall revenue/RDP, last-month downloads, metadata text, top countries, and languages.",
    ].join("\n"),
    "Sensor Tower (optional)",
  );

  const wantsSetup = await io.confirm({
    message: "Enable Sensor Tower tool now?",
    initialValue:
      params.initialEnable ?? (existingEnabled || existingToolAllowed || Boolean(existingToken)),
  });
  if (!wantsSetup) {
    return cfg;
  }

  const tokenInput = await io.text({
    message: existingToken
      ? "Sensor Tower auth token (leave blank to keep current or use env)"
      : "Sensor Tower auth token (leave blank to use env)",
    placeholder: existingToken ? "Leave blank to keep current token" : "ST0_...",
  });
  const token = readTrimmedString(tokenInput);

  const nextConfig = applySensorTowerSetup({
    cfg,
    token: token || undefined,
  });

  if (!token && !existingToken && !envToken) {
    await io.note(
      [
        "No token was saved in config, so the tool will require env auth at runtime.",
        "Set one of: SENSORTOWER_AUTH_TOKEN, SENSOR_TOWER_AUTH_TOKEN, SENSORTOWER_API_KEY, SENSOR_TOWER_API_KEY.",
      ].join("\n"),
      "Sensor Tower auth",
    );
  }

  await io.note(
    [
      "Sensor Tower plugin enabled.",
      `Tool allowlist includes: ${SENSORTOWER_TOOL_NAME}`,
      `Rate limit set to ${SENSORTOWER_DEFAULT_REQUESTS_PER_MINUTE} requests/minute.`,
      `Auth mode defaults to ${SENSORTOWER_DEFAULT_AUTH_MODE} (query token).`,
    ].join("\n"),
    "Sensor Tower",
  );

  return nextConfig;
}
