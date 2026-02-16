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
        authToken: process.env.SENSORTOWER_AUTH_TOKEN || "",
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
    console.log("Testing sensortower_app_snapshot with 'Subway Surfer'...\n");

    if (!process.env.SENSORTOWER_AUTH_TOKEN) {
        console.error("❌ SENSORTOWER_AUTH_TOKEN environment variable is not set!");
        console.error("Please set it with: export SENSORTOWER_AUTH_TOKEN='your-token-here'");
        process.exit(1);
    }

    const tool = createSensorTowerAppSnapshotTool(mockApi);

    try {
        const result = await tool.execute("test-id", {
            app_query: "Subway Surfer",
        });

        console.log("✅ Tool execution completed!\n");
        console.log("=== RESULT ===");
        console.log(JSON.stringify(result.details, null, 2));

        // Check if description fields are present
        const details = result.details as any;
        console.log("\n=== DESCRIPTION FIELDS CHECK ===");
        console.log("subtitleOrShortDescription:", details?.metadata?.subtitleOrShortDescription || "❌ MISSING");
        console.log("longDescription:", details?.metadata?.longDescription || "❌ MISSING");
        console.log("languages:", details?.metadata?.languages || "❌ MISSING");

    } catch (error) {
        console.error("❌ Error executing tool:");
        console.error(error);
        process.exit(1);
    }
}

main();
