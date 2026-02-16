openapi: 3.0.3
info:
  title: SensorTower Web Insights
  version: "1.0"

servers:
  - url: https://api.sensortower.com


paths:

  # ─── WEB (Deprecated) ───

  /v1/websites/facets:
    post:
      deprecated: true
      tags: [WEB]
      summary: "[DEPRECATED] Fetch data for websites"
      description: |
        **⚠️ DEPRECATED:** This endpoint is deprecated and will be removed in a future release.
        This endpoint allows you to retrieve estimated web traffic metrics for unified websites.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [facets, filters, breakdown]
              properties:
                facets:
                  type: array
                  description: An array of facet objects specifying the metrics and dimensions you want to retrieve.
                  items:
                    type: object
                    required: [facet]
                    properties:
                      facet:
                        type: string
                        description: Name of the metric or dimension
                      alias:
                        type: string
                        description: (Optional) Custom name for the response field
                      measure:
                        type: string
                        enum: [absolute]
                        description: Currently only "absolute" is supported
                      time_period:
                        type: string
                        enum: [day, week, month]
                        description: "Granularity: day, week, or month"
                filters:
                  type: object
                  description: An object where each key is a dimension and the value is the filter criteria for that dimension.
                  properties:
                    start_date:
                      type: string
                      format: date
                    end_date:
                      type: string
                      format: date
                    unified_website_ids:
                      type: array
                      items:
                        type: string
                    regions:
                      type: array
                      items:
                        type: string
                    devices:
                      type: array
                      items:
                        type: string
                breakdown:
                  type: array
                  description: An array of dimensions used to break down the returned metrics.
                  items:
                    type: string
                order_by:
                  type: array
                  description: (Optional) An array of objects specifying the sorting order for the results.
                  items:
                    type: object
                limit:
                  type: integer
                  description: (Optional) The maximum number of records to return.
                offset:
                  type: integer
                  description: (Optional) The number of records to skip before starting to collect the result set.


  /v1/facets/metrics?top_websites:
    get:
      tags: [PERFORMANCE: Top Websites]
      summary: Fetches top website metrics
      description: Get top websites data.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_website_visits, est_web_website_direct_visits, est_web_website_email_visits, est_web_website_social_visits, est_web_website_paid_visits, est_web_website_organic_search_visits, est_web_website_gen_ai_visits, est_web_website_visitors, est_web_website_duration]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, brand_id, brand_category_id, date]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: brand_category_ids
          schema:
            type: array
            items:
              type: integer
          description: Array of brand category IDs to filter by.
        - in: query
          name: devices
          schema:
            type: array
            items:
              type: string
              enum: [desktop, mobile]
          description: Array of device types to filter by (comma-separated).
        - in: query
          name: entities
          schema:
            type: array
            items:
              type: string
          description: Comma-separated list of entity enrichments to include in the response (e.g., brand_id:name).
        - in: query
          name: limit
          schema:
            type: integer
          description: Limit of number of websites to return (max 200).
        - in: query
          name: offset
          schema:
            type: integer
          description: Offset.
        - in: query
          name: order_by
          schema:
            type: array
            items:
              type: string
          description: Array of metrics and direction to order by (metric:direction).
        - in: query
          name: measure
          schema:
            type: string
            enum: [absolute, comparison, delta, growth]
          description: Type of measurement (absolute, comparison, delta, growth). Defaults to absolute.
        - in: query
          name: comparison_start_date
          schema:
            type: string
            format: date
          description: Comparison period start date (required when measure is comparison, delta, or growth).
        - in: query
          name: comparison_end_date
          schema:
            type: string
            format: date
          description: Comparison period end date (required when measure is comparison, delta, or growth).
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        brand_id:
                          type: integer
                          example: 541
                        brand_category_id:
                          type: integer
                          example: 2040
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_website_visits:
                          type: integer
                          example: 57861623765
                        est_web_website_direct_visits:
                          type: integer
                        est_web_website_email_visits:
                          type: integer
                        est_web_website_social_visits:
                          type: integer
                        est_web_website_paid_visits:
                          type: integer
                        est_web_website_organic_search_visits:
                          type: integer
                        est_web_website_gen_ai_visits:
                          type: integer
                        est_web_website_visitors:
                          type: integer
                        est_web_website_duration:
                          type: integer
                  meta:
                    type: object
                    properties:
                      limit:
                        type: integer
                        example: 25
                      offset:
                        type: integer
                        example: 0
                      total_count:
                        type: integer
                        example: 87
                  entities:
                    type: object
                    properties:
                      brand_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google Search"
                      brand_category_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Utilities"

  # ─── PERFORMANCE: Visits ───

  /v1/facets/metrics?website_visits:
    get:
      tags: [PERFORMANCE: Visits]
      summary: Fetches website visits metrics
      description: Get visits data.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_website_visits, est_web_website_visitors, est_web_website_visits_per_visitor]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, brand_id, brand_category_id, date, device, region]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [day, week, month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter by.
        - in: query
          name: devices
          schema:
            type: array
            items:
              type: string
              enum: [desktop, mobile]
          description: Array of device types to filter by (comma-separated).
        - in: query
          name: entities
          schema:
            type: array
            items:
              type: string
          description: Comma-separated list of entity enrichments to include in the response.
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        brand_id:
                          type: integer
                          example: 541
                        brand_category_id:
                          type: integer
                          example: 2040
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_website_visits:
                          type: integer
                          example: 1699845423
                        est_web_website_visitors:
                          type: integer
                        est_web_website_visits_per_visitor:
                          type: number
                  entities:
                    type: object
                    properties:
                      brand_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google Search"
                      brand_category_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Utilities"

  # ─── PERFORMANCE: Duration ───

  /v1/facets/metrics?website_duration:
    get:
      tags: [PERFORMANCE: Duration]
      summary: Fetches website duration metrics
      description: Get duration data.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_website_duration, est_web_website_duration_per_visitor]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, brand_id, brand_category_id, date, device, region]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [day, week, month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter by.
        - in: query
          name: devices
          schema:
            type: array
            items:
              type: string
              enum: [desktop, mobile]
          description: Array of device types to filter by (comma-separated).
        - in: query
          name: entities
          schema:
            type: array
            items:
              type: string
          description: Comma-separated list of entity enrichments to include in the response.
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        brand_id:
                          type: integer
                          example: 541
                        brand_category_id:
                          type: integer
                          example: 2040
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_website_duration:
                          type: number
                          example: 4157.136489
                        est_web_website_duration_per_visitor:
                          type: number
                  meta:
                    type: object
                    properties:
                      limit:
                        type: integer
                        example: 25
                      offset:
                        type: integer
                        example: 0
                      total_count:
                        type: integer
                        example: 4
                  entities:
                    type: object
                    properties:
                      brand_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google Search"
                      brand_category_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Utilities"

  # ─── PERFORMANCE: Device Overlap ───

  /v1/facets/metrics?website_device_overlap:
    get:
      tags: [PERFORMANCE: Device Overlap]
      summary: Fetches website visitors metrics
      description: Get overlap visitors data for website and app.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_website_true_audience_visitors, est_web_website_only_visitors, est_web_app_only_visitors, est_web_website_and_app_visitors]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, unified_app_id, brand_id, brand_category_id, date]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter by.
        - in: query
          name: entities
          schema:
            type: array
            items:
              type: string
          description: Comma-separated list of entity enrichments to include in the response.
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        unified_app_id:
                          type: string
                          example: "55c501ca02ac64f9c0001f4b"
                        brand_id:
                          type: integer
                          example: 541
                        brand_category_id:
                          type: integer
                          example: 2040
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_website_true_audience_visitors:
                          type: integer
                          example: 391290307
                        est_web_website_only_visitors:
                          type: integer
                        est_web_app_only_visitors:
                          type: integer
                        est_web_website_and_app_visitors:
                          type: integer
                  entities:
                    type: object
                    properties:
                      brand_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google Search"
                      brand_category_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Utilities"
                      unified_app_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google"
                            icon_url:
                              type: string

  # ─── USER JOURNEY: Traffic Channels ───

  /v1/facets/metrics?website_traffic_channels:
    get:
      tags: [USER JOURNEY: Traffic Channels]
      summary: Fetches traffic channels metrics
      description: Get traffic channels data.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_website_direct_visits, est_web_website_direct_visits_share, est_web_website_email_visits, est_web_website_email_visits_share, est_web_website_social_visits, est_web_website_social_visits_share, est_web_website_paid_visits, est_web_website_paid_visits_share, est_web_website_organic_search_visits, est_web_website_organic_search_visits_share, est_web_website_gen_ai_visits, est_web_website_gen_ai_visits_share]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, brand_id, brand_category_id, date]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter by.
        - in: query
          name: entities
          schema:
            type: array
            items:
              type: string
          description: Comma-separated list of entity enrichments to include in the response.
        - in: query
          name: order_by
          schema:
            type: array
            items:
              type: string
          description: Array of metrics and direction to order by (metric:direction).
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        brand_id:
                          type: integer
                          example: 541
                        brand_category_id:
                          type: integer
                          example: 2040
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_website_direct_visits:
                          type: integer
                          example: 57861623765
                        est_web_website_direct_visits_share:
                          type: number
                        est_web_website_email_visits:
                          type: integer
                        est_web_website_email_visits_share:
                          type: number
                        est_web_website_social_visits:
                          type: integer
                        est_web_website_social_visits_share:
                          type: number
                        est_web_website_paid_visits:
                          type: integer
                        est_web_website_paid_visits_share:
                          type: number
                        est_web_website_organic_search_visits:
                          type: integer
                        est_web_website_organic_search_visits_share:
                          type: number
                        est_web_website_gen_ai_visits:
                          type: integer
                        est_web_website_gen_ai_visits_share:
                          type: number
                  meta:
                    type: object
                    properties:
                      limit:
                        type: integer
                        example: 25
                      offset:
                        type: integer
                        example: 0
                      total_count:
                        type: integer
                        example: 2
                  entities:
                    type: object
                    properties:
                      brand_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Google Search"
                      brand_category_id:
                        type: object
                        additionalProperties:
                          type: object
                          properties:
                            name:
                              type: string
                              example: "Utilities"

  # ─── USER JOURNEY: Traffic Flow ───

  /v1/facets/metrics?website_traffic_flow:
    get:
      tags: [USER JOURNEY: Traffic Flow]
      summary: Fetches traffic flow metrics
      description: Get traffic flow data for website.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_traffic_visits, est_web_traffic_share]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, pair_unified_website_id, traffic_type, date]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: traffic_types
          schema:
            type: array
            items:
              type: string
              enum: [inbound, outbound]
          description: Traffic types to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter.
        - in: query
          name: brand_category_ids
          schema:
            type: array
            items:
              type: integer
          description: Array of brand category IDs to filter by.
        - in: query
          name: limit
          schema:
            type: integer
          description: Limit of number of websites to return (max 200).
        - in: query
          name: offset
          schema:
            type: integer
          description: Offset.
        - in: query
          name: order_by
          schema:
            type: array
            items:
              type: string
          description: Array of metrics and direction to order by (metric:direction).
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "reddit.com"
                        pair_unified_website_id:
                          type: string
                          example: "youtube.com"
                        traffic_type:
                          type: string
                          example: "outbound"
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_traffic_visits:
                          type: integer
                          example: 2326448530
                        est_web_traffic_share:
                          type: number
                  meta:
                    type: object
                    properties:
                      limit:
                        type: integer
                        example: 5
                      offset:
                        type: integer
                        example: 0
                      total_count:
                        type: integer
                        example: 4002

  # ─── USER JOURNEY: Top Paths ───

  /v1/facets/metrics?website_top_paths:
    get:
      tags: [USER JOURNEY: Top Paths]
      summary: Fetches website paths metrics
      description: Get website top paths data for website.
      parameters:
        - in: query
          name: metric
          required: true
          schema:
            type: string
            enum: [est_web_path_visits, est_web_path_visitors, est_web_path_duration, est_web_path_visits_path_share, est_web_path_duration_path_share, est_web_path_visitors_path_share]
          description: The metric to retrieve data for.
        - in: query
          name: breakdown
          required: true
          schema:
            type: array
            items:
              type: string
              enum: [unified_website_id, website_path_id, date]
          description: How to break down the data (comma-separated for breakdown by multiple fields).
        - in: query
          name: date_granularity
          required: true
          schema:
            type: string
            enum: [month]
          description: Date granularity for the data.
        - in: query
          name: start_date
          required: true
          schema:
            type: string
            format: date
          description: Start date for the data range. YYYY-MM-DD format.
        - in: query
          name: end_date
          required: true
          schema:
            type: string
            format: date
          description: End date for the data range. YYYY-MM-DD format.
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
          description: Regions to filter by (comma-separated).
        - in: query
          name: unified_website_ids
          schema:
            type: array
            items:
              type: string
          description: Array of website IDs to filter.
        - in: query
          name: unified_website_path_types
          schema:
            type: array
            items:
              type: string
              enum: [starts_with, exact]
          description: Array of path types to filter by.
        - in: query
          name: limit
          schema:
            type: integer
          description: Limit of number of websites to return (max 200).
        - in: query
          name: offset
          schema:
            type: integer
          description: Offset.
        - in: query
          name: order_by
          schema:
            type: array
            items:
              type: string
          description: Array of metrics and direction to order by (metric:direction).
      responses:
        '200':
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
                        unified_website_id:
                          type: string
                          example: "google.com"
                        website_path_id:
                          type: string
                          example: "/*"
                        date:
                          type: string
                          format: date
                          example: "2025-01-01"
                        est_web_path_visits:
                          type: integer
                          example: 53181830923
                        est_web_path_visitors:
                          type: integer
                        est_web_path_duration:
                          type: integer
                        est_web_path_visits_path_share:
                          type: number
                        est_web_path_visitors_path_share:
                          type: number
                        est_web_path_duration_path_share:
                          type: number
                  meta:
                    type: object
                    properties:
                      limit:
                        type: integer
                        example: 25
                      offset:
                        type: integer
                        example: 0
                      total_count:
                        type: integer
                        example: 44
