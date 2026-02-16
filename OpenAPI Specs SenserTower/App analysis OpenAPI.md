openapi: 3.0.3
info:
  title: SensorTower App Analysis API (extracted)
  version: "1.0"

servers:
  - url: https://api.sensortower.com

paths:

  # ─── OVERVIEW: App Overview ───

  /v1/{os}/apps:
    get:
      tags: [OVERVIEW - App Overview]
      summary: Fetches app metadata
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
            default: US
        - in: query
          name: include_sdk_data
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  /v1/ios/apps/top_in_app_purchases:
    get:
      tags: [OVERVIEW - App Overview]
      summary: Fetches top in-app purchases (iOS only)
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
            default: US
      responses:
        "200":
          description: Success

  # ─── PERFORMANCE: Downloads & Revenue ───

  /v1/{os}/sales_report_estimates:
    get:
      tags: [PERFORMANCE - Downloads & Revenue]
      summary: Fetches download and revenue estimates
      description: Fetches estimated download and revenue data for limits specified by the query parameters.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: publisher_ids
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
        - in: query
          name: data_model
          schema:
            type: string
            enum: [DM_2025_Q2, DM_2025_Q1]
      responses:
        "200":
          description: Success

  /v1/{os}/compact_sales_report_estimates:
    get:
      tags: [PERFORMANCE - Downloads & Revenue]
      deprecated: true
      summary: Compact download & revenue estimates (deprecated)
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
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
        - in: query
          name: app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: publisher_ids[]
          schema:
            type: array
            items:
              type: string
        - in: query
          name: unified_app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: unified_publisher_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: categories
          schema:
            type: array
            items:
              type: string
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [daily, weekly, monthly, quarterly]
        - in: query
          name: data_model
          schema:
            type: string
            enum: [DM_2025_Q2, DM_2025_Q1]
      responses:
        "200":
          description: Success

  # ─── PERFORMANCE: Active Users ───

  /v1/{os}/usage/active_users:
    get:
      tags: [PERFORMANCE - Active Users]
      summary: Fetches active user estimates of apps
      description: Fetches active user estimates (DAU, WAU, MAU) for the specified apps.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: time_period
          required: true
          schema:
            type: string
            enum: [day, week, month]
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
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: data_model
          schema:
            type: string
            enum: [DM_2025_Q2, DM_2025_Q1]
      responses:
        "200":
          description: Success

  # ─── PERFORMANCE: Category Rankings ───

  /v1/{os}/category/category_history:
    get:
      tags: [PERFORMANCE - Category Rankings]
      summary: Fetches detailed category ranking history
      description: Fetches the historical category rankings for an app over a specified time period.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: chart_type_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: countries
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: start_date
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          schema:
            type: string
            format: date
        - in: query
          name: is_hourly
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  /v1/{os}/category/category_ranking_summary:
    get:
      tags: [PERFORMANCE - Category Rankings]
      summary: Today's category ranking summary
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_id
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  # ─── ADVERTISING: Creative Gallery ───

  /v1/{os}/ad_intel/creatives:
    get:
      tags: [ADVERTISING - Creative Gallery]
      summary: Fetches creatives for advertising apps
      description: Fetches the advertising creatives (images, videos, etc.) used by the specified apps.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: page_size
          schema:
            type: integer
        - in: query
          name: page
          schema:
            type: integer
        - in: query
          name: networks
          schema:
            type: array
            items:
              type: string
        - in: query
          name: start_date
          schema:
            type: string
            format: date
        - in: query
          name: end_date
          schema:
            type: string
            format: date
      responses:
        "200":
          description: Success

  # ─── ADVERTISING: Network Analysis ───

  /v1/{os}/ad_intel/network_analysis:
    get:
      tags: [ADVERTISING - Network Analysis]
      summary: Fetches ad network analysis
      description: Fetches analysis of the ad networks used by the specified apps.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
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
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [daily, weekly, monthly]
      responses:
        "200":
          description: Success

  /v1/{os}/ad_intel/network_analysis/rank:
    get:
      tags: [ADVERTISING - Network Analysis]
      summary: Fetches ad network analysis rank
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
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

  # ─── APP UPDATES: App Update Timeline ───

  /v1/{os}/app_update/get_app_update_history:
    get:
      tags: [APP UPDATES - App Update Timeline]
      summary: Fetches app update history
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/{os}/apps/version_history:
    get:
      tags: [APP UPDATES - App Update Timeline]
      summary: Version history of an app
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  # ─── ACQUISITION & CHURN: Download Channels ───

  /v1/{os}/downloads_by_sources:
    get:
      tags: [ACQUISITION & CHURN - Download Channels]
      summary: Fetches app download channels
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, unified]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: countries
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [daily, monthly]
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        app_id:
                          type: string
                          example: "55c527c302ac64f9c0002b18"
                        breakdown:
                          type: array
                          items:
                            type: object
                            properties:
                              date:
                                type: string
                                format: date
                                example: "2022-02-01"
                              organic_abs:
                                type: integer
                                example: 27358296
                              organic_browse_abs:
                                type: integer
                                example: 12430267
                              organic_search_abs:
                                type: integer
                                example: 14928029
                              browser_abs:
                                type: integer
                                example: 2563933
                              paid_abs:
                                type: integer
                                example: 1033148
                              paid_search_abs:
                                type: integer
                                example: 4064524
                              organic_frac:
                                type: number
                                format: float
                                example: 0.781221
                              organic_browse_frac:
                                type: number
                                format: float
                                example: 0.354949
                              organic_search_frac:
                                type: number
                                format: float
                                example: 0.426273
                              browser_frac:
                                type: number
                                format: float
                                example: 0.073214
                              paid_frac:
                                type: number
                                format: float
                                example: 0.029502
                              paid_search_frac:
                                type: number
                                format: float
                                example: 0.116063

  # ─── ACQUISITION & CHURN: Acquisition & Churn ───

  /v1/{os}/consumer_intel/churn_analysis:
    get:
      tags: [ACQUISITION & CHURN - Acquisition & Churn]
      summary: Fetches churn analysis
      description: Fetches churn analysis data for specific user cohorts.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
        - in: query
          name: granularity
          required: true
          schema:
            type: string
            enum: [monthly]
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

  /v1/{os}/consumer_intel/churn_analysis/cohorts:
    get:
      tags: [ACQUISITION & CHURN - Acquisition & Churn]
      summary: Fetches cohorts for churn analysis
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success

  /v1/{os}/consumer_intel/cohort_retention:
    get:
      tags: [ACQUISITION & CHURN - Acquisition & Churn]
      summary: Fetches cohort retention
      description: Fetches retention rates for specific user cohorts.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: granularity
          required: true
          schema:
            type: string
            enum: [weekly, monthly]
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

  /v1/{os}/consumer_intel/cohort_retention/cohorts:
    get:
      tags: [ACQUISITION & CHURN - Acquisition & Churn]
      summary: Fetches cohorts for cohort retention
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success

  # ─── ACQUISITION & CHURN: Retention ───

  /v1/{os}/usage/retention:
    get:
      tags: [ACQUISITION & CHURN - Retention]
      summary: Fetches retention data
      description: Fetches user retention data for the specified apps.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_ids
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

  # ─── USAGE: Demographics ───

  /v1/{os}/usage/demographics:
    get:
      tags: [USAGE - Demographics]
      summary: Demographic breakdown
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [all_time, quarterly]
        - in: query
          name: start_date
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
      responses:
        "200":
          description: Success

  # ─── USAGE: Session Metrics (Time Spent, Session Count) ───

  /v1/apps/timeseries:
    get:
      tags: [USAGE - Session Metrics]
      summary: Fetch time series data for non-unified apps
      parameters:
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
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: timeseries
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [time_spent, total_time_spent, session_duration, session_count, total_session_count]
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: time_period
          required: true
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [app_id, "app_id,region"]
      responses:
        "200":
          description: Success

  /v1/apps/timeseries/unified_apps:
    get:
      tags: [USAGE - Session Metrics]
      summary: Fetch time series data for unified apps
      parameters:
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
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: timeseries
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [time_spent, total_time_spent, session_duration, session_count, total_session_count]
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: time_period
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly]
        - in: query
          name: os
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [unified_app_id, "unified_app_id,region"]
      responses:
        "200":
          description: Success

  # ─── USAGE: Engagement ───

  /v1/{os}/consumer_intel/engagement_insights:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches engagement insights
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
        - in: query
          name: granularity
          required: true
          schema:
            type: string
            enum: [monthly]
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        selection_cohort_id:
                          type: string
                          example: "cohort_123"
                        session_metrics:
                          type: array
                          items:
                            type: object
                            properties:
                              avg_session_count:
                                type: integer
                                example: 0
                              avg_time_spent:
                                type: integer
                                example: 0
                              date:
                                type: string
                                format: date
                                example: "2026-02-13"
                        start_date:
                          type: string
                          format: date
                          example: "2026-02-13"

  /v1/{os}/consumer_intel/engagement_insights/cohorts:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches cohorts for engagement insights
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: "cohort_123"
                        name:
                          type: string
                          example: "Sample Cohort"
                        type:
                          type: string
                          example: "selection"
                        required:
                          type: string
                          example: "optional_field"

  /v1/{os}/consumer_intel/cohort_engagement:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches cohort engagement
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: granularity
          required: true
          schema:
            type: string
            enum: [weekly, monthly]
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        filter_cohort_id:
                          type: string
                          example: "cohort_c5f1f0d92e36ce234f283c02"
                        selection_cohort_id:
                          type: string
                          example: "cohort_85b0b0a055f66ee9d9461187"
                        start_date:
                          type: string
                          format: date
                          example: "2026-02-13"
                        session_metrics:
                          type: array
                          items:
                            type: object
                            properties:
                              avg_session_count:
                                type: integer
                                example: 0
                              avg_time_spent:
                                type: integer
                                example: 0
                              date:
                                type: string
                                format: date
                                example: "2026-02-13"
                              pct_dau_growth:
                                type: integer
                                example: 0

  /v1/{os}/consumer_intel/cohort_engagement/cohorts:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches cohorts for cohort engagement
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: "cohort_123"
                        name:
                          type: string
                          example: "Sample Cohort"
                        type:
                          type: string
                          example: "selection"

  /v1/{os}/consumer_intel/power_user_curve:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches power user curve
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        selection_cohort_id:
                          type: string
                          example: "cohort_123"
                        power_user_curve:
                          type: array
                          items:
                            type: object
                            properties:
                              date:
                                type: string
                                format: date
                                example: "2026-02-13"
                              days_used_histogram:
                                type: array
                                items:
                                  type: integer
                                example: [0, 5, 10]
                              total_days:
                                type: integer
                                example: 30

  /v1/{os}/consumer_intel/power_user_curve/cohorts:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches cohorts for power user curve
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: "cohort_123"
                        name:
                          type: string
                          example: "Sample Cohort"
                        type:
                          type: string
                          example: "selection"

  /v1/{os}/consumer_intel/time_of_day:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches time of day usage data
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
        - in: query
          name: selection_cohort_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: country
          schema:
            type: string
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
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        selection_cohort_id:
                          type: string
                          example: "cohort_123"
                        time_spent_hourly:
                          type: array
                          items:
                            type: number
                          example: [0, 10, 20]

  /v1/{os}/consumer_intel/time_of_day/cohorts:
    get:
      tags: [USAGE - Engagement]
      summary: Fetches cohorts for time of day
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: "cohort_123"
                        name:
                          type: string
                          example: "Sample Cohort"
                        type:
                          type: string
                          example: "selection"

  # ─── CROSS APP USAGE: App Overlap ───

  /v1/unified/app_overlap:
    get:
      tags: [CROSS APP USAGE - App Overlap]
      summary: Fetches app overlap data
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: overlap_type
          required: true
          schema:
            type: string
        - in: query
          name: country
          schema:
            type: string
        - in: query
          name: time_period
          schema:
            type: string
        - in: query
          name: date
          schema:
            type: string
            format: date
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        app_id:
                          type: string
                          example: "55c51be002ac64f9c00027e7"
                        app_a_users_likelihood_multiplier:
                          type: number
                          format: float
                          example: 29.0889949798584
                        app_a_users_using_app_b_share:
                          type: number
                          format: float
                          example: 0.0714285746216774
                        app_a_users_using_app_b_share_previous_period:
                          type: number
                          format: float
                          example: 0.05298013240098953
                        app_a_users_using_app_b_share_previous_period_diff:
                          type: number
                          format: float
                          example: 0.01844844222068787
                        app_b_users_likelihood_multiplier:
                          type: number
                          format: float
                          example: 28.0239546796584

  # ─── CROSS APP USAGE: Cross App Usage (facets/metrics) ───
  # NOTE: Sensor Tower uses query-string-based routing for /v1/facets/metrics

  /v1/facets/metrics?retention:
    get:
      tags: [CROSS APP USAGE - Cross App Usage]
      summary: Fetches cross-app usage retention facets
      description: Fetches retention metric estimates for mobile apps.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [retention_daily, retention_weekly, retention_monthly]
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [date, app_id, unified_app_id]
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
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: unified_app_ids
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_retention_d1:
                          type: number
                          format: float
                          example: 0.85
                        est_retention_d2:
                          type: number
                          format: float
                          example: 0.81
                        est_retention_d3:
                          type: number
                          format: float
                          example: 0.75
                        est_retention_d4:
                          type: number
                          format: float
                          example: 0.63
                        est_retention_d5:
                          type: number
                          format: float
                          example: 0.52
                        est_retention_d6:
                          type: number
                          format: float
                          example: 0.39
                        est_retention_d7:
                          type: number
                          format: float
                          example: 0.21
                        est_retention_d15:
                          type: number
                          format: float
                          example: 0.17
                        est_retention_d30:
                          type: number
                          format: float
                          example: 0.13
                        est_retention_d60:
                          type: number
                          format: float
                          example: 0.09

  # ─── INSTALL METRICS: Install Base and Penetration ───

  /v1/facets/metrics?install_base:
    get:
      tags: [INSTALL METRICS - Install Base and Penetration]
      summary: Fetches install base and penetration metrics
      description: Fetches install base, penetration, and open rate estimates for mobile apps.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_install_base, est_install_penetration, est_open_rate, est_usage_penetration]
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [date, app_id, region, device]
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [day, week, month]
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
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: unified_app_ids
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_install_base:
                          type: integer
                          example: 150000

  # ─── METRO USAGE: Active Users ───

  /v1/facets/metrics?metro_active_users:
    get:
      tags: [METRO USAGE - Active Users]
      summary: Fetches metro active users metrics
      description: Fetches active user estimates for mobile apps in specific metropolitan areas.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_metro_active_users]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [date, app_id, metro_id, device]
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [week, month]
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
        - in: query
          name: metro_ids
          schema:
            type: array
            items:
              type: integer
        - in: query
          name: app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: unified_app_ids
          schema:
            type: array
            items:
              type: string
        - in: query
          name: devices
          schema:
            type: string
            enum: [iphone, ipad, android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_metro_active_users:
                          type: integer
                          example: 150000

  # ─── SDK INSIGHTS: SDK Analysis ───

  /v1/facets/metrics?sdk_analysis:
    get:
      tags: [SDK INSIGHTS - SDK Analysis]
      summary: Fetches SDK analysis metrics
      description: Fetches time-series metrics for SDKs, such as installs and detection share.
      parameters:
        - in: query
          name: metric
          schema:
            type: string
            enum: [sdk_apps_detected, sdk_apps_detected_share, sdk_installs, sdk_uninstalls, est_sdk_downloads, est_sdk_downloads_share]
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [sdk_id, date]
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [day, week, month, quarter]
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
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: sdk_ids
          required: true
          schema:
            type: array
            items:
              type: integer
        - in: query
          name: unified_categories
          schema:
            type: array
            items:
              type: string
        - in: query
          name: os
          required: true
          schema:
            type: string
            enum: [unified, ios, android]
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        sdk_id:
                          type: integer
                          example: 123456789
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        sdk_apps_detected:
                          type: integer
                          example: 150000

  /v1/facets/metrics?sdk_list_of_apps:
    get:
      tags: [SDK INSIGHTS - SDK Analysis]
      summary: Fetches SDK list of apps
      description: Fetches apps that have a particular SDK installed or uninstalled.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [sdk_overview_app_data]
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_app_id, app_id]
        - in: query
          name: sdk_id
          required: true
          schema:
            type: integer
        - in: query
          name: sdk_install_status
          schema:
            type: string
            enum: [installed, uninstalled]
        - in: query
          name: limit
          schema:
            type: integer
            default: 25
            maximum: 200
        - in: query
          name: offset
          schema:
            type: integer
        - in: query
          name: order_by
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        unified_app_id:
                          type: string
                          example: "unified_app_id_12345"
                        est_sdk_downloads_last_30_days_ww:
                          type: integer
                          example: 100000
                        est_sdk_revenue_last_30_days_ww:
                          type: integer
                          example: 100000
                        est_sdk_dau_last_30_days_ww:
                          type: integer
                          example: 100000
                        sdk_days_installed:
                          type: integer
                          example: 100
                        sdk_install_date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        sdk_uninstall_date:
                          type: string
                          format: date
                          example: "2025-01-15"

  # ─── SDK INSIGHTS: SDK Overview ───

  /v1/sdk/summary_metrics:
    get:
      tags: [SDK INSIGHTS - SDK Overview]
      summary: Fetches SDK summary metrics
      parameters:
        - in: query
          name: sdk_ids
          required: true
          schema:
            type: array
            items:
              type: integer
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: integer
                          example: 60100000000400
                        name:
                          type: string
                          example: "Google Firebase SDK"
                        enabled:
                          type: boolean
                          example: true
                        sdk_url:
                          type: string
                          example: "https://firebase.google.com/docs/"
                        icon_url:
                          type: string
                          example: "https://static-s.aa-cdn.net/img/sdkicon/6e14c75d8309c3a3f00c4adce4449f38.png"
                        company_name:
                          type: string
                          example: "Google"
                        description:
                          type: string
                          example: "Firebase gives you the tools to develop high-quality apps, grow your user base, and earn more money."
                        sdk_types:
                          type: array
                          items:
                            type: integer
                          example: [2, 6, 11, 26]
                        supported_os:
                          type: array
                          items:
                            type: string
                          example: ["android", "ios"]
                        top_categories:
                          type: array
                          items:
                            type: integer
                          example: [6002, 6016, 6007]
                        today_apps:
                          type: integer
                          example: 1000000
                        today_apps_average:
                          type: integer
                          example: 1000000
                        market_share:
                          type: number
                          format: float
                          example: 0.5
                        recent_installs:
                          type: integer
                          example: 1000
                        recent_uninstalls:
                          type: integer
                          example: 100
                        downloads:
                          type: integer
                          example: 1000000
                        downloads_share:
                          type: number
                          format: float
                          example: 0.5
                        revenue:
                          type: integer
                          example: 1000000
                        most_downloaded_app:
                          type: integer
                          example: 1000000
                        highest_grossing_app:
                          type: integer
                          example: 1000000
                        most_active_users_app:
                          type: integer
                          example: 1000000
                        created_at:
                          type: string
                          format: date-time
                          example: "2025-10-24T03:39:18Z"
