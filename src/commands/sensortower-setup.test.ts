import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  SENSORTOWER_DEFAULT_AUTH_MODE,
  SENSORTOWER_DEFAULT_REQUESTS_PER_MINUTE,
  SENSORTOWER_PLUGIN_ID,
  SENSORTOWER_TOOL_NAME,
  applySensorTowerSetup,
  promptSensorTowerSetup,
  resolveSensorTowerConfiguredToken,
  resolveSensorTowerEnvToken,
} from "./sensortower-setup.js";

describe("sensortower setup helpers", () => {
  it("applies plugin defaults, token, and tool allowlist", () => {
    const cfg: OpenClawConfig = {
      tools: {
        allow: ["memory_search"],
      },
    };
    const next = applySensorTowerSetup({
      cfg,
      token: "ST0_TOKEN",
    });

    expect(next.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.enabled).toBe(true);
    expect(next.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.config).toMatchObject({
      authToken: "ST0_TOKEN",
      requestsPerMinute: SENSORTOWER_DEFAULT_REQUESTS_PER_MINUTE,
      authMode: SENSORTOWER_DEFAULT_AUTH_MODE,
    });
    expect(next.tools?.allow).toEqual(["memory_search", SENSORTOWER_TOOL_NAME]);
  });

  it("preserves existing token/rpm when new token is omitted", () => {
    const cfg: OpenClawConfig = {
      plugins: {
        entries: {
          [SENSORTOWER_PLUGIN_ID]: {
            enabled: false,
            config: {
              authToken: "EXISTING",
              requestsPerMinute: 9,
              authMode: "bearer",
            },
          },
        },
      },
      tools: {
        allow: [SENSORTOWER_PLUGIN_ID],
      },
    };
    const next = applySensorTowerSetup({
      cfg,
    });

    expect(next.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.enabled).toBe(true);
    expect(next.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.config).toMatchObject({
      authToken: "EXISTING",
      requestsPerMinute: 9,
      authMode: "bearer",
    });
    expect(next.tools?.allow).toEqual([SENSORTOWER_PLUGIN_ID]);
  });

  it("prompts and applies setup when confirmed", async () => {
    const note = vi.fn(async () => {});
    const confirm = vi.fn(async () => true);
    const text = vi.fn(async () => "ST0_PROMPT_TOKEN");
    const next = await promptSensorTowerSetup({
      cfg: {},
      io: {
        note,
        confirm,
        text,
      },
      initialEnable: false,
    });

    expect(confirm).toHaveBeenCalled();
    expect(text).toHaveBeenCalled();
    expect(next.plugins?.entries?.[SENSORTOWER_PLUGIN_ID]?.enabled).toBe(true);
    expect(resolveSensorTowerConfiguredToken(next)).toBe("ST0_PROMPT_TOKEN");
    expect(next.tools?.allow).toContain(SENSORTOWER_TOOL_NAME);
    expect(note).toHaveBeenCalled();
  });

  it("returns unchanged config when setup is declined", async () => {
    const cfg: OpenClawConfig = {
      tools: { allow: ["memory_search"] },
    };
    const text = vi.fn(async () => "SHOULD_NOT_BE_USED");
    const next = await promptSensorTowerSetup({
      cfg,
      io: {
        note: vi.fn(async () => {}),
        confirm: vi.fn(async () => false),
        text,
      },
    });

    expect(next).toEqual(cfg);
    expect(text).not.toHaveBeenCalled();
  });

  it("reads env token aliases", () => {
    vi.stubEnv("SENSORTOWER_AUTH_TOKEN", "");
    vi.stubEnv("SENSOR_TOWER_AUTH_TOKEN", "ENV_TOKEN");
    expect(resolveSensorTowerEnvToken(process.env)).toBe("ENV_TOKEN");
    vi.unstubAllEnvs();
  });
});
