# Play Store App Scores

OpenClaw plugin that adds an optional agent tool **play_store_app_scores**: search Google Play by keyword, compute X score from installs (A) and app age in months (B), return a ranked markdown table.

## Enable

Add to `tools.allow` or `agents.list[].tools.allow` in `openclaw.json`:

- Tool name: `play_store_app_scores`
- Or plugin id: `play-store-app-scores` (enables all tools from this plugin)

## Tool parameters

- **keyword** (required): Search query for Google Play.
- **limit** (optional): Max apps to fetch (default 20, max 250).
- **country** (optional): Two-letter country code (default `us`).

## Score formula

X = (A / 1e6) × (0.7 × decay(B) + 0.3), decay(B) = 1 / (1 + B/12). High installs + low age favored.

## Skill

The plugin ships a skill so the agent knows when to use the tool (Play Store app research, X score for apps) and how to present the ranked table.
