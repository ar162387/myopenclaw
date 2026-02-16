# ASO Research

OpenClaw plugin that adds an optional agent tool **aso_play_search**: search Google Play by keyword using the work search URL; the **ASOspy** Chrome extension overlays daily installs (D/I) and app age on the search results page. The tool extracts that data and returns a markdown table. No per-app navigation—everything is read from the single search results page.

## Enable and run (so the agent can see the tool)

The tool is **optional**: the agent (any provider—OpenAI, Gemini, etc.) only receives it if you do all of the following. Restart the gateway after changing config.

### 1. Enable the plugin

Bundled extensions are disabled by default. In `openclaw.json` (or your config file), set:

```json
"plugins": {
  "entries": {
    "aso-research": {
      "enabled": true
    }
  }
}
```

### 2. Allow the tool for the agent

Add the tool (or the whole plugin) to the tool allowlist so it is sent to the model:

- In **global** `tools.allow`, or
- In **per-agent** `agents.list[].tools.allow`

Use either the tool name or the plugin id:

- Tool name: `aso_play_search`
- Plugin id (enables all tools from this plugin): `aso-research`

Example (allow for all agents):

```json
"tools": {
  "allow": ["aso_play_search"]
}
```

Example (allow only for a specific agent):

```json
"agents": {
  "list": [
    {
      "id": "main",
      "tools": {
        "allow": ["aso-research"]
      }
    }
  ]
}
```

### 3. ASOspy path and Playwright Chromium

The tool needs the ASOspy extension. Path is resolved in order:

1. **Config** – `plugins.entries.aso-research.config.asospyExtensionPath`
2. **Env** – `ASOSPY_EXTENSION_PATH` (e.g. in `~/.profile` or systemd)
3. **Auto-detect** – common Chrome/Chromium installs (macOS: `~/Library/Application Support/Google/Chrome/...`; Linux: `~/.config/google-chrome/...`, `~/.config/chromium/...`)

So on Linux you can **omit config** and either install ASOspy in Chromium (we find it), set env once, or use the install script (no GUI).

**Linux without GUI: install the extension via script**

From the repo root (requires `curl` and `unzip`, e.g. `apt install curl unzip`):

```bash
bun scripts/install-asospy-extension.ts
```

This downloads the ASOspy extension from the Chrome Web Store and unpacks it to `$XDG_DATA_HOME/asospy-extension` (default `~/.local/share/asospy-extension`). The ASO research tool auto-detects that path; no config or env needed. To use a different dir: `ASOSPY_EXTENSION_INSTALL_DIR=/path/to/dir bun scripts/install-asospy-extension.ts`.

If you do set **asospyExtensionPath** in config, it can be your Chrome profile’s extension folder (paths with spaces are copied to a temp dir so Chromium can load it).

Extension loading uses **Playwright’s Chromium only**. Google Chrome and Edge ignore `--load-extension`, so the tool always launches Playwright’s Chromium.

Optional in `config`:

- **headless** (default `true`): Run Chromium headless. Chrome 128+ new headless mode supports extensions, so ASOspy works on servers (e.g. EC2) without a display.
- **playStoreLocale** (default `en`): `hl` for Play Store (e.g. `en`, `de`).
- **overlayTimeoutMs** (default `20000`): How long to wait for the ASOspy overlay (ms).
- **useWorkSearch** (default `true`): Try work search first; if injection fails, falls back to store search.

Install Playwright Chromium once (required for the extension to load):

```bash
npx playwright install chromium
```

**Full example** (enable plugin + allow tool; extension path can come from config, env, or auto-detect):

```json
{
  "plugins": {
    "entries": {
      "aso-research": {
        "enabled": true,
        "config": {
          "asospyExtensionPath": "/path/to/unpacked-asospy",
          "overlayTimeoutMs": 15000
        }
      }
    }
  },
  "tools": {
    "allow": ["aso_play_search"]
  }
}
```

## Tool parameters

- **keyword** (required): Search query for Play Store (e.g. "food", "fitness").
- **hl** (optional): Locale (default `en`).
- **limit** (optional): Max apps to return (default 20, max 50).

## Tool output

The tool returns a markdown table with:

- app name
- package id
- Play URL
- daily installs (D/I)
- age

Use package id for exact Sensor Tower lookup (`sensortower_app_snapshot` with `app_id`).

## How it works

1. Chromium is launched headless (default) with ASOspy (`--load-extension`, `--headless=new`) and a temporary profile.
2. The tool navigates to `https://play.google.com/work/search?q={keyword}&c=apps&hl={hl}` (work search reduces bot detection).
3. It waits for the ASOspy overlay to appear on the search results (e.g. text like "D/I" on app cards).
4. It extracts from each visible app card: **app name**, **daily installs (D/I)**, **age** (and optionally total installs, category).
5. It returns a markdown table in one shot.

Overlay selectors are best-effort; if ASOspy changes its UI, selectors may need to be updated (see code or open an issue).

## Skill

The plugin ships a skill that supports two modes:

- Single-tool mode: use `aso_play_search` directly for keyword + D/I + age snapshots.
- Workflow mode (default for ASO copy generation): orchestrate `web_fetch` (if URL provided), iterative `aso_play_search` competitor discovery, and per-competitor `sensortower_app_snapshot`, then generate optimized app name + short/long descriptions.

This keeps tool access independent while giving a stable end-to-end ASO flow without repeating long prompts.

The plugin also injects ASO workflow guardrails for ASO-style prompts via `before_agent_start`:

- avoid package-id keywords (`com.foo.bar`) for Play search
- run multiple keyword searches
- run Sensor Tower per selected competitor before finalizing ASO copy
