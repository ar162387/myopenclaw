openapi: 3.0.3
info:
  title: SensorTower Market Analysis (extracted)
  version: "1.0"

servers:
  - url: https://api.sensortower.com

paths:

  # ─── APPS: Top Charts ───

  /v1/{os}/ranking:
    get:
      tags: [APPS - Top Charts]
      summary: Fetches top ranking apps of a particular category and chart type
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: chart_type
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
          schema:
            type: string
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
      responses:
        "200":
          description: Success

  # ─── APPS: Top Apps by Downloads and Revenue ───

  /v1/{os}/sales_report_estimates_comparison_attributes:
    get:
      tags: [APPS - Top Apps by Downloads and Revenue]
      summary: Fetches top apps by download and revenue estimates
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: comparison_attribute
          required: true
          schema:
            type: string
            enum: [absolute, delta, transformed_delta]
        - in: query
          name: time_range
          required: true
          schema:
            type: string
            enum: [day, week, month, quarter, year]
        - in: query
          name: measure
          required: true
          schema:
            type: string
            enum: [units, revenue]
        - in: query
          name: device_type
          schema:
            type: string
            enum: [iphone, ipad, total]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          schema:
            type: string
            format: date
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: limit
          schema:
            type: integer
            maximum: 2000
        - in: query
          name: offset
          schema:
            type: integer
        - in: query
          name: custom_fields_filter_id
          schema:
            type: string
        - in: query
          name: custom_tags_mode
          schema:
            type: string
            enum: [include_unified_apps, exclude_unified_apps]
        - in: query
          name: data_model
          schema:
            type: string
            enum: [DM_2025_Q1, DM_2025_Q2]
      responses:
        "200":
          description: Success

  # ─── APPS: Top Apps by Active Users ───

  /v1/{os}/top_and_trending/active_users:
    get:
      tags: [APPS - Top Apps by Active Users]
      summary: Fetches top apps by active users
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: comparison_attribute
          required: true
          schema:
            type: string
            enum: [absolute, delta, transformed_delta]
        - in: query
          name: time_range
          required: true
          schema:
            type: string
            enum: [week, month, quarter]
        - in: query
          name: measure
          required: true
          schema:
            type: string
            enum: [DAU, WAU, MAU]
        - in: query
          name: category
          schema:
            type: string
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: limit
          schema:
            type: integer
            default: 25
        - in: query
          name: offset
          schema:
            type: integer
        - in: query
          name: device_type
          schema:
            type: string
            enum: [iphone, ipad, total]
        - in: query
          name: custom_fields_filter_id
          schema:
            type: string
        - in: query
          name: data_model
          schema:
            type: string
            enum: [DM_2025_Q1, DM_2025_Q2]
      responses:
        "200":
          description: Success

  # ─── APPS: Top App Publishers ───

  /v1/{os}/top_and_trending/publishers:
    get:
      tags: [APPS - Top App Publishers]
      summary: Fetches top publishers by download and revenue estimates
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: comparison_attribute
          required: true
          schema:
            type: string
            enum: [absolute, delta, transformed_delta]
        - in: query
          name: time_range
          required: true
          schema:
            type: string
            enum: [day, week, month, quarter, year]
        - in: query
          name: measure
          required: true
          schema:
            type: string
            enum: [units, revenue]
        - in: query
          name: device_type
          schema:
            type: string
            enum: [iphone, ipad, total]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          schema:
            type: string
            format: date
        - in: query
          name: country
          schema:
            type: string
        - in: query
          name: limit
          schema:
            type: integer
        - in: query
          name: offset
          schema:
            type: integer
      responses:
        "200":
          description: Success

  # ─── APPS: Store Summary ───

  /v1/{os}/store_summary:
    get:
      tags: [APPS - Store Summary]
      summary: Fetches aggregated download and revenue estimates of store categories
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: categories
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly, quarterly]
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
      responses:
        "200":
          description: Success

  # ─── GAMES: Game Summary ───

  /v1/{os}/games_breakdown:
    get:
      tags: [GAMES - Game Summary]
      summary: Fetches gaming category breakdown of download and revenue estimates
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: categories
          schema:
            type: array
            items:
              type: string
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly, quarterly]
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
      responses:
        "200":
          description: Success

  # ─── ADVERTISING: Top Advertisers and Ad Publishers ───

  /v1/{os}/ad_intel/top_apps:
    get:
      tags: [ADVERTISING - Top Advertisers and Ad Publishers]
      summary: Fetches the top advertisers or publishers over a given time period
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: role
          required: true
          schema:
            type: string
            enum: [advertisers, publishers]
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: period
          required: true
          schema:
            type: string
            enum: [week, month, quarter]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
          schema:
            type: string
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: network
          required: true
          schema:
            type: string
        - in: query
          name: custom_fields_filter_id
          schema:
            type: string
        - in: query
          name: limit
          schema:
            type: integer
            maximum: 250
        - in: query
          name: page
          schema:
            type: integer
      responses:
        "200":
          description: Success

  /v1/{os}/ad_intel/top_apps/search:
    get:
      tags: [ADVERTISING - Top Advertisers and Ad Publishers]
      summary: Fetches the rank of an advertiser or publisher
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_id
          required: true
          schema:
            type: string
        - in: query
          name: role
          required: true
          schema:
            type: string
            enum: [advertisers, publishers]
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: period
          required: true
          schema:
            type: string
            enum: [week, month, quarter]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
          schema:
            type: string
        - in: query
          name: network
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  # ─── ADVERTISING: Top Creatives ───

  /v1/{os}/ad_intel/creatives/top:
    get:
      tags: [ADVERTISING - Top Creatives]
      summary: Fetches the top creatives based on impression share
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: date
          required: true
          schema:
            type: string
            format: date
        - in: query
          name: period
          required: true
          schema:
            type: string
            enum: [week, month, quarter]
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
          schema:
            type: string
        - in: query
          name: network
          required: true
          schema:
            type: string
        - in: query
          name: ad_types
          schema:
            type: array
            items:
              type: string
        - in: query
          name: placements
          schema:
            type: array
            items:
              type: string
        - in: query
          name: new_creative
          schema:
            type: boolean
        - in: query
          name: aspect_ratios
          schema:
            type: array
            items:
              type: string
        - in: query
          name: banner_dimensions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: video_durations
          schema:
            type: array
            items:
              type: string
        - in: query
          name: limit
          schema:
            type: integer
        - in: query
          name: page
          schema:
            type: integer
      responses:
        "200":
          description: Success
