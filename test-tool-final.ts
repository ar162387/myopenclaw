#!/usr/bin/env tsx
import { createSensorTowerAppSnapshotTool } from "./extensions/sensortower-aso/src/sensortower-app-snapshot-tool.js";
import type { OpenClawPluginApi } from "./src/plugins/types.js";

// Mock API object
const mockApi: OpenClawPluginApi = {
    id: "sensortower-aso",
    name: "Sensor Tower",
    source: "test",
    config: {},
    pluginConfig: {
        authToken: "ST0_FYKBEQRH_ygzviczambPZi2",
        requestsPerMinute: 6,
    },
    runtime: { version: "test" } as any,
    logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    },
    registerTool() { },
    registerHttpHandler() { },
    registerChannel() { },
    registerGatewayMethod() { },
    registerCli() { },
    registerService() { },
    registerProvider() { },
    registerHook() { },
    registerHttpRoute() { },
    registerCommand() { },
    on() { },
    resolvePath: (p) => p,
};

async function main() {
    console.log("=".repeat(80));
    console.log("Testing sensortower_app_snapshot with 'Subway Surfer'");
    console.log("=".repeat(80));

    const tool = createSensorTowerAppSnapshotTool(mockApi);

    try {
        const result = await tool.execute("test-id", {
            app_query: "Subway Surfer",
        });

        console.log("\n✅ Tool execution completed!\n");

        const details = result.details as any;

        console.log("=== METADATA CHECK ===");
        console.log(`App Name: ${details?.appName || "❌ MISSING"}`);
        console.log(`Unified App ID: ${details?.unifiedAppId || "❌ MISSING"}`);
        console.log(`\nSubtitle/Short Description: ${details?.metadata?.subtitleOrShortDescription || "❌ MISSING"}`);
        console.log(`Long Description: ${details?.metadata?.longDescription ? `✅ PRESENT (${details.metadata.longDescription.length} chars)` : "❌ MISSING"}`);
        console.log(`Languages: ${details?.metadata?.languages?.length > 0 ? `✅ PRESENT (${details.metadata.languages.join(", ")})` : "❌ MISSING"}`);

        console.log("\n=== METRICS CHECK ===");
        console.log(`Overall Revenue: ${details?.metrics?.overall?.revenueWwEstimate || "❌ MISSING"}`);
        console.log(`Overall Downloads: ${details?.metrics?.overall?.downloadsWwEstimate || "❌ MISSING"}`);
        console.log(`Overall RDP: ${details?.metrics?.overall?.rdpWwEstimate || "❌ MISSING"}`);
        console.log(`Last Month Downloads: ${details?.metrics?.lastMonth?.downloadsEstimate || "❌ MISSING"}`);
        console.log(`Last Month Revenue: ${details?.metrics?.lastMonth?.revenueEstimate || "❌ MISSING"}`);
        console.log(`Top Countries: ${details?.metrics?.lastMonth?.topCountriesByDownloads?.length || 0} countries`);

        if (details?.metadata?.longDescription) {
            console.log("\n=== LONG DESCRIPTION (first 200 chars) ===");
            console.log(details.metadata.longDescription.substring(0, 200) + "...");
        }

        console.log("\n" + "=".repeat(80));
        console.log("✅ TEST COMPLETE");
        console.log("=".repeat(80));

    } catch (error) {
        console.error("\n❌ Error executing tool:");
        console.error(error);
        process.exit(1);
    }
}

main();
