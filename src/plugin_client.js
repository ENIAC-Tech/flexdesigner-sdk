// plugin_client.js
// This file handles plugin-side WebSocket logic.
const WebSocket = require('ws');
const PluginCommand = require('./plugin_command');
const defaultLogger = require('./logger');
const logger = defaultLogger.child({ scope: 'PluginClient' });
const minimist = require('minimist');

class PluginClient {
  constructor() {
    this.serverUrl = ''; // Will be set in the start method
    this.ws = null;
    this.handlers = {};    // For on(type, handler)
    this.pendingCalls = {}; 
  }

  /**
   * Starts the WebSocket connection by extracting port and uid from command-line arguments
   */
  start() {
    const { port, uid, dir } = this._parseCommandLineArgs();
    if (!port || !uid || !dir) {
      console.error('Usage: node plugin_client.js --port=<port> --uid=<uid> --dir=<dir>');
      process.exit(1);
    }

    logger.info(`Starting plugin client with port ${port}, uid ${uid} and dir ${dir}`);

    this.serverUrl = `ws://localhost:${port}`;
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      logger.info(`Connected to server at ${this.serverUrl}`);
      const initCmd = new PluginCommand('startup', {
        pluginID: uid,
      });
      logger.debug(`Sending init command: ${initCmd.toString()}`);
      this.ws.send(JSON.stringify(initCmd.toJSON()));
    });

    this.ws.on('message', (msg) => {
      this._handleMessage(msg);
    });

    this.ws.on('close', () => {
      logger.warn('Connection closed');
      process.exit(0);
    });

    this.ws.on('error', (err) => {
      logger.error(`WebSocket error: ${err.message}`);
      process.exit(0);
    });
  }

  /**
   * Parses command-line arguments to extract port, uid, and dir.
   * Supports:
   *   --port=8080 --uid=12345 --dir=/some/path
   *   -p 8080 -u 12345 -d /some/path
   * @returns {Object} An object containing port, uid, dir
   */
  _parseCommandLineArgs() {
    const argv = minimist(process.argv.slice(2), {
      alias: {
        p: 'port',
        u: 'uid',
        d: 'dir'
      }
    });

    return {
      port: argv.port,
      uid: argv.uid,
      dir: argv.dir
    };
  }

  /**
   * Sends a request to the server
   * @param {Object} payload - The payload of the request
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Resolves with the response payload or rejects with an error
   */
  call(payload, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const cmd = new PluginCommand('plugin-message', payload);
      this.pendingCalls[cmd.uuid] = {
        resolve,
        reject,
        timer: setTimeout(() => {
          delete this.pendingCalls[cmd.uuid];
          reject(new Error('Request timed out'));
        }, timeout)
      };
      this.ws.send(JSON.stringify(cmd.toJSON()));
    });
  }

  /**
   * Registers a handler for incoming messages of a specific type
   * @param {string} type - The type of the message to handle
   * @param {Function} handler - The handler function
   */
  on(type, handler) {
    this.handlers[type] = handler;
  }

  /**
   * Unregisters a handler for a specific message type
   * @param {string} type - The type of the message
   */
  off(type) {
    delete this.handlers[type];
  }

  /**
   * Handles incoming WebSocket messages
   * @param {string} msg - The received message
   */
  _handleMessage(msg) {
    let cmd;
    msg = msg.toString('utf8');
    try {
      cmd = PluginCommand.fromJSON(msg);
      logger.debug(`Received message: ${cmd.toString()}`);
    } catch (e) {
      logger.error(`Invalid message format: ${msg}`);
      return;
    }

    // If it's a response to a call()
    if (this.pendingCalls[cmd.uuid]) {
      const { resolve, reject, timer } = this.pendingCalls[cmd.uuid];
      clearTimeout(timer);
      delete this.pendingCalls[cmd.uuid];

      if (cmd.status === 'success') resolve(cmd.payload);
      else reject(new Error(cmd.payload || 'Unknown error'));
      return;
    }

    // If it's a broadcast or direct send
    const handler = this.handlers[cmd.type];
    if (handler) {
      const result = handler(cmd.payload);
      const response = new PluginCommand('response', result, cmd.uuid, 'success');
      this.ws.send(JSON.stringify(response.toJSON()));
    }
  }
}

/**
 * pluginClient is the singleton instance of PluginClient.
 */
const pluginClient = new PluginClient();

module.exports = pluginClient;
