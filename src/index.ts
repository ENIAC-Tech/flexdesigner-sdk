import plugin from "./plugin_client";
import logger from "./logger";
import { fileURLToPath } from "url";

const resourcesPath = fileURLToPath(new URL('../resources', import.meta.url));
const pluginPath = fileURLToPath(new URL('../', import.meta.url));

export { plugin, logger, resourcesPath, pluginPath };