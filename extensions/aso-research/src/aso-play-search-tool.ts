import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";
import { resolveAsospyExtensionPath } from "./asospy-path.js";
import { runAsoPlaySearch } from "./workflow-asospy-search.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_HL = "en";
const DEFAULT_OVERLAY_TIMEOUT_MS = 12_000;

function readKeywordParam(params: Record<string, unknown>): string {
  const candidates = ["keyword", "app_query", "appQuery", "query", "search", "term"];
  for (const key of candidates) {
    const value = params[key];
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

export function createAsoPlaySearchTool(api: OpenClawPluginApi) {
  return {
    name: "aso_play_search",
    description:
      "Search Google Play by keyword using the work search URL; requires ASOspy extension overlay. " +
      "Returns a markdown table of app name, package id, Play URL, daily installs (D/I), and age from the search results page. " +
      "Use `keyword` (preferred); also accepts app_query/query aliases. Configure asospyExtensionPath.",
    parameters: Type.Object({
      keyword: Type.Optional(
        Type.String({
          description: "Search query for Play Store (e.g. 'food', 'fitness'). Preferred key.",
        }),
      ),
      app_query: Type.Optional(
        Type.String({
          description: "Alias for keyword.",
        }),
      ),
      query: Type.Optional(
        Type.String({
          description: "Alias for keyword.",
        }),
      ),
      hl: Type.Optional(
        Type.String({
          description: "Locale for Play Store (e.g. en). Default: en.",
        }),
      ),
      limit: Type.Optional(
        Type.Number({
          description: "Max number of apps to return (default 20, max 50).",
          minimum: 1,
          maximum: MAX_LIMIT,
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const keyword = readKeywordParam(params);
      if (!keyword) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: keyword is required (accepted aliases: app_query, query).",
            },
          ],
        };
      }
      const hl = typeof params.hl === "string" && params.hl.trim() ? params.hl.trim() : DEFAULT_HL;
      const limit =
        typeof params.limit === "number" && params.limit >= 1 && params.limit <= MAX_LIMIT
          ? Math.floor(params.limit)
          : DEFAULT_LIMIT;

      const pluginConfig = api.pluginConfig ?? {};
      const asospyExtensionPath = resolveAsospyExtensionPath({
        configPath:
          typeof pluginConfig.asospyExtensionPath === "string"
            ? pluginConfig.asospyExtensionPath.trim()
            : undefined,
        env: process.env,
      });
      const chromiumExecutablePath =
        typeof pluginConfig.chromiumExecutablePath === "string"
          ? pluginConfig.chromiumExecutablePath.trim()
          : undefined;
      const overlayTimeoutMs =
        typeof pluginConfig.overlayTimeoutMs === "number" && pluginConfig.overlayTimeoutMs > 0
          ? pluginConfig.overlayTimeoutMs
          : DEFAULT_OVERLAY_TIMEOUT_MS;
      const headless =
        typeof pluginConfig.headless === "boolean" ? pluginConfig.headless : true;
      const useWorkSearch =
        typeof pluginConfig.useWorkSearch === "boolean" ? pluginConfig.useWorkSearch : true;

      if (!asospyExtensionPath) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                "Error: ASOspy is required. Set asospyExtensionPath in plugin config, or ASOSPY_EXTENSION_PATH in env, or install the ASOspy extension in Chrome/Chromium (we auto-detect common paths).",
            },
          ],
        };
      }

      try {
        const rows = await runAsoPlaySearch({
          keyword,
          hl,
          limit,
          asospyExtensionPath,
          chromiumExecutablePath: chromiumExecutablePath || undefined,
          overlayTimeoutMs,
          headless,
          useWorkSearch,
        });
        const header = "| # | App name | Package id | Play URL | Daily installs | Age |";
        const sep = "| --- | --- | --- | --- | --- | --- |";
        const body = rows
          .map(
            (r, i) =>
              `| ${i + 1} | ${escapeCell(r.appName)} | ${escapeCell(r.packageId ?? "—")} | ${escapeCell(r.appUrl ?? "—")} | ${escapeCell(r.dailyInstalls ?? "—")} | ${escapeCell(r.age ?? "—")} |`,
          )
          .join("\n");
        const table = `${header}\n${sep}\n${body}`;
        const intro =
          `ASO Play search for **${escapeCell(keyword)}** (locale: ${hl}).\n` +
          "Use `package id` as `sensortower_app_snapshot.app_id` (metadata) and `sensortower_app_sales_downloads.app_id` (sales/downloads) when available.\n\n";
        return {
          content: [{ type: "text" as const, text: intro + table }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${msg}`,
            },
          ],
        };
      }
    },
  };
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
