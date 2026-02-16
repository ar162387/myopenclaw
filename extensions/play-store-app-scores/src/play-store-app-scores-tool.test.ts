import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";
import { createPlayStoreAppScoresTool } from "./play-store-app-scores-tool.js";

vi.mock("google-play-scraper", () => ({
  default: {
    search: vi.fn(),
  },
}));

import gplay from "google-play-scraper";

const mockSearch = gplay.search as ReturnType<typeof vi.fn>;

function fakeApi(overrides: Partial<OpenClawPluginApi> = {}): OpenClawPluginApi {
  return {
    id: "play-store-app-scores",
    name: "play-store-app-scores",
    source: "test",
    config: {},
    pluginConfig: {},
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

describe("play_store_app_scores tool", () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it("returns error when keyword is missing", async () => {
    const tool = createPlayStoreAppScoresTool(fakeApi());
    const res = await tool.execute("id", { keyword: "   " });
    expect(res.content).toHaveLength(1);
    expect(res.content[0]).toMatchObject({ type: "text" });
    expect((res.content[0] as { type: "text"; text: string }).text).toContain(
      "keyword is required",
    );
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("returns error when search fails", async () => {
    mockSearch.mockRejectedValueOnce(new Error("Network error"));
    const tool = createPlayStoreAppScoresTool(fakeApi());
    const res = await tool.execute("id", { keyword: "fitness" });
    expect(res.content).toHaveLength(1);
    expect((res.content[0] as { type: "text"; text: string }).text).toContain(
      "Play Store search failed",
    );
  });

  it("returns message when no apps found", async () => {
    mockSearch.mockResolvedValueOnce([]);
    const tool = createPlayStoreAppScoresTool(fakeApi());
    const res = await tool.execute("id", { keyword: "xyznonexistent" });
    expect(res.content).toHaveLength(1);
    expect((res.content[0] as { type: "text"; text: string }).text).toContain("No apps found");
  });

  it("returns ranked markdown table with score formula applied", async () => {
    const oldDate = Date.now() - 6 * 30.44 * 24 * 60 * 60 * 1000; // ~6 months ago
    const newDate = Date.now() - 1 * 30.44 * 24 * 60 * 60 * 1000; // ~1 month ago
    mockSearch.mockResolvedValueOnce([
      {
        title: "App Low",
        appId: "com.low",
        minInstalls: 10_000,
        released: undefined,
        updated: oldDate,
      },
      {
        title: "App High",
        appId: "com.high",
        minInstalls: 500_000,
        released: undefined,
        updated: newDate,
      },
    ]);
    const tool = createPlayStoreAppScoresTool(fakeApi());
    const res = await tool.execute("id", { keyword: "fitness", limit: 10, country: "us" });
    expect(mockSearch).toHaveBeenCalledWith({
      term: "fitness",
      country: "us",
      num: 10,
      fullDetail: true,
    });
    expect(res.content).toHaveLength(1);
    const text = (res.content[0] as { type: "text"; text: string }).text;
    expect(text).toContain("Rank");
    expect(text).toContain("App");
    expect(text).toContain("Installs");
    expect(text).toContain("Age (months)");
    expect(text).toContain("Score");
    expect(text).toContain("App High");
    expect(text).toContain("App Low");
    // Higher installs + lower age => higher score => App High should appear before App Low in table
    const rankHigh = text.indexOf("App High");
    const rankLow = text.indexOf("App Low");
    expect(rankHigh).toBeLessThan(rankLow);
  });

  it("uses default limit and country when omitted", async () => {
    mockSearch.mockResolvedValueOnce([
      {
        title: "One",
        appId: "com.one",
        minInstalls: 1000,
        released: undefined,
        updated: Date.now(),
      },
    ]);
    const tool = createPlayStoreAppScoresTool(fakeApi());
    await tool.execute("id", { keyword: "notes" });
    expect(mockSearch).toHaveBeenCalledWith({
      term: "notes",
      country: "us",
      num: 20,
      fullDetail: true,
    });
  });
});
