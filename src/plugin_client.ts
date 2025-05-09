// plugin_client.js
// This file handles plugin-side WebSocket logic.

import WebSocket from 'ws';
import PluginCommand from './plugin_command';
import defaultLogger from './logger';
const logger = defaultLogger.child({ scope: 'plugin' });
const uiLogger = defaultLogger.child({ scope: 'UI' });
import minimist from 'minimist';

/**
 * @brief Plugin client class for managing WebSocket connections and interactions with the server.
 *
 * Detailed description:
 * This class manages the connection to the WebSocket server, sends commands, 
 * and handles responses. It also allows registering message handlers for specific
 * message types.
 */
class Plugin {

  serverUrl: string;
  ws: WebSocket | null;
  handlers: Array<Function>;
  pendingCalls: any;
  uuid: string;
  directory: string;
  port: number;

  /**
   * @brief Constructor for the Plugin class.
   */
  constructor() {
    this.serverUrl = ''; // Will be set in the start method
    this.ws = null;
    this.handlers = [];    // For on(type, handler)
    this.pendingCalls = {};
    this.uuid = '',
      this.directory = '',
      this.port = 0;
  }

  /**
   * @brief Starts the WebSocket connection by extracting port and uid from command-line arguments.
   *
   * Detailed description:
   * The method parses the command-line arguments for `port`, `uid`, and `dir` options, 
   * and uses them to establish a WebSocket connection with the server. It sends an
   * initial "startup" command once connected.
   *
   * @throws {Error} If port, uid, or dir are not provided in the command-line arguments.
   * @return {void}
   */
  start() {
    const { port, uid, dir } = this._parseCommandLineArgs();
    if (!port || !uid || !dir) {
      console.error(`Usage: node plugin_client.js --port=<port> --uid=<uid> --dir=<dir>, Args: ${JSON.stringify(process.argv.slice(2))}`);
      process.exit(1);
    }

    logger.info(`Starting plugin client with port ${port}, uid ${uid} and dir ${dir}`);

    this.port = port;
    this.uuid = uid;
    this.directory = dir;

    this.serverUrl = `ws://localhost:${port}`;
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      logger.info(`Connected to server at ${this.serverUrl}`);
      const initCmd = new PluginCommand(this.uuid, 'startup', {
        pluginID: this.uuid,
      });
      logger.debug(`Sending init command: ${initCmd.toString()}`);
      this.ws.send(JSON.stringify(initCmd.toJSON()));
    });

    this.ws.on('message', (msg: WebSocket.Data) => {
      this._handleMessage(msg).catch((err) => {
        logger.error(`Error handling message: ${err.message}`);
      });
    });

    this.ws.on('close', () => {
      logger.warn('Connection closed');
      // Retry connection
      logger.info('Retrying connection in 5 seconds...');
      setTimeout(() => {
        this.start();
      }, 5000);
    });

    this.ws.on('error', (err) => {
      logger.error(`WebSocket error: ${err.message}`);
      // Retry connection
      logger.info('Retrying connection in 5 seconds...');
      setTimeout(() => {
        this.start();
      }, 5000);
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
   * @brief Parses command-line arguments to extract port, uid, and dir.
   *
   * Detailed description:
   * This method uses the `minimist` library to parse command-line arguments, 
   * returning an object with `port`, `uid`, and `dir` properties.
   *
   * @returns {Object} An object containing the parsed arguments:
   * ```
   * {
   *   port: <number|string>, 
   *   uid: <string>, 
   *   dir: <string>
   * }
   * ```
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
   * @brief Sends a request to the server with a specific command and payload.
   *
   * Detailed description:
   * The method creates a `PluginCommand` and sends it via WebSocket. 
   * It also sets a timeout to reject the request if no response is received.
   *
   * @param {string} command - The command to send to the server.
   * @param {Object} payload - The payload to send along with the command.
   * @param {number} timeout - The timeout in milliseconds before rejecting the request. Default is 5000 ms.
   * @returns {Promise<any>} A promise that resolves with the response payload or rejects with an error.
   */
  _call(command: string, payload: Object, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const cmd = new PluginCommand(this.uuid, command, payload);
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
   * @brief Handles incoming WebSocket messages.
   *
   * Detailed description:
   * The method processes messages from the server, checking if they are 
   * responses to previous requests, or if they are broadcasts that need to be handled 
   * by registered message handlers.
   *
   * @param {string} msg - The received message in string format.
   * @returns {void}
   */
  async _handleMessage(msg: string): Promise<void> {
    let cmd: PluginCommand;
    msg = msg.toString();
    try {
      cmd = PluginCommand.fromJSON(msg);
      // logger.debug(`Received message: ${cmd.toString()}`);
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
      else reject(new Error(`Request failed: ${cmd.error || 'Unknown error'}, Command: ${cmd.toString()}`));
      return;
    }

    // If it's a broadcast or direct send
    const handler = this.handlers[cmd.type];
    if (handler) {
      const result = await handler(cmd.payload);
      const response = new PluginCommand(this.uuid, 'response', result, cmd.uuid, 'success');
      this.ws.send(JSON.stringify(response.toJSON()));
    }
  }

  /**
   * @brief Registers a handler for incoming messages of a specific type.
   *
   * Detailed description:
   * This method allows the registration of handlers for specific message types, 
   * which are invoked when a message of that type is received from the server.
   *
   * @param {string} type - The message type to handle.
   * @param {Function} handler - The handler function that processes the message payload.
   * @returns {void}
   */
  on(type: string, handler: Function): void {
    this.handlers[type] = handler;
  }

  /**
   * @brief Unregisters a handler for a specific message type.
   *
   * @param {string} type - The message type to unregister the handler for.
   * @returns {void}
   */
  off(type) {
    delete this.handlers[type];
  }

  /**
   * @brief Draw an image on a key.
   *
   * Detailed description:
   * This method sends a draw command to the server, allowing the image data in 
   * base64 format to be drawn on the specified key.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `device.newPage` or `device.userData`.
   * @param {string} type - The type of drawing operation. Possible values:
   * ```
   * "draw" | "base64"
   * ```
   * @param {string} [base64=null] - The base64 image data. Only used if `type` is "base64".
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  draw(serialNumber: string, key: Object, type: string = 'draw', base64: string = null): Promise<any> {
    return this._call('draw', {
      serialNumber,
      type,
      key,
      base64
    });
  }

  /**
   * @brief Send chart data for performance monitoring.
   *
   * Detailed description:
   * This method sends an array of performance metrics to be displayed in custom charts.
   * Each chart data object contains information about a specific metric including its 
   * current value, unit, and display formatting.
   *
   * @param {Array<Object>} chartDataArray - An array of chart data objects with the following structure:
   *   ```
   *   {
   *     label: string,       // Display name of the metric
   *     value: number|string, // Current value of the metric
   *     unit: string,        // Unit of measurement (e.g., FPS, %, GB, ℃)
   *     baseUnit: string,    // Base unit for conversion calculations
   *     baseVal: number|string, // Raw value before formatting
   *     maxLen: number,      // Maximum length for display formatting (1-4)
   *     category: string,    // Category grouping (e.g., CPU, GPU, MEMORY, OTHER)
   *     key: string,         // Unique identifier for the metric
   *     icon?: string        // MDI icon name without 'mdi-' prefix (e.g., 'chevron-triple-right'). Search in https://pictogrammers.com/library/mdi/
   *   }
   *   ```
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  sendChartData(chartDataArray: Array<{
    label: string,
    value: number | string,
    unit: string,
    baseUnit: string,
    baseVal: number | string,
    maxLen: number,
    category: string,
    key: string,
    icon?: string
  }>): Promise<any> {
    return this._call('custom-chart-data', {
      data: chartDataArray
    });
  }

  /**
   * @brief Update shortcuts.
   *
   * Detailed description:
   * This method sends a command to update the shortcuts.
   * 
   * Shortcut values can be referenced from https://www.electronjs.org/docs/latest/api/accelerator
   *
   * @param {Array<Object>} shortcuts - The shortcuts to update.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  updateShortcuts(shortcuts: Array<{
    shortcut: string,
    action: string, // 'register' | 'unregister'
  }>): Promise<any> {
    return this._call('update-shortcuts', { shortcuts });
  }

  /**
   * @brief Set data for a specific key.
   *
   * Detailed description:
   * This method sends a command to update the state or value of a specified key 
   * based on the key type. It supports "multiState" and "slider" key types.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `device.newPage` or `device.userData`.
   * @param {Object} data - The data to set on the key. The format of `data` depends on the key type:
   *   - For "multiState" keys: 
   *   ```
   *   {
   *     state: <Number>,
   *     message: <String> (optional)
   *   }
   *   ```
   *   - For "slider" keys:
   *   ```
   *   {
   *     value: <Number>
   *   }
   *   ```
   * @throws {Error} If the provided data is invalid for the given key type.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  set(serialNumber, key, data) {
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
      serialNumber,
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
   * @return {Promise<any>} A promise that resolves with the response.
   */
  showSnackbarMessage(color, message, timeout = 3000) {
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
   * @returns {Promise<any>} A promise that resolves exactly as the Electron API returns
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
   * @returns {Promise<Object>} A promise that resolves with the app info in JSON format:
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
   * @returns {Promise<string|Buffer>} A promise that resolves with the file content
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
   * @returns {Promise<Object>} A promise that resolves with the result in JSON format:
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
   * @returns {Promise<Object[]>} A promise that resolves to an array of window objects, for example:
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
   * @returns {Promise<Object>} A promise that resolves to a JSON object, for example:
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

  /**
   * @brief Get the plugin configuration.
   * 
   * @returns {Promise<Object>} A promise that resolves to the plugin configuration object.
   * @throws {Error} Throws an error if the call fails
   */
  getConfig() {
    return this._call(
      "api-call",
      {
        api: "getPluginConfig",
        pluginID: this.uuid,
      },
      0
    );
  }

  /**
   * @brief Set the plugin configuration.
   * 
   * @param {Object} config The plugin configuration object.
   * @returns {Promise<Object>} A promise that resolves to the result { status: 'success' | 'error }.
   * @throws {Error} Throws an error if the call fails
   */
  setConfig(config) {
    return this._call(
      "api-call",
      {
        api: "setPluginConfig",
        pluginID: this.uuid,
        config
      },
      0
    );
  }
}

/**
 * @brief The singleton instance of the plugin.
 *
 * This is the main entry point for interacting with the Plugin class. All methods
 * on the Plugin class are accessible through this instance.
 */
const plugin: Plugin = new Plugin();

export default plugin;
