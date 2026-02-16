#!/usr/bin/env tsx
/**
 * Diagnostic script to test Sensor Tower API and see raw responses
 * This will help identify what fields are actually returned by the API
 */

const SENSORTOWER_AUTH_TOKEN = process.env.SENSORTOWER_AUTH_TOKEN || "ST0_FYKBEQRH_ygzviczambPZi2";

if (!SENSORTOWER_AUTH_TOKEN) {
    console.error("❌ SENSORTOWER_AUTH_TOKEN environment variable is not set!");
    console.error("Please set it with: export SENSORTOWER_AUTH_TOKEN='your-token-here'");
    process.exit(1);
}

const BASE_URL = "https://api.sensortower.com";

async function makeRequest(endpoint: string, params: Record<string, string>) {
    const url = new URL(endpoint, BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    url.searchParams.set("auth_token", SENSORTOWER_AUTH_TOKEN);

    console.log(`\n🔍 Requesting: ${url.pathname}`);
    console.log(`   Params: ${JSON.stringify(params, null, 2)}`);

    const response = await fetch(url.toString());

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
}

async function main() {
    console.log("=".repeat(80));
    console.log("SENSOR TOWER API DIAGNOSTIC TEST - Subway Surfer");
    console.log("=".repeat(80));

    try {
        // Step 1: Search for "Subway Surfer"
        console.log("\n📍 STEP 1: Searching for 'Subway Surfer'...");
        const searchResults = await makeRequest("/v1/unified/search_entities", {
            entity_type: "app",
            term: "Subway Surfer",
            limit: "3",
        });

        console.log("\n✅ Search Results:");
        console.log(JSON.stringify(searchResults, null, 2));

        if (!Array.isArray(searchResults) || searchResults.length === 0) {
            console.error("\n❌ No results found for 'Subway Surfer'");
            process.exit(1);
        }

        const firstApp = searchResults[0];
        const unifiedAppId = firstApp.$id || firstApp.unified_app_id || firstApp.app_id;
        const appName = firstApp.name;

        console.log(`\n✅ Found app: ${appName}`);
        console.log(`   Unified App ID: ${unifiedAppId}`);

        // Step 2: Resolve to platform-specific IDs
        console.log("\n📍 STEP 2: Resolving to platform-specific IDs...");
        const resolvedIds = await makeRequest("/v1/unified/apps", {
            app_id_type: "unified",
            app_ids: unifiedAppId,
        });

        console.log("\n✅ Resolved IDs:");
        console.log(JSON.stringify(resolvedIds, null, 2));

        const appsData = resolvedIds?.apps?.[0];
        const iosAppId = appsData?.itunes_apps?.[0]?.app_id;
        const androidAppId = appsData?.android_apps?.[0]?.app_id;

        console.log(`\n   iOS App ID: ${iosAppId || "N/A"}`);
        console.log(`   Android App ID: ${androidAppId || "N/A"}`);

        // Step 3: Get iOS app details (if available)
        if (iosAppId) {
            console.log("\n📍 STEP 3: Fetching iOS app details...");
            const iosDetails = await makeRequest("/v1/ios/apps", {
                app_ids: iosAppId,
                country: "US",
            });

            console.log("\n✅ iOS App Details:");
            console.log(JSON.stringify(iosDetails, null, 2));

            // Check for description fields
            const details = Array.isArray(iosDetails) ? iosDetails[0] : iosDetails;
            console.log("\n🔍 DESCRIPTION FIELDS CHECK:");
            console.log(`   subtitle: ${details?.subtitle ? "✅ PRESENT" : "❌ MISSING"}`);
            console.log(`   short_description: ${details?.short_description ? "✅ PRESENT" : "❌ MISSING"}`);
            console.log(`   description: ${details?.description ? "✅ PRESENT" : "❌ MISSING"}`);
            console.log(`   languages: ${details?.languages ? "✅ PRESENT" : "❌ MISSING"}`);

            if (details?.subtitle) console.log(`\n   Subtitle value: "${details.subtitle}"`);
            if (details?.description) console.log(`\n   Description (first 200 chars): "${details.description.substring(0, 200)}..."`);
        }

        // Step 4: Get Android app details (if available)
        if (androidAppId) {
            console.log("\n📍 STEP 4: Fetching Android app details...");
            const androidDetails = await makeRequest("/v1/android/apps", {
                app_ids: androidAppId,
                country: "US",
            });

            console.log("\n✅ Android App Details:");
            console.log(JSON.stringify(androidDetails, null, 2));

            // Check for description fields
            const details = Array.isArray(androidDetails) ? androidDetails[0] : androidDetails;
            console.log("\n🔍 DESCRIPTION FIELDS CHECK:");
            console.log(`   short_description: ${details?.short_description ? "✅ PRESENT" : "❌ MISSING"}`);
            console.log(`   description: ${details?.description ? "✅ PRESENT" : "❌ MISSING"}`);
            console.log(`   languages: ${details?.languages ? "✅ PRESENT" : "❌ MISSING"}`);

            if (details?.short_description) console.log(`\n   Short Description: "${details.short_description}"`);
            if (details?.description) console.log(`\n   Description (first 200 chars): "${details.description.substring(0, 200)}..."`);
        }

        console.log("\n" + "=".repeat(80));
        console.log("✅ DIAGNOSTIC TEST COMPLETE");
        console.log("=".repeat(80));

    } catch (error) {
        console.error("\n❌ Error during diagnostic test:");
        console.error(error);
        process.exit(1);
    }
}

main();
