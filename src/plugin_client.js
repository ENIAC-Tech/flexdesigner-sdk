// plugin_client.js
// This file handles plugin-side WebSocket logic.
const WebSocket = require('ws');
const PluginCommand = require('./plugin_command');
const defaultLogger = require('./logger');
const logger = defaultLogger.child({ scope: 'plugin' });
const uiLogger = defaultLogger.child({ scope: 'UI' });
const minimist = require('minimist');

class Plugin {
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

    // Register default handlers
    this.on('ui.log', (payload) => {
      /*
      payload: {
        level: 'debug', 'info' | 'warn' | 'error',
        msg: 'Some message'
      } 
      */
      try {
        uiLogger[payload.level](payload.msg);
      } catch (error) {
        logger.warn(`Invalid log level: ${payload.level}, message: ${payload.msg}`);
      }
    })
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
   * @param {string} command - The command to send
   * @param {Object} payload - The payload of the request
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Resolves with the response payload or rejects with an error
   */
  _call(command, payload, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const cmd = new PluginCommand(command, payload);
      this.pendingCalls[cmd.uuid] = {
        resolve,
        reject,
        timer: null
      };
      if (timeout > 0) {
        this.pendingCalls[cmd.uuid].timer = setTimeout(() => {
          delete this.pendingCalls[cmd.uuid];
          reject(new Error(`Request timed out, command: ${command}, payload: ${JSON.stringify(payload)}`));
        }, timeout)
      }
      this.ws.send(JSON.stringify(cmd.toJSON()));
    });
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
      if (timer) {
        clearTimeout(timer);
      }
      delete this.pendingCalls[cmd.uuid];

      if (cmd.status === 'success') resolve(cmd.payload);
      else reject(new Error(cmd.error || 'Unknown error'));
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
   * Draw image on a key
   * 
   * @param {Object} key - The key object received from event device.newPage or device.userData
   * @param {string} type - 'draw' or 'base64'
   * @param {string} base64 - image data in base64 format
   * @returns Promise for the response
   */
  draw(key, type = 'draw', base64=null) {
    return this._call('draw', {
      type,
      key,
      base64
    });
  }

  /**
   * Set key data
   * 
   * @param {Object} key - The key object received from event device.newPage or device.userData
   * @param {Object} data - The data to set, should match with key type. can be one of the following:
   * Cycle/State Plugin Key
   * {
   *  state: Number
   *  message: String (optional, shown when state is updated)
   * }
   * 
   * Slider
   * {
   *  value: Number
   * }
   * @returns Promise for the response
   */
  set(key, data) {
    // validate data
    if (key.cfg?.keyType === 'multiState') {
      // state key
      if (!data.state && typeof data.state !== 'number') {
        throw new Error('Invalid state value, should be { state: Number }');
      }
    }
    else if (key.cfg?.keyType === 'slider') {
      // slider key
      if (!data.value && typeof data.value !== 'number') {
        throw new Error('Invalid value, should be { value: Number }');
      }
    }
    else {
      throw new Error('Invalid key type');
    }

    return this._call('set', {
      key,
      data
    });
  }

/**
 * @brief Show a snackbar message in the parent window.
 *
 * Detailed description:
 * Displays a transient message (snackbar) with a specified color and timeout.
 *
 * @param {string} color - The color type for the message. Possible values:
 * ```
 * "success" | "info" | "warning" | "error"
 * ```
 * @param {string} message - The message content to display
 * @param {number} [timeout=3000] - Duration in milliseconds before hiding the message
 * @return {void}
 */
  showSnackbarMessage(color, message, timeout=3000) {
    return this._call('ui-operation', {
      type: 'showSnackbarMessage',
      data: {
        color,
        message,
        timeout
      }
    });
  }

  
