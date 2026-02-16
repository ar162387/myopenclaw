openapi: 3.0.3
info:
  title: SensorTower Your Metrics (extracted)
  version: "1.0"

servers:
  - url: https://api.sensortower.com

paths:

  # ─── CONNECTED APPS: My App Analytics ───

  /v1/ios/sales_reports/analytics_metrics:
    get:
      tags: [CONNECTED APPS - My App Analytics]
      summary: Fetches App Store analytics report of your apps
      description: |
        Retrieve a detailed app store analytics report of your apps by country and date, with information such as app impressions, app store views, in-app purchases, sessions, and active devices.
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
          description: App IDs of apps that you currently manage, separated by commas
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
          description: Specify the countries you want download / revenue for
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start Date, YYYY-MM-DD Format
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End Date, YYYY-MM-DD Format
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    app_id:
                      type: integer
                    country:
                      type: string
                    date:
                      type: string
                    iphone_app_store_views:
                      type: integer
                    iphone_app_impressions:
                      type: integer
                    iphone_app_units:
                      type: integer
                    iphone_paying_users:
                      type: integer
                    iphone_in_app_purchases:
                      type: integer
                    iphone_installations:
                      type: integer
                    iphone_sessions:
                      type: integer
                    iphone_active_devices:
                      type: integer
                    ipad_app_store_views:
                      type: integer
                    ipad_app_impressions:
                      type: integer
                    ipad_app_units:
                      type: integer
                    ipad_paying_users:
                      type: integer
                    ipad_in_app_purchases:
                      type: integer
                    ipad_installations:
                      type: integer
                    ipad_sessions:
                      type: integer
                    ipad_active_devices:
                      type: integer
                    ipod_app_store_views:
                      type: integer
                    ipod_app_impressions:
                      type: integer
                    ipod_app_units:
                      type: integer
                    ipod_paying_users:
                      type: integer
                    ipod_in_app_purchases:
                      type: integer
                    ipod_installations:
                      type: integer
                    ipod_sessions:
                      type: integer
                    ipod_active_devices:
                      type: integer

  /v1/ios/sales_reports/sources_metrics:
    get:
      tags: [CONNECTED APPS - My App Analytics]
      summary: Fetches App Store metrics by Source Type of your apps
      description: |
        Retrieve a detailed app store report by traffic source type, country and date. Currently only available for Search source type metrics (app units and impressions).
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
          description: App IDs of apps that you currently manage, separated by commas
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
          description: Specify the countries you want report for
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start Date, YYYY-MM-DD Format
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End Date, YYYY-MM-DD Format
        - in: query
          name: limit
          schema:
            type: number
          description: Limit, maximum number of reports to retrieve, maximum of 6000.
        - in: query
          name: offset
          schema:
            type: number
          description: Offset, used to paginate results.
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    app_id:
                      type: integer
                    country:
                      type: string
                    date:
                      type: string
                    app_impressions_by_app_store_search:
                      type: integer
                    app_units_by_app_store_search:
                      type: integer

  # ─── CONNECTED APPS: My Sales Metrics ───

  /v1/{os}/sales_reports:
    get:
      tags: [CONNECTED APPS - My Sales Metrics]
      summary: Fetches downloads and revenue sales report of your apps
      description: |
        Retrieve downloads and revenue report of your apps by country and date.
        All revenue is Net. All revenues are returned in cents.
        Note: This is ONLY for your own apps that you connected to Sensor Tower via iTunes Connect or Google Play.
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
          description: Operating System
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
          description: App IDs of apps that you currently manage, separated by commas
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
          description: "Specify the countries you want download / revenue for, separated by commas (use 'WW' for worldwide)"
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly, quarterly]
            default: daily
          description: Aggregate estimates by granularity
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start Date, YYYY-MM-DD Format
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End Date, YYYY-MM-DD Format
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    app_id:
                      type: integer
                    country:
                      type: string
                    date:
                      type: string
                    ipad_units:
                      type: integer
                    iphone_units:
                      type: integer
                    android_units:
                      type: integer
                    ipad_revenue:
                      type: integer
                    iphone_revenue:
                      type: integer
                    android_revenue:
                      type: integer

  /v1/unified/sales_reports:
    get:
      tags: [CONNECTED APPS - My Sales Metrics]
      summary: Fetches unified downloads and revenue sales report of your apps
      description: |
        Retrieve downloads and revenue report of your apps by country and date grouped by unified apps.
        You must specify at least one app_ids parameter: unified_app_ids, itunes_app_ids, or android_app_ids.
      parameters:
        - in: query
          name: unified_app_ids
          schema:
            type: array
            items:
              type: string
          description: Unified App IDs of apps that you currently manage, separated by commas
        - in: query
          name: itunes_app_ids
          schema:
            type: array
            items:
              type: string
          description: App IDs of Itunes apps that you currently manage, separated by commas
        - in: query
          name: android_app_ids
          schema:
            type: array
            items:
              type: string
          description: Android App IDs of apps that you currently manage, separated by commas
        - in: query
          name: countries
          schema:
            type: array
            items:
              type: string
          description: "Specify the countries you want download / revenue for, separated by commas (use 'WW' for all countries)"
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [daily, weekly, monthly, quarterly]
            default: daily
          description: Aggregate estimates by granularity
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start Date, YYYY-MM-DD Format
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End Date, YYYY-MM-DD Format
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    unified_app_id:
                      type: string
                    itunes_apps:
                      type: array
                      items:
                        type: object
                        properties:
                          app_id:
                            type: integer
                          country:
                            type: string
                          date:
                            type: string
                          ipad_units:
                            type: integer
                          ipad_revenue:
                            type: integer
                          iphone_units:
                            type: integer
                          iphone_revenue:
                            type: integer
                    android_apps:
                      type: array
                      items:
                        type: object
                        properties:
                          app_id:
                            type: string
                          country:
                            type: string
                          date:
                            type: string
                          daily_user_installs:
                            type: integer
                          daily_device_installs:
                            type: integer
                    aggregated:
                      type: array
                      items:
                        type: object
                        properties:
                          country:
                            type: string
                          date:
                            type: string
                          ipad_units:
                            type: integer
                          ipad_revenue:
                            type: integer
                          iphone_units:
                            type: integer
                          iphone_revenue:
                            type: integer
                          daily_user_installs:
                            type: integer
                          daily_device_installs:
                            type: integer

  # ─── API USAGE: API Usage ───

  /v1/api_usage:
    get:
      tags: [API USAGE - API Usage]
      summary: Fetches API usage for a given period
      description: |
        Retrieve API Usage for a given period for a user and their organization.
        Additionally, monthly API limit and API tier (if present) will be returned.
      parameters:
        - in: query
          name: date
          schema:
            type: string
            format: date
          description: Optional date to check monthly usage for as an ISO 8601 string (yyyy-mm-dd).
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  organization:
                    type: object
                    properties:
                      limit:
                        type: integer
                      tier:
                        type: string
                      usage:
                        type: integer
                      data_points:
                        type: object
                        properties:
                          limit:
                            type: integer
                          usage:
                            type: integer
                  user:
                    type: object
                    properties:
                      usage:
                        type: integer
                      usage_data_points:
                        type: integer
