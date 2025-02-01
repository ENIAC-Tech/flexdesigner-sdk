const plugin = require("./plugin_client");
const logger = require("./logger");
const { fileURLToPath } = require('url');

const resourcesPath = fileURLToPath(new URL('../resources', import.meta.url));
const pluginPath = fileURLToPath(new URL('../', import.meta.url));

module.exports = { plugin, logger, resourcesPath, pluginPath };