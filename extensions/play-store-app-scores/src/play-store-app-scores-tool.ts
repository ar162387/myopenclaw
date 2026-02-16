import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../src/plugins/types.js";

const MAX_A = 1_000_000;
const M = 12;
const W = 0.7;

/**
 * X = (A / 1e6) * (0.7 * decay(B) + 0.3), decay(B) = 1 / (1 + B/12).
 * High A + low B prioritized.
 */
function computeScore(
  A: number,
  B: number,
  maxA: number = MAX_A,
  m: number = M,
  w: number = W,
): number {
  const normA = Math.min(1, A / maxA);
  const decay = 1 / (1 + B / m);
  return normA * (w * decay + 1 - w);
}

function getAgeInMonths(released?: string, updatedMs?: number): number {
  const now = Date.now();
  if (typeof released === "string" && released.trim()) {
    const parsed = Date.parse(released.trim());
    if (!Number.isNaN(parsed)) {
      const diffMs = now - parsed;
      return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44));
    }
  }
  if (typeof updatedMs === "number" && Number.isFinite(updatedMs)) {
    const diffMs = now - updatedMs;
    return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44));
  }
  return 0;
}

type GplayApp = {
  title?: string;
  appId?: string;
  minInstalls?: number;
  released?: string;
  updated?: number;
};

function escapeMarkdownCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function createPlayStoreAppScoresTool(_api: OpenClawPluginApi) {
  return {
    name: "play_store_app_scores",
    description:
      "Search Google Play by keyword, compute X score from installs (A) and app age in months (B). " +
      "Formula: X = (A/1e6) * (0.7*decay(B) + 0.3), decay(B)=1/(1+B/12). Returns a ranked markdown table: app name, installs, age (months), score.",
    parameters: Type.Object({
      keyword: Type.String({
        description: "Search query for Google Play (e.g. 'fitness', 'notes').",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Max number of apps to fetch and score (default 20, max 250).",
          minimum: 1,
          maximum: 250,
        }),
      ),
      country: Type.Optional(
        Type.String({
          description: "Two-letter country code for Play Store (e.g. us, gb).",
        }),
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      const keyword = typeof params.keyword === "string" ? params.keyword.trim() : "";
      if (!keyword) {
        return {
          content: [{ type: "text" as const, text: "Error: keyword is required." }],
        };
      }

      const limit =
        typeof params.limit === "number" && params.limit >= 1 && params.limit <= 250
          ? Math.floor(params.limit)
          : 20;
      const country = typeof params.country === "string" ? params.country.trim() || "us" : "us";

      type GplayModule = {
        default?: {
          search: (opts: {
            term: string;
            country: string;
            num: number;
            fullDetail: true;
          }) => Promise<GplayApp[]>;
        };
        search?: (opts: {
          term: string;
          country: string;
          num: number;
          fullDetail: true;
        }) => Promise<GplayApp[]>;
      };
      let gplay: GplayModule;
      try {
        gplay = await import("google-play-scraper");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            { type: "text" as const, text: `Error: could not load google-play-scraper: ${msg}` },
          ],
        };
      }

      // ESM: default export is at .default; some runtimes expose it at top level.
      const searchFn = (gplay.default?.search ?? gplay.search) as
        | ((opts: {
            term: string;
            country: string;
            num: number;
            fullDetail: true;
          }) => Promise<GplayApp[]>)
        | undefined;
      if (typeof searchFn !== "function") {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: google-play-scraper did not expose search. Check package version and ESM usage.",
            },
          ],
        };
      }

      let apps: GplayApp[];
      try {
        apps = await searchFn({
          term: keyword,
          country,
          num: limit,
          fullDetail: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: Play Store search failed: ${msg}` }],
        };
      }

      if (!Array.isArray(apps) || apps.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No apps found for keyword "${keyword}" in country ${country}.`,
            },
          ],
        };
      }

      const rows: Array<{ name: string; installs: number; ageMonths: number; score: number }> = [];

      for (const app of apps) {
        const name = typeof app.title === "string" ? app.title : (app.appId ?? "Unknown");
        const A = typeof app.minInstalls === "number" && app.minInstalls >= 0 ? app.minInstalls : 0;
        const ageMonths = getAgeInMonths(app.released, app.updated);
        const score = computeScore(A, ageMonths);
        rows.push({
          name: escapeMarkdownCell(name),
          installs: A,
          ageMonths: Math.round(ageMonths * 10) / 10,
          score: Math.round(score * 1e6) / 1e6,
        });
      }

      rows.sort((a, b) => b.score - a.score);

      const header = "| Rank | App | Installs | Age (months) | Score |";
      const sep = "|------|-----|----------|--------------|-------|";
      const body = rows
        .map(
          (r, i) =>
            `| ${i + 1} | ${r.name} | ${r.installs.toLocaleString()} | ${r.ageMonths} | ${r.score} |`,
        )
        .join("\n");

      const table = `${header}\n${sep}\n${body}`;
      const intro = `Play Store app scores for **${escapeMarkdownCell(keyword)}** (country: ${country}), sorted by X score (high installs + low age favored).\n\n`;
      return {
        content: [{ type: "text" as const, text: intro + table }],
      };
    },
  };
}
