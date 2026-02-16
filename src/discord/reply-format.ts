import type { ReplyDispatchKind } from "../auto-reply/reply/reply-dispatcher.js";
import type { MarkdownTableMode } from "../config/types.base.js";
import { convertMarkdownTables } from "../markdown/tables.js";

const MAX_JSON_PRETTY_CHARS = 120_000;

function maybePrettifyToolJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("```")) {
    return null;
  }
  const startsLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!startsLikeJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const pretty = JSON.stringify(parsed, null, 2);
    if (!pretty || pretty.length > MAX_JSON_PRETTY_CHARS) {
      return null;
    }
    return `\`\`\`json\n${pretty}\n\`\`\``;
  } catch {
    return null;
  }
}

export function formatDiscordReplyText(params: {
  text: string;
  kind?: ReplyDispatchKind;
  tableMode?: MarkdownTableMode;
}): string {
  const tableMode = params.tableMode ?? "code";
  const effectiveTableMode =
    params.kind === "tool" && tableMode === "off" ? "code" : tableMode;
  const withTables = convertMarkdownTables(params.text, effectiveTableMode);
  if (params.kind !== "tool") {
    return withTables;
  }
  const prettyJson = maybePrettifyToolJson(withTables);
  return prettyJson ?? withTables;
}

