# Sensor Tower

OpenClaw plugin that adds one optional tool: `sensortower_app_snapshot`.

The tool is workflow-first: one call returns the combined app intelligence data you requested.

- Overall revenue estimate (WW)
- Overall downloads estimate (WW)
- Overall RDP estimate (computed as revenue/downloads)
- Last-month downloads estimate
- Subtitle/short description
- Long description
- Top countries (by last-month downloads when available)
- Languages

Values are estimates from Sensor Tower API responses.

## Enable plugin

Recommended (native flow):

```bash
openclaw configure --section sensortower
```

This section is also available during `openclaw onboard`.

Manual config (equivalent):

```json
{
  "plugins": {
    "entries": {
      "sensortower-aso": {
        "enabled": true,
        "config": {
          "authToken": "st_your_token_here",
          "authMode": "query",
          "requestsPerMinute": 6
        }
      }
    }
  },
  "tools": {
    "allow": ["sensortower_app_snapshot"]
  }
}
```

You can also set `SENSORTOWER_AUTH_TOKEN` instead of storing `authToken` in config.

## Tool inputs

- `unified_app_id` (optional): 24-char unified id.
- `app_id` (optional): iOS app id (numeric) or Android package id.
- `app_query` (optional): app search string, used when ids are not provided.
- `month` (optional): `YYYY-MM`, defaults to previous month (UTC).
- `metadata_os` (optional): `unified`, `ios`, or `android` (used for details and non-unified sales calls).
- `top_countries_limit` (optional): max countries to return (default 10).

At least one of `unified_app_id`, `app_id`, or `app_query` is required.

## Endpoint defaults

The plugin is endpoint-configurable to match your Sensor Tower account/docs.

- search: `/v1/unified/search_entities`
- details: `/v1/{os}/apps`
- sales: `/v1/{os}/sales_report_estimates`

If your account uses different paths/params, override them under:
`plugins.entries.sensortower-aso.config.endpoints`.
