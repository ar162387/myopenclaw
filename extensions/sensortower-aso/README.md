# Sensor Tower

OpenClaw plugin that adds two optional tools:

- `sensortower_app_snapshot` (metadata only)
- `sensortower_app_sales_downloads` (sales/download estimates only)

`sensortower_app_snapshot` returns metadata fields (name, subtitle/short description, long description, languages).
`sensortower_app_sales_downloads` returns monthly worldwide and by-country estimates for downloads/revenue.

Values are estimates from Sensor Tower API responses.
Neither tool provides ASOspy-style daily installs (D/I); use `aso_play_search` for D/I and app age.

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
    "allow": ["sensortower_app_snapshot", "sensortower_app_sales_downloads"]
  }
}
```

You can also set `SENSORTOWER_AUTH_TOKEN` instead of storing `authToken` in config.

## `sensortower_app_snapshot` inputs

- `unified_app_id` (optional): 24-char unified id.
- `app_id` (optional): iOS app id (numeric) or Android package id.
- `app_query` (optional): app search string, used when ids are not provided.
- `return_candidates` (optional): when `true` with `app_query/query` (and no ids), returns ranked candidate matches only.
- `candidates_limit` (optional): candidate count in candidate mode (default 5, max 10).
- `metadata_os` (optional): `unified`, `ios`, or `android` (used for app details lookup).

At least one of `unified_app_id`, `app_id`, or `app_query` is required.

## `sensortower_app_sales_downloads` inputs

- `unified_app_id` (optional): 24-char unified id.
- `app_id` (optional): iOS app id (numeric) or Android package id.
- `app_query` (optional): app search string, used when ids are not provided.
- `return_candidates` (optional): when `true` with `app_query/query` (and no ids), returns ranked candidate matches only.
- `candidates_limit` (optional): candidate count in candidate mode (default 5, max 10).
- `month` (optional): `YYYY-MM`, defaults to previous month (UTC).
- `sales_os` (optional): `unified`, `ios`, or `android`.
- `top_countries_limit` (optional): max countries to return (default 10).

At least one of `unified_app_id`, `app_id`, or `app_query` is required.

## Endpoint defaults

The plugin is endpoint-configurable to match your Sensor Tower account/docs.

- search: `/v1/unified/search_entities`
- details: `/v1/{os}/apps`
- sales: `/v1/{os}/sales_report_estimates`

If your account uses different paths/params, override them under:
`plugins.entries.sensortower-aso.config.endpoints`.
