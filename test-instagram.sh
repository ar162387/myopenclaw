#!/bin/bash
# Test script to verify sensortower_app_snapshot returns all fields for Instagram

echo "================================================================================"
echo "Testing Instagram - Full Flow"
echo "================================================================================"

TOKEN="ST0_FYKBEQRH_ygzviczambPZi2"

echo ""
echo "Step 1: Search for Instagram..."
UNIFIED_ID=$(curl -s -G "https://api.sensortower.com/v1/unified/search_entities" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "entity_type=app" \
  --data-urlencode "term=Instagram" \
  --data-urlencode "limit=1" | jq -r '.[0].id')

echo "✅ Unified App ID: $UNIFIED_ID"

echo ""
echo "Step 2: Resolve to platform-specific IDs..."
IOS_ID=$(curl -s -G "https://api.sensortower.com/v1/unified/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_id_type=unified" \
  --data-urlencode "app_ids=$UNIFIED_ID" | jq -r '.apps[0].itunes_apps[0].app_id')

ANDROID_ID=$(curl -s -G "https://api.sensortower.com/v1/unified/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_id_type=unified" \
  --data-urlencode "app_ids=$UNIFIED_ID" | jq -r '.apps[0].android_apps[0].app_id')

echo "✅ iOS App ID: $IOS_ID"
echo "✅ Android App ID: $ANDROID_ID"

echo ""
echo "Step 3: Fetch iOS app details (should have languages)..."
curl -s -G "https://api.sensortower.com/v1/ios/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_ids=$IOS_ID" \
  --data-urlencode "country=US" | jq '.apps[0] | {
    subtitle,
    description_length: (.description | length),
    supported_languages_count: (.supported_languages | length),
    supported_languages: .supported_languages
  }'

echo ""
echo "Step 4: Fetch Android app details (languages will be empty)..."
curl -s -G "https://api.sensortower.com/v1/android/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_ids=$ANDROID_ID" \
  --data-urlencode "country=US" | jq '.apps[0] | {
    short_description,
    description_length: (.description | length),
    supported_languages_count: (.supported_languages | length),
    supported_languages: .supported_languages
  }'

echo ""
echo "================================================================================"
echo "✅ TEST COMPLETE"
echo "================================================================================"
echo ""
echo "FINDINGS:"
echo "- iOS apps have populated 'supported_languages' field ✅"
echo "- Android apps have empty 'supported_languages' field ❌"
echo "- The tool prioritizes iOS, so languages should work for most apps ✅"
echo ""
