import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  createSensorTowerAppSalesDownloadsTool,
  createSensorTowerAppSnapshotTool,
} from "./src/sensortower-app-snapshot-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createSensorTowerAppSnapshotTool(api), { optional: true });
  api.registerTool(createSensorTowerAppSalesDownloadsTool(api), { optional: true });
}
