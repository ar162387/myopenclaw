import { describe, expect, it } from "vitest";
import { convertMarkdownTables } from "../markdown/tables.js";
import { formatDiscordReplyText } from "./reply-format.js";

describe("formatDiscordReplyText", () => {
  it("pretty-prints tool JSON output as a json code block", () => {
    const inputData = {
      appName: "FaceApp",
      metrics: {
        downloadsEstimate: 1234,
        revenueEstimate: 5678,
      },
    };
    const input = JSON.stringify(inputData);

    const formatted = formatDiscordReplyText({
      text: input,
      kind: "tool",
      tableMode: "code",
    });

    expect(formatted).toBe(`\`\`\`json\n${JSON.stringify(inputData, null, 2)}\n\`\`\``);
  });

  it("does not pretty-print JSON for non-tool replies", () => {
    const input = '{"appName":"FaceApp","downloadsEstimate":1234}';
    const formatted = formatDiscordReplyText({
      text: input,
      kind: "final",
      tableMode: "code",
    });

    expect(formatted).toBe(input);
  });

  it("keeps tool tables readable when markdown tables are configured off", () => {
    const table = ["| App | Daily installs |", "| --- | --- |", "| FaceApp | 1.2k |"].join("\n");

    const toolFormatted = formatDiscordReplyText({
      text: table,
      kind: "tool",
      tableMode: "off",
    });
    const finalFormatted = formatDiscordReplyText({
      text: table,
      kind: "final",
      tableMode: "off",
    });

    expect(toolFormatted).toBe(convertMarkdownTables(table, "code"));
    expect(finalFormatted).toBe(table);
  });
});
