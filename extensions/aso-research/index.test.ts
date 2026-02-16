import { describe, expect, it } from "vitest";
import type { OpenClawPluginApi, PluginHookBeforeAgentStartEvent } from "../../src/plugins/types.js";
import register from "./index.js";

type BeforeAgentStartHandler = (
  event: PluginHookBeforeAgentStartEvent,
) => Promise<{ prependContext?: string } | undefined>;

function createApi() {
  let beforeAgentStart: BeforeAgentStartHandler | undefined;
  const api: OpenClawPluginApi = {
    id: "aso-research",
    name: "aso-research",
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
    resolvePath: (p) => p,
    on(eventName, handler) {
      if (eventName === "before_agent_start") {
        beforeAgentStart = handler as BeforeAgentStartHandler;
      }
    },
  };
  return { api, getBeforeAgentStart: () => beforeAgentStart };
}

describe("aso-research plugin guardrails", () => {
  it("injects ASO workflow guardrails for ASO prompts", async () => {
    const { api, getBeforeAgentStart } = createApi();
    register(api);
    const hook = getBeforeAgentStart();
    expect(hook).toBeTypeOf("function");

    const result = await hook?.({
      prompt:
        "Please do ASO for my app URL: https://play.google.com/store/apps/details?id=com.aimarket.ai_ride",
      messages: [],
    });

    expect(result?.prependContext).toContain("<aso_workflow_guardrails>");
    expect(result?.prependContext).toContain(
      "Run aso_play_search for each keyword set (minimum 3 searches).",
    );
    expect(result?.prependContext).toContain("- NEVER use package IDs.");
    expect(result?.prependContext).toContain("Call sensortower_app_snapshot ONCE per competitor.");
    expect(result?.prependContext).toContain("- package id → app_id");
  });

  it("does not inject guardrails for non-ASO prompts", async () => {
    const { api, getBeforeAgentStart } = createApi();
    register(api);
    const hook = getBeforeAgentStart();
    const result = await hook?.({ prompt: "What time is it?", messages: [] });
    expect(result).toBeUndefined();
  });
});
