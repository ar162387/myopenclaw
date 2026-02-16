import type { OpenClawPluginApi } from "../../src/plugins/types.js";
import { createAsoPlaySearchTool } from "./src/aso-play-search-tool.js";

function isAsoPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  return (
    normalized.includes("aso") ||
    normalized.includes("app store optimization") ||
    normalized.includes("play.google.com/store/apps/details") ||
    normalized.includes("short description") ||
    normalized.includes("long description")
  );
}

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createAsoPlaySearchTool(api), { optional: true });

  // Inject deterministic ASO workflow guardrails for ASO-style prompts.
  api.on("before_agent_start", async (event) => {
    const prompt = typeof event.prompt === "string" ? event.prompt.trim() : "";
    if (!prompt || !isAsoPrompt(prompt)) {
      return;
    }
    return {
      prependContext: [
        "<aso_workflow_guardrails>,",
"Follow this workflow for ASO requests unless the user explicitly asks for a shorter or different flow.,",
"GENERAL RULES,",
"- Never invent competitors, metrics, or metadata.,",
"- If tool data is missing, say it is unavailable.,",
"- Prefer tool data over prior knowledge.,",
"- Complete steps in order. Do not skip.,",
"STEP 1 — CONTEXT ACQUISITION,",
"If an app store URL is provided:,",
"→ call web_fetch and extract title, subtitle, description, category.,",
"If extraction fails:,",
"→ fall back to user-provided description.,",
"If neither exists:,",
"→ ask the user for a description and STOP.,",
"STEP 2 — KEYWORD CONSTRUCTION,",
"- Build natural-language search phrases from category, use cases, and user value.,",
"- NEVER use package IDs.,",
"- If the app name conflicts with the description, ignore the name.,",
"- Produce at least 3 DISTINCT keyword sets.,",
"STEP 3 — SEARCH,",
"Run aso_play_search for each keyword set (minimum 3 searches).,",
"If results are poor (<3 relevant):,",
"→ refine keywords once and retry.,",
"STEP 4 — COMPETITOR FILTERING,",
"From combined results:,",
"Before comparing installs, first ensure the apps compete in the same user intent.,",
"Use ONLY available metadata,",
"Remove apps whose names clearly indicate a different product type.,",
"(e.g., games, POS/merchant software, inventory tools, education, unrelated social networking).,",
"After removing irrelevant apps, apply growth logic.,",
"Ranking priority among relevant apps:,",
"1) Higher daily installs,",
"2) Newer release age,",
"3) Rating count (if available),",
"Select 3-5 apps.,",
"If fewer than 3 remain:,",
"→ report limited market visibility but continue.,",
"STEP 5 — ENRICHMENT,",
"Call sensortower_app_snapshot ONCE per competitor for metadata.,",
"Use:,",
"- package id → app_id,",
"- missing → app_query,",
"If a call fails:,",
"→ mark competitor as partial but continue.,",
"Call sensortower_app_sales_downloads only if the user explicitly asks for sales/revenue/download estimates.,",
"STEP 6 — SUFFICIENCY CHECK,",
"Do not generate ASO copy until at least 2 valid metadata snapshots are available,,",
"unless ALL calls failed.,",
"STEP 7 — OUTPUT FORMAT (MANDATORY),",
"METRIC ATTRIBUTION RULE,",
"- Daily installs come from aso_play_search (ASOspy).,",
"- Sensor Tower metadata comes from sensortower_app_snapshot.,",
"- Sensor Tower sales/download estimates come from sensortower_app_sales_downloads.,",
"- Never claim Sensor Tower provides daily installs.,",
"Final answer must include:,",
"1. Keywords used for each search,",
"2. Full competitor list with:,",
"   - name,",
"   - package id,",
"   - installs,",
"   - age,",
"   - any missing fields marked,",
"3. Generated:,",
"   - App Name,",
"   - Short Description,",
"   - Long Description,",
"STEP 8 — TRACEABILITY,",
"Every competitor must be traceable to an aso_play_search result.,",
"No external additions.,",
"</aso_workflow_guardrails>,",

      ].join("\n"),
    };
  });
}
