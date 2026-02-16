#!/usr/bin/env bun
/**
 * Run ASO play search with a keyword (same flow as the agent tool).
 * Uses config from ~/.openclaw/openclaw.json (plugins.entries.aso-research.config).
 *
 * Usage: bun scripts/run-aso-play-search.ts [keyword]
 * Example: bun scripts/run-aso-play-search.ts wallpaper
 *
 * Env:
 *   ASOSPY_EXTENSION_PATH - path to unpacked ASOspy extension (overrides config; optional if auto-detect finds it)
 *   ASO_HEADLESS=0       - show Chrome window for debugging
 *   If Chromium not found: unset PLAYWRIGHT_BROWSERS_PATH so Playwright uses default cache.
 */
import { loadConfig } from "../src/config/config.js";
import { resolveAsospyExtensionPath } from "../extensions/aso-research/src/asospy-path.js";
import { runAsoPlaySearch } from "../extensions/aso-research/src/workflow-asospy-search.js";

const keyword = process.argv[2]?.trim() || "wallpaper";
const DEFAULT_OVERLAY_TIMEOUT_MS = 20_000;

async function main() {
  const cfg = loadConfig();
  const pluginConfig = cfg.plugins?.entries?.["aso-research"]?.config ?? {};
  const configPath =
    typeof pluginConfig.asospyExtensionPath === "string"
      ? pluginConfig.asospyExtensionPath.trim()
      : undefined;
  const asospyExtensionPath = resolveAsospyExtensionPath({ configPath, env: process.env });
  const chromiumExecutablePath =
    process.env.ASO_CHROMIUM_PATH?.trim() ||
    (typeof pluginConfig.chromiumExecutablePath === "string"
      ? pluginConfig.chromiumExecutablePath.trim()
      : undefined);
  const overlayTimeoutMs =
    typeof pluginConfig.overlayTimeoutMs === "number" && pluginConfig.overlayTimeoutMs > 0
      ? pluginConfig.overlayTimeoutMs
      : DEFAULT_OVERLAY_TIMEOUT_MS;
  const headlessEnv = process.env.ASO_HEADLESS?.toLowerCase();
  const headless =
    headlessEnv === "0" || headlessEnv === "false" || headlessEnv === "no"
      ? false
      : typeof pluginConfig.headless === "boolean"
        ? pluginConfig.headless
        : true;
  const useWorkSearch =
    typeof pluginConfig.useWorkSearch === "boolean" ? pluginConfig.useWorkSearch : true;

  if (!asospyExtensionPath) {
    console.error(
      "Error: ASOspy extension path not found. Set one of:\n" +
        "  1. In config: plugins.entries.aso-research.config.asospyExtensionPath\n" +
        "  2. Env: ASOSPY_EXTENSION_PATH=/path/to/unpacked-asospy\n" +
        "  3. Install ASOspy in Chrome/Chromium (we auto-detect common paths on macOS/Linux).",
    );
    process.exit(1);
  }

  console.log(`Running ASO play search for keyword: "${keyword}" (headless: ${headless})`);
  console.log("Launching Chromium with ASOspy extension...");

  const rows = await runAsoPlaySearch({
    keyword,
    hl: "en",
    limit: 20,
    asospyExtensionPath,
    chromiumExecutablePath: chromiumExecutablePath || undefined,
    overlayTimeoutMs,
    headless,
    useWorkSearch,
  });

  const header = "| # | App name | Daily installs | Age |";
  const sep = "| --- | --- | --- | --- |";
  const body = rows
    .map(
      (r, i) =>
        `| ${i + 1} | ${(r.appName ?? "").replace(/\|/g, "\\|")} | ${(r.dailyInstalls ?? "—").replace(/\|/g, "\\|")} | ${(r.age ?? "—").replace(/\|/g, "\\|")} |`,
    )
    .join("\n");
  console.log("\n" + header + "\n" + sep + "\n" + body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