/**
 * @brief Call Electron API, see https://www.electronjs.org/docs/latest/api/app for details.
 *
 * Detailed description:
 * This function allows you to call various Electron APIs through a single interface.
 *
 * @param {string} api - The Electron API method to call. Possible values:
 * ```
 * dialog.showOpenDialog
 * dialog.showSaveDialog
 * dialog.showMessageBox
 * dialog.showErrorBox
 * app.getAppPath
 * app.getPath
 * screen.getCursorScreenPoint
 * screen.getPrimaryDisplay
 * screen.getAllDisplays
 * screen.getDisplayNearestPoint
 * screen.getDisplayMatching
 * screen.screenToDipPoint
 * screen.dipToScreenPoint
 * ```
 * @param {...any} args - Arguments to be passed to the Electron API call
 * @return {Promise<any>} A promise that resolves exactly as the Electron API returns
 * @throws {Error} Throws an error if the call fails
 */
  electronAPI(api, ...args) {
    return this._call(
      "api-call",
      {
        api: "callElectronAPI",
        args: { api, args },
      },
      0
    );
  }
  
 /**
 * @brief Get application information.
 *
 * Detailed description:
 * This function retrieves the application version and platform.
 *
 * @return {Promise<Object>} A promise that resolves with the app info in JSON format:
 * ```
 * {
 *   "version": "vX.X.X",
 *   "platform": "darwin | win32 | linux"
 * }
 * ```
 * @throws {Error} Throws an error if the call fails
 */
  getAppInfo() {
    return this._call(
      "api-call",
      {
        api: "getAppInfo",
        args: null,
      },
      0
    );
  }
  
/**
 * @brief Open a file from the given path.
 *
 * Detailed description:
 * Retrieves the file content if successful; otherwise throws an error.
 *
 * @param {string} path - The file path
 * @return {Promise<string|Buffer>} A promise that resolves with the file content
 * @throws {Error} Throws an error if file opening fails
 */
  openFile(path) {
    return this._call(
      "api-call",
      {
        api: "openFile",
        args: { path },
      },
      0
    );
  }
  
/**
 * @brief Save data to a specified file path.
 *
 * Detailed description:
 * Saves string or Buffer data to the provided file path and returns a status.
 *
 * @param {string} path - The file path
 * @param {string|Buffer} data - The file content
 * @return {Promise<Object>} A promise that resolves with the result in JSON format:
 * ```
 * {
 *   "status": "success" | "error",
 *   "error": "Error message if status is 'error'"
 * }
 * ```
 * @throws {Error} Throws an error if saving fails
 */
  saveFile(path, data) {
    return this._call(
      "api-call",
      {
        api: "pluginSaveFile",
        args: { path, data },
      },
      0
    );
  }
  
/**
 * @brief Get the list of opened windows.
 *
 * Detailed description:
 * Retrieves an array of window objects in JSON format, each containing details
 * such as `platform`, `id`, `title`, `owner`, `bounds`, and `memoryUsage`.
 *
 * @return {Promise<Object[]>} A promise that resolves to an array of window objects, for example:
 * ```
 * [
 *   {
 *     "platform": "windows",
 *     "id": 592082,
 *     "title": "Flexbar Designer",
 *     "owner": {
 *       "processId": 11860,
 *       "path": "Path to the executable",
 *       "name": "Flexbar Designer"
 *     },
 *     "bounds": {
 *       "x": 154,
 *       "y": 0,
 *       "width": 2252,
 *       "height": 1528
 *     },
 *     "memoryUsage": 188665856
 *   }
 * ]
 * ```
 * @throws {Error} Throws an error if the call fails
 */
  getOpenedWindows() {
    return this._call(
      "api-call",
      {
        api: "getOpenedWindows",
        args: null,
      },
      0
    );
  }
  
 /**
 * @brief Get the device status.
 *
 * Detailed description:
 * Returns a JSON object containing various status fields such as
 * `connecting`, `connected`, `serialNumber`, `platform`, `profileVersion`,
 * and `fwVersion`.
 *
 * @return {Promise<Object>} A promise that resolves to a JSON object, for example:
 * ```
 * {
 *   "connecting": true | false,
 *   "connected": true | false,
 *   "serialNumber": "XXXXXX",
 *   "platform": "win32 | darwin | linux",
 *   "profileVersion": "vX.X.X",
 *   "fwVersion": "vX.X.X"
 * }
 * ```
 * @throws {Error} Throws an error if the call fails
 */
  getDeviceStatus() {
    return this._call(
      "api-call",
      {
        api: "getDeviceStatus",
        args: null,
      },
      0
    );
  }

}

/**
 * plugin is the singleton instance of plugin.
 */
const plugin = new Plugin();

module.exports = plugin;
