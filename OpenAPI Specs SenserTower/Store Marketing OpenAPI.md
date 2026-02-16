openapi: 3.0.3
info:
  title: SensorTower Store Marketing (extracted)
  version: "1.0"

servers:
  - url: https://api.sensortower.com

paths:

  # ─── APP STORE OPTIMIZATION: Keyword Rankings ───

  /v1/{os}/keywords/keywords:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Rankings]
      summary: Fetches keyword rankings for an app
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
          schema:
            type: string
        - in: query
          name: date
          schema:
            type: string
            format: date
        - in: query
          name: limit
          schema:
            type: integer
      responses:
        "200":
          description: Success

  /v1/{os}/keywords/get_current_keywords:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Rankings]
      summary: Fetches current keyword rankings for an app
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
      responses:
        "200":
          description: Success

  # ─── APP STORE OPTIMIZATION: Keyword Research ───

  /v1/{os}/keywords/research_keyword:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Research]
      summary: Fetches keyword research data for a search term
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: search_terms
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
          name: app_id
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/ios/keywords/search_suggestions:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Research]
      summary: Fetches keyword search suggestions
      parameters:
        - in: query
          name: term
          required: true
          schema:
            type: string
        - in: query
          name: country
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/ios/keywords/trending_searches:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Research]
      summary: Fetches trending keyword searches
      parameters:
        - in: query
          name: country
          schema:
            type: string
      responses:
        "200":
          description: Success

  # ─── APP STORE OPTIMIZATION: Keyword Overview ───

  /v1/{os}/keywords/overview/history:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Overview]
      summary: Fetches keyword overview history for an app
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
          schema:
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

  # ─── APP STORE OPTIMIZATION: Keyword Downloads ───

  /v1/{os}/keywords/downloads/history:
    get:
      tags: [APP STORE OPTIMIZATION - Keyword Downloads]
      summary: Fetches keyword download history
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
          name: search_terms[]
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

  # ─── APP STORE OPTIMIZATION: Traffic Score ───

  /v1/{os}/keywords/traffic:
    get:
      tags: [APP STORE OPTIMIZATION - Traffic Score]
      summary: Fetches keyword traffic scores
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
        - in: query
          name: date
          schema:
            type: string
            format: date
        - in: query
          name: traffic_score
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  /v1/{os}/keywords/traffic_history:
    get:
      tags: [APP STORE OPTIMIZATION - Traffic Score]
      summary: Fetches traffic score history
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
          name: terms
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

  # ─── APP STORE OPTIMIZATION: User Apps ───

  /v1/ios/ajax/user_apps:
    get:
      tags: [APP STORE OPTIMIZATION - User Apps]
      summary: Fetches user's tracked apps
      parameters:
        - in: query
          name: username
          required: true
          schema:
            type: string
        - in: query
          name: user_app_id
          schema:
            type: string
        - in: query
          name: display_untracked_keywords
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  # ─── FEATURED: Featured Today ───

  /v1/ios/featured/today/stories:
    get:
      tags: [FEATURED - Featured Today]
      summary: Fetch featured today stories
      parameters:
        - in: query
          name: country
          schema:
            type: string
            default: US
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

  # ─── FEATURED: Featured Apps and Games ───

  /v1/ios/featured/apps:
    get:
      tags: [FEATURED - Featured Apps and Games]
      summary: Fetch featured apps & games
      parameters:
        - in: query
          name: category
          required: true
          schema:
            type: string
        - in: query
          name: country
          schema:
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

  # ─── FEATURED: Featured App Rankings ───

  /v1/{os}/featured/creatives:
    get:
      tags: [FEATURED - Featured App Rankings]
      summary: Featured creatives & placements for an app
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
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: types
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

  /v1/{os}/featured/impacts:
    get:
      tags: [FEATURED - Featured App Rankings]
      summary: Feature occurrences & download impact
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
          name: countries
          schema:
            type: array
            items:
              type: string
        - in: query
          name: types
          schema:
            type: array
            items:
              type: string
        - in: query
          name: breakdown
          schema:
            type: string
            enum: [country, type]
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

  # ─── RATINGS & REVIEWS: Rating Analysis ───

  /v1/{os}/review/get_ratings:
    get:
      tags: [RATINGS & REVIEWS - Rating Analysis]
      summary: Fetches rating data for an app
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
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/{os}/review/app_history_summary:
    get:
      tags: [RATINGS & REVIEWS - Rating Analysis]
      summary: Fetches rating history summary for an app
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
          schema:
            type: string
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [daily, weekly, monthly]
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

  /v1/facets/metrics?ratings:
    get:
      tags: [RATINGS & REVIEWS - Rating Analysis]
      summary: Fetches rating metrics via facets
      description: Get rating metrics for mobile apps including total count, star-level breakdowns, and averages.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [ratings_incremental, ratings_cumulative]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [app_id, "app_id,date", region, "region,date", app_version]
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: regions
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
          name: android_localized_estimates
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  # ─── RATINGS & REVIEWS: Review Analysis ───

  /v1/{os}/review/get_reviews:
    get:
      tags: [RATINGS & REVIEWS - Review Analysis]
      summary: Fetches reviews for an app
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
          schema:
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
          name: rating_filter
          schema:
            type: string
        - in: query
          name: review_keywords
          schema:
            type: string
        - in: query
          name: languages
          schema:
            type: array
            items:
              type: string
        - in: query
          name: versions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: sentiments
          schema:
            type: array
            items:
              type: string
        - in: query
          name: tags
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

  /v1/facets/metrics?reviews_by_rating:
    get:
      tags: [RATINGS & REVIEWS - Review Analysis]
      summary: Fetches review metrics by rating via facets
      description: Get review metrics for mobile apps with star rating breakdown including total count, rating averages, and per-rating breakdowns.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [reviews_by_rating]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [review_rating, "date,review_rating", "region,review_rating", "language,review_rating", "app_version,review_rating"]
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: app_ids
          required: true
          schema:
            type: string
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: languages
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
          name: review_keywords
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_sentiments
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_tags
          schema:
            type: array
            items:
              type: string
        - in: query
          name: search_terms
          schema:
            type: array
            items:
              type: string
        - in: query
          name: rating_filters
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  /v1/facets/metrics?reviews_by_sentiment:
    get:
      tags: [RATINGS & REVIEWS - Review Analysis]
      summary: Fetches review metrics by sentiment via facets
      description: Get review metrics for mobile apps with sentiment breakdown including total count and per-sentiment breakdowns.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [reviews_by_sentiment]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [review_sentiment, "date,review_sentiment", "region,review_sentiment", "language,review_sentiment", "app_version,review_sentiment"]
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: app_ids
          required: true
          schema:
            type: string
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: languages
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
          name: review_keywords
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_sentiments
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_tags
          schema:
            type: array
            items:
              type: string
        - in: query
          name: search_terms
          schema:
            type: array
            items:
              type: string
        - in: query
          name: rating_filters
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  /v1/facets/metrics?reviews_by_tag:
    get:
      tags: [RATINGS & REVIEWS - Review Analysis]
      summary: Fetches review metrics by tag via facets
      description: Get review metrics for mobile apps with tag breakdown including total count and per-tag breakdowns.
      parameters:
        - in: query
          name: bundle
          required: true
          schema:
            type: string
            enum: [reviews_by_tag]
        - in: query
          name: breakdown
          required: true
          schema:
            type: string
            enum: [review_tag, "date,review_tag", "language,review_tag", "region,review_tag", "app_version,review_tag"]
        - in: query
          name: date_granularity
          schema:
            type: string
            enum: [day, week, month]
        - in: query
          name: app_ids
          required: true
          schema:
            type: string
        - in: query
          name: regions
          schema:
            type: array
            items:
              type: string
        - in: query
          name: languages
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
          name: review_keywords
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_sentiments
          schema:
            type: array
            items:
              type: string
        - in: query
          name: review_tags
          schema:
            type: array
            items:
              type: string
        - in: query
          name: search_terms
          schema:
            type: array
            items:
              type: string
        - in: query
          name: rating_filters
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  # ─── SEARCH ADS: Apple Search Ads ───

  /v1/ios/search_ads/apps:
    get:
      tags: [SEARCH ADS - Apple Search Ads]
      summary: Fetches Apple Search Ads app data
      description: Retrieve a list of apps that have Search Ads for the given keyword, along with its current share of voice for that keyword.
      parameters:
        - in: query
          name: term
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

  /v1/ios/search_ads/terms:
    get:
      tags: [SEARCH ADS - Apple Search Ads]
      summary: Fetches Apple Search Ads keyword terms
      description: Retrieve a list of keywords that the given app has Search Ads for, along with its share of voice for the selected date range.
      parameters:
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

  /v1/ios/search_ads/history:
    get:
      tags: [SEARCH ADS - Apple Search Ads]
      summary: Fetches Apple Search Ads history data
      description: Retrieve historical share of voice information for the given apps and term, broken down by date.
      parameters:
        - in: query
          name: app_id
          required: true
          schema:
            type: string
        - in: query
          name: term
          required: true
          schema:
            type: string
        - in: query
          name: country
          required: true
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
