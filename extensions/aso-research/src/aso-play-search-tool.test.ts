import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";
import { createAsoPlaySearchTool } from "./aso-play-search-tool.js";

vi.mock("./asospy-path.js", () => ({
  resolveAsospyExtensionPath: vi.fn((opts: { configPath?: string }) => opts.configPath ?? undefined),
}));
vi.mock("./workflow-asospy-search.js", () => ({
  runAsoPlaySearch: vi.fn(),
}));

import { runAsoPlaySearch } from "./workflow-asospy-search.js";

const mockRun = runAsoPlaySearch as ReturnType<typeof vi.fn>;

function fakeApi(
  overrides: Partial<OpenClawPluginApi> & { pluginConfig?: Record<string, unknown> } = {},
): OpenClawPluginApi {
  return {
    id: "aso-research",
    name: "aso-research",
    source: "test",
    config: {},
    pluginConfig: overrides.pluginConfig ?? {},
    // oxlint-disable-next-line typescript/no-explicit-any
    runtime: { version: "test" } as any,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    registerTool() {},
    registerHttpHandler() {},
    registerChannel() {},
    registerGatewayMethod() {},
    registerCli() {},
    registerService() {},
    registerProvider() {},
    registerHook() {},
    registerHttpRoute() {},
    registerCommand() {},
    on() {},
    resolvePath: (p) => p,
    ...overrides,
  };
}

describe("aso_play_search tool", () => {
  beforeEach(() => {
    mockRun.mockReset();
  });

  it("returns error when keyword is missing", async () => {
    const tool = createAsoPlaySearchTool(
      fakeApi({ pluginConfig: { asospyExtensionPath: "/ext" } }),
    );
    const res = await tool.execute("id", { keyword: "   " });
    expect(res.content).toHaveLength(1);
    expect(res.content[0]).toMatchObject({ type: "text" });
    expect((res.content[0] as { type: "text"; text: string }).text).toContain(
      "keyword is required",
    );
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("returns error when asospyExtensionPath is not set", async () => {
    const tool = createAsoPlaySearchTool(fakeApi({ pluginConfig: {} }));
    const res = await tool.execute("id", { keyword: "food" });
    expect(res.content).toHaveLength(1);
    expect((res.content[0] as { type: "text"; text: string }).text).toContain("ASOspy is required");
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("calls runAsoPlaySearch and returns markdown table when config and keyword provided", async () => {
    mockRun.mockResolvedValueOnce([
      {
        appName: "Uber Eats",
        packageId: "com.ubercab.eats",
        appUrl: "https://play.google.com/store/apps/details?id=com.ubercab.eats",
        dailyInstalls: "83k",
        age: "9 years",
      },
      {
        appName: "foodpanda",
        packageId: "com.global.foodpanda.android",
        appUrl: "https://play.google.com/store/apps/details?id=com.global.foodpanda.android",
        dailyInstalls: "51.4k",
        age: "12 years",
      },
    ]);
    const tool = createAsoPlaySearchTool(
      fakeApi({ pluginConfig: { asospyExtensionPath: "/tmp/asospy" } }),
    );
    const res = await tool.execute("id", { keyword: "food", hl: "en", limit: 20 });
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "food",
        hl: "en",
        limit: 20,
        asospyExtensionPath: "/tmp/asospy",
        overlayTimeoutMs: 12_000,
      }),
    );
    expect(res.content).toHaveLength(1);
    const text = (res.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("ASO Play search");
    expect(text).toContain("Uber Eats");
    expect(text).toContain("83k");
    expect(text).toContain("9 years");
    expect(text).toContain("foodpanda");
    expect(text).toContain("com.ubercab.eats");
    expect(text).toContain("https://play.google.com/store/apps/details?id=com.global.foodpanda.android");
    expect(text).toContain("51.4k");
    expect(text).toContain("12 years");
  });

  it("accepts app_query alias for keyword", async () => {
    mockRun.mockResolvedValueOnce([{ appName: "AiRide", dailyInstalls: "1k", age: "1 year" }]);
    const tool = createAsoPlaySearchTool(
      fakeApi({ pluginConfig: { asospyExtensionPath: "/tmp/asospy" } }),
    );
    const res = await tool.execute("id", { app_query: "ride app", hl: "en", limit: 10 });
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "ride app",
        hl: "en",
        limit: 10,
      }),
    );
    const text = (res.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("ASO Play search for **ride app**");
  });

  it("returns error message when runAsoPlaySearch throws", async () => {
    mockRun.mockRejectedValueOnce(new Error("ASOspy overlay did not appear"));
    const tool = createAsoPlaySearchTool(
      fakeApi({ pluginConfig: { asospyExtensionPath: "/path/to/asospy" } }),
    );
    const res = await tool.execute("id", { keyword: "food" });
    expect(res.content).toHaveLength(1);
    expect((res.content[0] as { type: "text"; text: string }).text).toContain(
      "ASOspy overlay did not appear",
    );
  });
});
