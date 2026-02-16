import { describe, expect, it, vi } from "vitest";
import { subscribeEmbeddedPiSession } from "./pi-embedded-subscribe.js";

type StubSession = {
  subscribe: (fn: (evt: unknown) => void) => () => void;
};

describe("subscribeEmbeddedPiSession", () => {
  it("formats JSON tool output as a json code block in markdown mode", async () => {
    let handler: ((evt: unknown) => void) | undefined;
    const session: StubSession = {
      subscribe: (fn) => {
        handler = fn;
        return () => {};
      },
    };
    const onToolResult = vi.fn();

    subscribeEmbeddedPiSession({
      session: session as unknown as Parameters<typeof subscribeEmbeddedPiSession>[0]["session"],
      runId: "run-json-tool-output",
      verboseLevel: "full",
      onToolResult,
    });

    handler?.({
      type: "tool_execution_start",
      toolName: "web_fetch",
      toolCallId: "tool-web-fetch-1",
      args: { url: "https://example.com" },
    });
    handler?.({
      type: "tool_execution_end",
      toolName: "web_fetch",
      toolCallId: "tool-web-fetch-1",
      isError: false,
      result: { content: [{ type: "text", text: '{"name":"FaceApp","downloads":1234}' }] },
    });

    await Promise.resolve();

    expect(onToolResult).toHaveBeenCalledTimes(2);
    const output = onToolResult.mock.calls[1][0];
    expect(output.text).toContain("```json");
    expect(output.text).toContain('"name": "FaceApp"');
    expect(output.text).toContain('"downloads": 1234');
  });
});
