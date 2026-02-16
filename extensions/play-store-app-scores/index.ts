import type { OpenClawPluginApi } from "../../src/plugins/types.js";
import { createPlayStoreAppScoresTool } from "./src/play-store-app-scores-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createPlayStoreAppScoresTool(api), { optional: true });
}
