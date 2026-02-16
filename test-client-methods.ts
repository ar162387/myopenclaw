#!/usr/bin/env tsx
import { SensorTowerClient } from "./extensions/sensortower-aso/src/client.js";

const client = new SensorTowerClient({
    authToken: "ST0_FYKBEQRH_ygzviczambPZi2",
    baseUrl: "https://api.sensortower.com",
    authMode: "query",
    requestsPerMinute: 6,
    timeoutMs: 30000,
    defaultMetadataOs: "unified",
    defaultCountry: "US",
    defaultTopCountriesLimit: 5,
    allTimeFallbackStartDate: "2014-01-01",
    endpoints: {
        searchEntities: "/v1/unified/search_entities",
        appDetails: "/v1/{os}/apps",
        salesReport: "/v1/{os}/sales_report_estimates",
        unifiedSalesReport: "/v1/unified/sales_report_estimates",
    },
});

async function test() {
    console.log("Testing resolveUnifiedAppIds for foodpanda...\n");

    const unifiedId = "5379a8a1830f782dbe005957";
    const resolved = await client.resolveUnifiedAppIds(unifiedId);

    console.log("Resolved IDs:");
    console.log("  iOS App ID:", resolved.iosAppId);
    console.log("  Android App ID:", resolved.androidAppId);
    console.log("");

    if (resolved.iosAppId) {
        console.log("Fetching iOS app details...");
        const details = await client.getAppDetails({
            appId: resolved.iosAppId,
            os: "ios",
        });

        console.log("iOS App Details:");
        console.log("  App ID:", details?.app_id);
        console.log("  Subtitle:", details?.subtitle);
        console.log("  Description length:", details?.description?.length || 0);
        console.log("  Supported Languages:", details?.supported_languages);
    }
}

test().catch(console.error);
