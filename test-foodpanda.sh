#!/bin/bash
# Quick test to verify foodpanda now returns languages

TOKEN="ST0_FYKBEQRH_ygzviczambPZi2"
UNIFIED_ID="5379a8a1830f782dbe005957"

echo "Testing foodpanda language fix..."
echo "=================================="
echo ""

echo "1. Resolving unified ID to iOS..."
IOS_ID=$(curl -s -G "https://api.sensortower.com/v1/unified/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_id_type=unified" \
  --data-urlencode "app_ids=$UNIFIED_ID" | jq -r '.apps[0].itunes_apps[0].app_id')

echo "   iOS App ID: $IOS_ID"
echo ""

echo "2. Fetching iOS app details..."
curl -s -G "https://api.sensortower.com/v1/ios/apps" \
  --data-urlencode "auth_token=$TOKEN" \
  --data-urlencode "app_ids=$IOS_ID" \
  --data-urlencode "country=US" | jq '{
    subtitle,
    description_length: (.description | length),
    languages_count: (.supported_languages | length),
    languages: .supported_languages
  }'

echo ""
echo "=================================="
echo "✅ Expected: 16 languages"
echo "✅ The tool should now return these languages!"
