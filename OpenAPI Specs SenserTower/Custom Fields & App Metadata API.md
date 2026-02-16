openapi: 3.0.3
info:
  title: SensorTower Custom Fields & App Metadata (extracted)
  version: "1.0"

servers:
  - url: https://api.sensortower.com

paths:

  # ─── APP AND PUBLISHER METADATA: App and Publisher Metadata ───

  /v1/{os}/apps/app_ids:
    get:
      tags: [APP AND PUBLISHER METADATA - App and Publisher Metadata]
      summary: Fetches app IDs from a given release/updated date in a particular category
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
          name: start_date
          schema:
            type: string
            format: date
        - in: query
          name: updated_date
          schema:
            type: string
            format: date
        - in: query
          name: offset
          schema:
            type: integer
        - in: query
          name: limit
          schema:
            type: integer
            default: 10000
      responses:
        "200":
          description: Success

  /v1/{os}/publisher/publisher_apps:
    get:
      tags: [APP AND PUBLISHER METADATA - App and Publisher Metadata]
      summary: Fetches apps for a particular publisher
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android]
        - in: query
          name: publisher_id
          required: true
          schema:
            type: string
        - in: query
          name: limit
          schema:
            type: integer
            maximum: 100
        - in: query
          name: offset
          schema:
            type: integer
        - in: query
          name: include_count
          schema:
            type: boolean
      responses:
        "200":
          description: Success

  /v1/unified/publishers/apps:
    get:
      tags: [APP AND PUBLISHER METADATA - App and Publisher Metadata]
      summary: Fetches unified publisher and all of its apps
      parameters:
        - in: query
          name: unified_id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/unified/apps:
    get:
      tags: [APP AND PUBLISHER METADATA - App and Publisher Metadata]
      summary: Fetches iOS/Android app IDs of unified apps
      parameters:
        - in: query
          name: app_id_type
          required: true
          schema:
            type: string
            enum: [unified, itunes, android]
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  /v1/unified/publishers:
    get:
      tags: [APP AND PUBLISHER METADATA - App and Publisher Metadata]
      summary: Fetches iOS/Android publisher IDs for unified publishers
      parameters:
        - in: query
          name: publisher_id_type
          required: true
          schema:
            type: string
            enum: [unified, itunes, android]
        - in: query
          name: publisher_ids
          required: true
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  # ─── APP AND PUBLISHER METADATA: Search Entities ───

  /v1/{os}/search_entities:
    get:
      tags: [APP AND PUBLISHER METADATA - Search Entities]
      summary: Find apps or publishers from a search term
      parameters:
        - in: path
          name: os
          required: true
          schema:
            type: string
            enum: [ios, android, both_stores, unified]
        - in: query
          name: entity_type
          required: true
          schema:
            type: string
            enum: [app, publisher]
        - in: query
          name: term
          required: true
          schema:
            type: string
        - in: query
          name: limit
          schema:
            type: integer
            maximum: 250
      responses:
        "200":
          description: Success

  # ─── CUSTOM FIELDS: Retrieve Custom Fields Data ───

  /v1/app_tag/tags_for_apps:
    get:
      tags: [CUSTOM FIELDS - Retrieve Custom Fields Data]
      summary: Fetches global or custom fields and tag values of apps
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: field_categories[]
          schema:
            type: array
            items:
              type: string
              enum:
                - active_users
                - advertising
                - app_content
                - app_metadata
                - app_ratings
                - app_release_and_updates
                - custom_fields
                - demographics
                - developer_integrations
                - downloads
                - gaming
                - monetization
                - publisher_details
                - retention
                - revenue
        - in: query
          name: fields[]
          schema:
            type: array
            items:
              type: string
      responses:
        "200":
          description: Success

  /v1/app_tag/apps:
    get:
      tags: [CUSTOM FIELDS - Retrieve Custom Fields Data]
      summary: Fetches apps of a particular global or custom field and tag value
      parameters:
        - in: query
          name: app_id_type
          required: true
          schema:
            type: string
            enum: [itunes, android, unified]
        - in: query
          name: custom_fields_filter_id
          schema:
            type: string
        - in: query
          name: name
          schema:
            type: string
        - in: query
          name: value
          schema:
            type: string
        - in: query
          name: global
          schema:
            type: boolean
        - in: query
          name: last_known_id
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/custom_field/custom_field_list:
    get:
      tags: [CUSTOM FIELDS - Retrieve Custom Fields Data]
      summary: Fetches global or custom fields and app tags with summarized app counts
      parameters:
        - in: query
          name: os
          schema:
            type: string
            enum: [itunes, android, all]
      responses:
        "200":
          description: Success

  # ─── CUSTOM FIELDS: Edit Custom Fields Data ───

  /v1/app_tag/add_tag_for_app:
    post:
      tags: [CUSTOM FIELDS - Edit Custom Fields Data]
      summary: Add a tag to a custom field
      parameters:
        - in: query
          name: app_id
          required: true
          schema:
            type: string
        - in: query
          name: name
          required: true
          schema:
            type: string
        - in: query
          name: value
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/app_tag/edit_tag:
    post:
      tags: [CUSTOM FIELDS - Edit Custom Fields Data]
      summary: Edit a tag from a custom field
      parameters:
        - in: query
          name: app_id
          required: true
          schema:
            type: string
        - in: query
          name: name
          required: true
          schema:
            type: string
        - in: query
          name: value
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/app_tag/remove_tag_for_app:
    post:
      tags: [CUSTOM FIELDS - Edit Custom Fields Data]
      summary: Remove tag from a custom field
      parameters:
        - in: query
          name: app_ids
          required: true
          schema:
            type: array
            items:
              type: string
        - in: query
          name: name
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/custom_field/change_all_values_matching:
    post:
      tags: [CUSTOM FIELDS - Edit Custom Fields Data]
      summary: Change all tags matching a value to a new value
      parameters:
        - in: query
          name: name
          required: true
          schema:
            type: string
        - in: query
          name: old_tag_value
          required: true
          schema:
            type: string
        - in: query
          name: new_tag_value
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/custom_field/remove_custom_field:
    post:
      tags: [CUSTOM FIELDS - Edit Custom Fields Data]
      summary: Remove a custom field
      parameters:
        - in: query
          name: name
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  # ─── CUSTOM FIELDS: Custom Fields Filter ID ───

  /v1/custom_fields_filter:
    post:
      tags: [CUSTOM FIELDS - Custom Fields Filter ID]
      summary: Create a custom fields filter
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                custom_fields:
                  type: array
                  items:
                    type: object
                    properties:
                      exclude:
                        type: boolean
                      global:
                        type: boolean
                      name:
                        type: string
                      values:
                        type: array
                        items:
                          type: string
      responses:
        "200":
          description: Success

  /v1/custom_fields_filter/{id}:
    get:
      tags: [CUSTOM FIELDS - Custom Fields Filter ID]
      summary: Show custom fields for a custom filter ID
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success

  /v1/custom_fields_filter/fields_values:
    get:
      tags: [CUSTOM FIELDS - Custom Fields Filter ID]
      summary: List all custom fields values
      parameters:
        - in: query
          name: term
          schema:
            type: string
      responses:
        "200":
          description: Success
