import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSensorTowerAppSnapshotTool } from "./sensortower-app-snapshot-tool.js";

function fakeApi(overrides: Partial<OpenClawPluginApi> = {}): OpenClawPluginApi {
  return {
    id: "sensortower-aso",
    name: "sensortower-aso",
    source: "test",
    config: {},
    pluginConfig: {},
    // oxlint-disable-next-line typescript/no-explicit-any
    runtime: { version: "test" } as any,
    logger: { info() { }, warn() { }, error() { }, debug() { } },
    registerTool() { },
    registerHttpHandler() { },
    registerChannel() { },
    registerGatewayMethod() { },
    registerCli() { },
    registerService() { },
    registerProvider() { },
    registerHook() { },
    registerHttpRoute() { },
    registerCommand() { },
    on() { },
    resolvePath: (p) => p,
    ...overrides,
  };
}

describe("sensortower_app_snapshot tool", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns a structured retry hint when no app identifier is provided", async () => {
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
      retryHint: string;
      acceptedKeys: string[];
    };
    expect(details.ok).toBe(false);
    expect(details.error).toContain("Missing app identifier");
    expect(details.retryHint).toContain('"app_query":"AiRide"');
    expect(details.acceptedKeys).toContain("query");
  });

  it("returns an error when auth token is missing", async () => {
    vi.stubEnv("SENSORTOWER_AUTH_TOKEN", "");
    vi.stubEnv("SENSOR_TOWER_AUTH_TOKEN", "");
    const tool = createSensorTowerAppSnapshotTool(fakeApi());
    const res = await tool.execute("id", { app_query: "my app" });
    expect((res.details as { ok: boolean }).ok).toBe(false);
    expect((res.details as { error: string }).error).toContain("auth token missing");
  });

  it("returns a combined snapshot payload", async () => {
    const unifiedId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(
          JSON.stringify([
            {
              $id: unifiedId,
              name: "Demo App",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      // Step 1: resolveUnifiedAppIds – returns platform-specific IDs
      if (url.pathname === "/v1/unified/apps") {
        expect(url.searchParams.get("app_id_type")).toBe("unified");
        return new Response(
          JSON.stringify([
            {
              app_id: unifiedId,
              itunes_id: "284882215",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      // Step 2: getAppDetails – returns rich metadata from platform endpoint
      if (url.pathname === "/v1/ios/apps") {
        return new Response(
          JSON.stringify([
            {
              app_id: "284882215",
              name: "Demo App",
              subtitle: "Quick subtitle",
              description: "Long description body",
              release_date: "2020-01-15",
              languages: ["en", "ja"],
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }


      if (url.pathname === "/v1/unified/sales_report_estimates") {
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const countries = url.searchParams.get("countries");
        if (startDate === "2020-01-15" && endDate && countries === "WW") {
          return new Response(
            JSON.stringify([
              { date: "2020-01-01", country: "WW", unified_units: 100, unified_revenue: 250 },
              { date: "2026-01-01", country: "WW", unified_units: 50, unified_revenue: 180 },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (startDate === "2026-01-01" && endDate === "2026-01-31" && countries === null) {
          return new Response(
            JSON.stringify([
              { date: "2026-01-01", country: "US", unified_units: 70, unified_revenue: 210 },
              { date: "2026-01-01", country: "JP", unified_units: 40, unified_revenue: 120 },
              { date: "2026-01-01", country: "GB", unified_units: 20, unified_revenue: 50 },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
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

    const res = await tool.execute("id", {
      app_query: "demo app",
      month: "2026-01",
    });

    const details = res.details as {
      unifiedAppId: string;
      appName: string;
      metadata: {
        subtitleOrShortDescription: string;
        longDescription: string;
        languages: string[];
      };
      metrics: {
        overall: { revenueWwEstimate: number; downloadsWwEstimate: number; rdpWwEstimate: number };
        lastMonth: {
          downloadsEstimate: number;
          topCountriesByDownloads: Array<{ country: string; downloadsEstimate: number }>;
        };
      };
    };

    expect(details.unifiedAppId).toBe(unifiedId);
    expect(details.appName).toBe("Demo App");
    expect(details.metadata.subtitleOrShortDescription).toBe("Quick subtitle");
    expect(details.metadata.longDescription).toBe("Long description body");
    expect(details.metadata.languages).toEqual(["en", "ja"]);
    expect(details.metrics.overall.revenueWwEstimate).toBe(430);
    expect(details.metrics.overall.downloadsWwEstimate).toBe(150);
    expect(details.metrics.overall.rdpWwEstimate).toBeCloseTo(430 / 150, 6);
    expect(details.metrics.lastMonth.downloadsEstimate).toBe(130);
    expect(details.metrics.lastMonth.topCountriesByDownloads.map((entry) => entry.country)).toEqual(
      ["US", "JP", "GB"],
    );
    expect(fetchMock).toHaveBeenCalled();
  });

  it("supports ios app_id and defaults auth to query mode", async () => {
    const iosAppId = "284882215";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const authHeader = new Headers(init?.headers).get("authorization");
      expect(authHeader).toBeNull();
      expect(url.searchParams.get("auth_token")).toBe("token");

      if (url.pathname === "/v1/ios/apps") {
        expect(url.searchParams.get("country")).toBe("US");
        return new Response(
          JSON.stringify([
            {
              app_id: iosAppId,
              name: "iOS Demo App",
              subtitle: "iOS subtitle",
              description: "iOS description",
              release_date: "2021-01-01",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.pathname === "/v1/ios/sales_report_estimates") {
        const appId = url.searchParams.get("app_ids");
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const countries = url.searchParams.get("countries");
        if (appId === iosAppId && startDate === "2021-01-01" && endDate && countries === "WW") {
          return new Response(
            JSON.stringify([{ date: "2026-01-01", country: "WW", units: 300, revenue: 900 }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (appId === iosAppId && startDate === "2026-01-01" && endDate === "2026-01-31") {
          return new Response(
            JSON.stringify([
              { date: "2026-01-01", country: "US", units: 100, revenue: 400 },
              { date: "2026-01-01", country: "JP", units: 80, revenue: 200 },
            ]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
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

    const res = await tool.execute("id", {
      app_id: iosAppId,
      month: "2026-01",
    });

    const details = res.details as {
      appId: string;
      appOs: string;
      appName: string;
      metrics: {
        overall: { revenueWwEstimate: number; downloadsWwEstimate: number; rdpWwEstimate: number };
      };
    };

    expect(details.appId).toBe(iosAppId);
    expect(details.appOs).toBe("ios");
    expect(details.appName).toBe("iOS Demo App");
    expect(details.metrics.overall.revenueWwEstimate).toBe(900);
    expect(details.metrics.overall.downloadsWwEstimate).toBe(300);
    expect(details.metrics.overall.rdpWwEstimate).toBe(3);
  });

  it("accepts alias/nested query fields", async () => {
    const unifiedId = "bbbbbbbbbbbbbbbbbbbbbbbb";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(JSON.stringify([{ $id: unifiedId, name: "AiRide" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.pathname === "/v1/unified/apps") {
        return new Response(
          JSON.stringify([{ app_id: unifiedId, itunes_id: "999999999" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/v1/ios/apps") {
        return new Response(
          JSON.stringify([{ app_id: "999999999", name: "AiRide", release_date: "2024-01-01" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.pathname === "/v1/unified/sales_report_estimates") {
        return new Response(
          JSON.stringify([
            { date: "2026-01-01", country: "WW", unified_units: 10, unified_revenue: 30 },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
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

    const res = await tool.execute("id", {
      input: {
        query: "AiRide",
      },
      month: "2026-01",
    });
    const details = res.details as { appName: string };
    expect(details.appName).toBe("AiRide");
  });

  it("picks the best lexical match instead of the first search hit", async () => {
    const kaiId = "111111111111111111111111";
    const aiRideId = "222222222222222222222222";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(
          JSON.stringify([
            { $id: kaiId, name: "Kai Ride" },
            { $id: aiRideId, name: "AiRide" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/v1/unified/apps") {
        const appIds = url.searchParams.get("app_ids");
        if (appIds === aiRideId) {
          return new Response(
            JSON.stringify([{ app_id: aiRideId, itunes_id: "999999999" }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }
      if (url.pathname === "/v1/ios/apps") {
        return new Response(
          JSON.stringify([{ app_id: "999999999", name: "AiRide", release_date: "2024-01-01" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/v1/unified/sales_report_estimates") {
        return new Response(
          JSON.stringify([{ date: "2026-01-01", country: "WW", unified_units: 10, unified_revenue: 0 }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
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
    const res = await tool.execute("id", { app_query: "AiRide", month: "2026-01" });
    const details = res.details as { appName: string };
    expect(details.appName).toBe("AiRide");
  });

  it("rejects weak app_query matches to avoid wrong-app snapshots", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response(JSON.stringify([{ $id: "333333333333333333333333", name: "Kai Ride" }]), {
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
    const res = await tool.execute("id", { app_query: "AiRide", month: "2026-01" });
    const details = res.details as { ok: boolean; error: string };
    expect(details.ok).toBe(false);
    expect(details.error).toContain("No confident Sensor Tower app match");
  });

  it("treats package-like app_query as app_id", async () => {
    const packageId = "com.aimarket.ai_ride";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/unified/search_entities") {
        return new Response("should not search", { status: 500 });
      }
      if (url.pathname === "/v1/android/apps") {
        expect(url.searchParams.get("app_ids")).toBe(packageId);
        return new Response(
          JSON.stringify([{ app_id: packageId, name: "AiRide", release_date: "2024-01-01" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname === "/v1/android/sales_report_estimates") {
        return new Response(
          JSON.stringify([{ date: "2026-01-01", country: "WW", units: 5, revenue: 0 }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
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
    const res = await tool.execute("id", { app_query: packageId, month: "2026-01" });
    const details = res.details as { appId: string; appName: string };
    expect(details.appId).toBe(packageId);
    expect(details.appName).toBe("AiRide");
    const calledPaths = fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname);
    expect(calledPaths).not.toContain("/v1/unified/search_entities");
  });
});
