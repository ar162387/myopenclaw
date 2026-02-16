---
name: aso-research
description: Use for end-to-end ASO generation and optimization when users provide an app URL or app details. Orchestrate web_fetch, aso_play_search, and sensortower_app_snapshot while keeping tools independently callable.
---

# ASO Research Workflow

Use this skill when the user asks for:

- ASO generation or rewrite (app name, short description, long description)
- Play Store keyword and competitor research
- Discovery of high-download apps (new and mature) for a category
- Trend extraction from competitor metadata

## Default workflow

1. Ingest app context first.
- If user provided an app URL, call `web_fetch` and extract app name, brand, category, core value proposition, and current positioning language.
- If user did not provide a URL, use user-provided app details/description.
- If both are missing, ask for minimum required context before continuing.

2. Build seed search terms.
- Derive 3-8 seed keywords from category, problem solved, feature language, and likely user intent.
- Include brand-based seed terms only if brand relevance is clear.

3. Run Play Store competitor discovery with `aso_play_search`.
- Call `aso_play_search` once or multiple times using seed keywords.
- Continue until there is enough signal to pick competitors (usually 3-5 apps).
- Minimum: run at least 3 distinct keyword searches for ASO generation tasks.
- Never use raw package ids (for example `com.company.app`) as `aso_play_search` keywords.
- Prioritize a mix of:
  - Mature apps with strong installs (older + high D/I).
  - Newer apps with strong installs (high D/I despite low age).

4. Select top competitors.
- Pick 3-5 apps based on relevance + install momentum + age profile.
- Avoid duplicates and obvious out-of-category matches.
- Keep each selected app's package id and Play URL from `aso_play_search` output.

5. Enrich each selected competitor with `sensortower_app_snapshot`.
- Call `sensortower_app_snapshot` once per selected app.
- Prefer exact lookup via `app_id` using package id from `aso_play_search`.
- Use `app_query` only when package id is unavailable.
- Collect app name, subtitle/short description, long description, and monthly download context.
- Do not finalize ASO copy before calling Sensor Tower for each selected competitor unless the tool is unavailable/failing.

6. Extract keyword patterns.
- Find recurring high-intent terms across competitor names and descriptions.
- Keep only terms relevant to the target app's actual positioning.
- Balance high-volume broad terms with specific long-tail terms.

7. Generate final ASO output.
- Provide:
  - 1 recommended app name + 2 alternatives.
  - 1 recommended short description + 2 alternatives.
  - 1 recommended long description.
- Include concise rationale tied to discovered competitor patterns.

## Output format

- Input summary: source URL/details used.
- Competitor snapshot table: app, D/I, age.
- Sensor Tower highlights by selected app.
- Keyword clusters: core, secondary, long-tail.
- Final ASO copy:
  - Recommended app name + alternatives.
  - Recommended short description + alternatives.
  - Recommended long description.
- Confidence notes: missing/failed tool calls and any gaps.
- Metric attribution:
  - Daily installs (D/I) are from `aso_play_search` (ASOspy overlay).
  - Sensor Tower provides aggregate estimates (overall/last month downloads, revenue, RDP, top countries) plus metadata.

## Tool behavior rules

- Keep tools independently callable:
  - If user asks for a single-tool result, do not force the full workflow.
  - Use the full workflow by default for ASO generation and optimization requests.
- If any tool fails, continue with available data and explicitly report the limitation.
- Do not invent market data when tool responses are missing.
- Final ASO output must include the exact keyword searches used and the selected competitor list.
- Do not state that Sensor Tower provides daily installs; use ASOspy D/I for that field.

## Tool references

- `web_fetch`: fetch and parse app page when URL is available.
- `aso_play_search`: Play Store keyword search with ASOspy overlay (D/I + age).
- `sensortower_app_snapshot`: app metadata and estimated performance snapshot per competitor.
