import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSensorTowerAppSalesDownloadsTool,
  createSensorTowerAppSnapshotTool,
} from "./sensortower-app-snapshot-tool.js";

function toRequestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }
  if (typeof input === "string") {
    return new URL(input);
  }
  return new URL(input.url);
}

function fakeApi(overrides: Partial<OpenClawPluginApi> = {}): OpenClawPluginApi {
  return {
    id: "sensortower-aso",
    name: "sensortower-aso",
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

describe("sensortower tools", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("snapshot returns retry hint when no app identifier is provided", async () => {
    const tool = createSensorTowerAppSnapshotTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
        },
      }),
    );
    const res = await tool.execute("id", {});
    const details = res.details as {
      ok: boolean;
      error: string;
      acceptedKeys: string[];
    };
    expect(details.ok).toBe(false);
    expect(details.error).toContain("Missing app identifier");
    expect(details.acceptedKeys).toContain("metadata_os");
  });

  it("snapshot returns metadata only and never calls sales endpoint", async () => {
    const unifiedId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(JSON.stringify([{ $id: unifiedId, name: "Demo App" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === "/v1/unified/apps") {
        return new Response(JSON.stringify([{ app_id: unifiedId, itunes_id: "284882215" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === "/v1/ios/apps") {
        return new Response(
          JSON.stringify([
            {
              app_id: "284882215",
              name: "Demo App",
              subtitle: "Quick subtitle",
              description: "Long description body",
              languages: ["en", "ja"],
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname.includes("sales_report_estimates")) {
        return new Response("sales should not be called", { status: 500 });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const tool = createSensorTowerAppSnapshotTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
        },
      }),
    );
    const res = await tool.execute("id", { app_query: "demo app" });
    const details = res.details as {
      unifiedAppId: string;
      appName: string;
      metadata: {
        subtitleOrShortDescription: string;
        longDescription: string;
        languages: string[];
      };
      sources: {
        detailsEndpoint: string;
      };
      metrics?: unknown;
    };

    expect(details.unifiedAppId).toBe(unifiedId);
    expect(details.appName).toBe("Demo App");
    expect(details.metadata.subtitleOrShortDescription).toBe("Quick subtitle");
    expect(details.metadata.longDescription).toBe("Long description body");
    expect(details.metadata.languages).toEqual(["en", "ja"]);
    expect(details.sources.detailsEndpoint).toContain("/v1/{os}/apps");
    expect(details.metrics).toBeUndefined();

    const calledPaths = fetchMock.mock.calls.map((call) => toRequestUrl(call[0] as RequestInfo).pathname);
    expect(calledPaths.some((path) => path.includes("sales_report_estimates"))).toBe(false);
  });

  it("snapshot returns ranked candidates when return_candidates is true", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(
          JSON.stringify([
            { $id: "111111111111111111111111", name: "Kai Ride" },
            { $id: "222222222222222222222222", name: "AiRide" },
            { $id: "333333333333333333333333", name: "Ai Ride Driver" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("unexpected endpoint", { status: 500 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);
    const tool = createSensorTowerAppSnapshotTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
        },
      }),
    );

    const res = await tool.execute("id", {
      app_query: "AiRide",
      return_candidates: true,
      candidates_limit: 2,
    });
    const details = res.details as {
      mode: string;
      candidates: Array<{ rank: number; unifiedAppId: string; name: string | null; score: number }>;
    };

    expect(details.mode).toBe("candidates");
    expect(details.candidates).toHaveLength(2);
    expect(details.candidates[0]?.name).toBe("AiRide");
    expect(details.candidates[0]?.rank).toBe(1);
    const calledPaths = fetchMock.mock.calls.map((call) => toRequestUrl(call[0] as RequestInfo).pathname);
    expect(calledPaths).toEqual(["/v1/unified/search_entities"]);
  });

  it("snapshot rejects weak query matches", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(JSON.stringify([{ $id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Kai Ride" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const tool = createSensorTowerAppSnapshotTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
        },
      }),
    );
    const res = await tool.execute("id", { app_query: "AiRide" });
    const details = res.details as { ok: boolean; error: string };
    expect(details.ok).toBe(false);
    expect(details.error).toContain("No confident Sensor Tower app match");
  });

  it("sales tool parses compact keys and returns month estimates", async () => {
    const appId = "com.ubercab.eats";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/android/sales_report_estimates") {
        const countries = url.searchParams.get("countries");
        if (countries === "WW") {
          return new Response(
            JSON.stringify([{ aid: appId, c: "WW", d: "2026-01-01T00:00:00Z", u: 1578502, r: 1234 }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify([
            { aid: appId, c: "US", d: "2026-01-01T00:00:00Z", u: 1000, r: 500 },
            { aid: appId, c: "CA", d: "2026-01-01T00:00:00Z", u: 800, r: 300 },
            { aid: appId, c: "WW", d: "2026-01-01T00:00:00Z", u: 1800, r: 900 },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const tool = createSensorTowerAppSalesDownloadsTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
          defaultCountry: "WW",
        },
      }),
    );
    const res = await tool.execute("id", { app_id: appId, month: "2026-01" });
    const details = res.details as {
      appOs: string;
      metrics: {
        worldwide: { downloadsEstimate: number | null; revenueEstimate: number | null };
        lastMonth: {
          downloadsEstimate: number | null;
          revenueEstimate: number | null;
          topCountriesByDownloads: Array<{ country: string; downloadsEstimate: number | null }>;
        };
      };
    };

    expect(details.appOs).toBe("android");
    expect(details.metrics.worldwide.downloadsEstimate).toBe(1578502);
    expect(details.metrics.worldwide.revenueEstimate).toBe(1234);
    expect(details.metrics.lastMonth.downloadsEstimate).toBe(1800);
    expect(details.metrics.lastMonth.revenueEstimate).toBe(800);
    expect(details.metrics.lastMonth.topCountriesByDownloads).toEqual([
      { country: "US", downloadsEstimate: 1000, revenueEstimate: 500 },
      { country: "CA", downloadsEstimate: 800, revenueEstimate: 300 },
    ]);
  });

  it("sales tool resolves unified id to requested sales_os without details calls", async () => {
    const unifiedId = "cccccccccccccccccccccccc";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(JSON.stringify([{ $id: unifiedId, name: "Demo App" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === "/v1/unified/apps") {
        return new Response(
          JSON.stringify([{ app_id: unifiedId, android_apps: [{ app_id: "com.demo.app" }] }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/v1/android/sales_report_estimates") {
        return new Response(JSON.stringify([{ c: "WW", u: 12, r: 0 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname.endsWith("/apps")) {
        return new Response("details endpoint should not be called", { status: 500 });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const tool = createSensorTowerAppSalesDownloadsTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
        },
      }),
    );
    const res = await tool.execute("id", {
      app_query: "demo app",
      month: "2026-01",
      sales_os: "android",
    });
    const details = res.details as { appId: string; appOs: string };
    expect(details.appId).toBe("com.demo.app");
    expect(details.appOs).toBe("android");
  });

  it("sales tool returns ranked candidates when return_candidates is true", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = toRequestUrl(input);
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(
          JSON.stringify([
            { $id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "FaceApp: Perfect Face Editor" },
            { $id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Face Lab Editor" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("unexpected endpoint", { status: 500 });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);
    const tool = createSensorTowerAppSalesDownloadsTool(
      fakeApi({
        pluginConfig: {
          authToken: "token",
          requestsPerMinute: 60,
        },
      }),
    );

    const res = await tool.execute("id", {
      query: "faceapp",
      return_candidates: true,
      candidates_limit: 5,
    });
    const details = res.details as {
      mode: string;
      candidates: Array<{ rank: number; unifiedAppId: string; name: string | null; score: number }>;
    };

    expect(details.mode).toBe("candidates");
    expect(details.candidates.length).toBe(2);
    expect(details.candidates[0]?.name).toBe("FaceApp: Perfect Face Editor");
    const calledPaths = fetchMock.mock.calls.map((call) => toRequestUrl(call[0] as RequestInfo).pathname);
    expect(calledPaths).toEqual(["/v1/unified/search_entities"]);
  });
});
