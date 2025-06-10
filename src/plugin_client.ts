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
   * @brief Show snackbar message on flexbar.
   *
   * Detailed description:
   * This method sends a command to show a snackbar message on flexbar with specified level and icon.
   * The message and level are required parameters, while other parameters are optional.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {string} message - The message content to display (required).
   * @param {string} level - The message level (required). Possible values:
   * ```
   * "info" | "warning" | "error" | "success"
   * ```
   * @param {string} [icon] - The icon to display (optional). Possible values:
   * ```
   * "audio" | "video" | "list" | "ok" | "close" | "power" | "settings" | "home" | 
   * "download" | "drive" | "refresh" | "mute" | "volume_mid" | "volume_max" | 
   * "image" | "tint" | "prev" | "play" | "pause" | "stop" | "next" | "eject" | 
   * "left" | "right" | "plus" | "minus" | "eye_open" | "eye_close" | "warning" | 
   * "shuffle" | "up" | "down" | "loop" | "directory" | "upload" | "call" | "cut" | 
   * "copy" | "save" | "bars" | "envelope" | "charge" | "paste" | "bell" | 
   * "keyboard" | "gps" | "file" | "wifi" | "battery_full" | "battery_3" | 
   * "battery_2" | "battery_1" | "battery_empty" | "usb" | "bluetooth" | "trash" | 
   * "edit" | "backspace" | "sd_card" | "new_line"
   * ```
   * @param {number} [timeout=2000] - Duration in milliseconds before hiding the message (optional, range: 500-10000).
   * @param {boolean} [waitUser=false] - Whether to wait for user interaction (optional).
   * @throws {Error} If message or level is not provided, or if level/icon/timeout values are invalid.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  showFlexbarSnackbarMessage(serialNumber: string, message: string, level: string, icon?: string, timeout: number = 2000, waitUser: boolean = false): Promise<any> {
    // Constants for validation
    const MSG_LEVEL = {
      info: 0,
      warning: 1,
      error: 2,
      success: 3,
    };

    const ICON = {
      audio: "\xEF\x80\x81",           /*61441, 0xF001*/
      video: "\xEF\x80\x88",           /*61448, 0xF008*/
      list: "\xEF\x80\x8B",            /*61451, 0xF00B*/
      ok: "\xEF\x80\x8C",              /*61452, 0xF00C*/
      close: "\xEF\x80\x8D",           /*61453, 0xF00D*/
      power: "\xEF\x80\x91",           /*61457, 0xF011*/
      settings: "\xEF\x80\x93",        /*61459, 0xF013*/
      home: "\xEF\x80\x95",            /*61461, 0xF015*/
      download: "\xEF\x80\x99",        /*61465, 0xF019*/
      drive: "\xEF\x80\x9C",           /*61468, 0xF01C*/
      refresh: "\xEF\x80\xA1",         /*61473, 0xF021*/
      mute: "\xEF\x80\xA6",            /*61478, 0xF026*/
      volume_mid: "\xEF\x80\xA7",      /*61479, 0xF027*/
      volume_max: "\xEF\x80\xA8",      /*61480, 0xF028*/
      image: "\xEF\x80\xBE",           /*61502, 0xF03E*/
      tint: "\xEF\x81\x83",            /*61507, 0xF043*/
      prev: "\xEF\x81\x88",            /*61512, 0xF048*/
      play: "\xEF\x81\x8B",            /*61515, 0xF04B*/
      pause: "\xEF\x81\x8C",           /*61516, 0xF04C*/
      stop: "\xEF\x81\x8D",            /*61517, 0xF04D*/
      next: "\xEF\x81\x91",            /*61521, 0xF051*/
      eject: "\xEF\x81\x92",           /*61522, 0xF052*/
      left: "\xEF\x81\x93",            /*61523, 0xF053*/
      right: "\xEF\x81\x94",           /*61524, 0xF054*/
      plus: "\xEF\x81\xA7",            /*61543, 0xF067*/
      minus: "\xEF\x81\xA8",           /*61544, 0xF068*/
      eye_open: "\xEF\x81\xAE",        /*61550, 0xF06E*/
      eye_close: "\xEF\x81\xB0",       /*61552, 0xF070*/
      warning: "\xEF\x81\xB1",         /*61553, 0xF071*/
      shuffle: "\xEF\x81\xB4",         /*61556, 0xF074*/
      up: "\xEF\x81\xB7",              /*61559, 0xF077*/
      down: "\xEF\x81\xB8",            /*61560, 0xF078*/
      loop: "\xEF\x81\xB9",            /*61561, 0xF079*/
      directory: "\xEF\x81\xBB",       /*61563, 0xF07B*/
      upload: "\xEF\x82\x93",          /*61587, 0xF093*/
      call: "\xEF\x82\x95",            /*61589, 0xF095*/
      cut: "\xEF\x83\x84",             /*61636, 0xF0C4*/
      copy: "\xEF\x83\x85",            /*61637, 0xF0C5*/
      save: "\xEF\x83\x87",            /*61639, 0xF0C7*/
      bars: "\xEF\x83\x89",            /*61641, 0xF0C9*/
      envelope: "\xEF\x83\xA0",        /*61664, 0xF0E0*/
      charge: "\xEF\x83\xA7",          /*61671, 0xF0E7*/
      paste: "\xEF\x83\xAA",           /*61674, 0xF0EA*/
      bell: "\xEF\x83\xB3",            /*61683, 0xF0F3*/
      keyboard: "\xEF\x84\x9C",        /*61724, 0xF11C*/
      gps: "\xEF\x84\xA4",             /*61732, 0xF124*/
      file: "\xEF\x85\x9B",            /*61787, 0xF158*/
      wifi: "\xEF\x87\xAB",            /*61931, 0xF1EB*/
      battery_full: "\xEF\x89\x80",    /*62016, 0xF240*/
      battery_3: "\xEF\x89\x81",       /*62017, 0xF241*/
      battery_2: "\xEF\x89\x82",       /*62018, 0xF242*/
      battery_1: "\xEF\x89\x83",       /*62019, 0xF243*/
      battery_empty: "\xEF\x89\x84",   /*62020, 0xF244*/
      usb: "\xEF\x8a\x87",             /*62087, 0xF287*/
      bluetooth: "\xEF\x8a\x93",       /*62099, 0xF293*/
      trash: "\xEF\x8B\xAD",           /*62189, 0xF2ED*/
      edit: "\xEF\x8C\x84",            /*62212, 0xF304*/
      backspace: "\xEF\x95\x9A",       /*62810, 0xF55A*/
      sd_card: "\xEF\x9F\x82",         /*63426, 0xF7C2*/
      new_line: "\xEF\xA2\xA2",        /*63650, 0xF8A2*/
      dummy: "\xEF\xA3\xBF"            /*Invalid symbol at (U+F8FF)*/
    };

    // Validate required parameters
    if (!message || typeof message !== 'string' || message.length > 64) {
      throw new Error('Message is required and must be a string with length < 64');
    }

    if (!level || typeof level !== 'string') {
      throw new Error('Level is required and must be a string');
    }

    // Validate level
    if (!(level in MSG_LEVEL)) {
      throw new Error(`Invalid level. Must be one of: ${Object.keys(MSG_LEVEL).join(', ')}`);
    }

    // Validate icon if provided
    if (icon !== undefined && !(icon in ICON)) {
      throw new Error(`Invalid icon. Must be one of: ${Object.keys(ICON).join(', ')}`);
    }

    // Validate timeout range
    if (timeout < 500 || timeout > 10000) {
      throw new Error('Timeout must be between 500 and 10000 milliseconds');
    }

    // Prepare the payload
    const payload: any = {
      serialNumber,
      message,
      level: MSG_LEVEL[level],
      timeout,
      waitUser
    };

    // Add icon if provided
    if (icon !== undefined) {
      payload.icon = ICON[icon];
    }

    return this._call('show-snackbar-message', payload);
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
   * @brief Set device configuration
   * 
   * @param {string} serialNumber - The serial number of the device
   * @param {Object} config Device configuration object that may contain:
   * - sleepTime: number (0 or 30-5999) - Sleep timeout in seconds
   * - brightness: number (0-100) - Screen brightness
   * - screenFlip: boolean - Whether to flip the screen
   * - vibrate: 'off' | 'partial' | 'full' - Vibration mode
   * - autoSleep: boolean - Whether to sleep together with computer sleep state
   * - deviceName: string (max 32 chars) - Device name
   * - cdcMode: boolean - CDC mode switch
   * - color: 'black' | 'silver' - Device color
   * @returns {Promise<any>} Promise that resolves with the result
   */
  setDeviceConfig(serialNumber: string, config: {
    sleepTime?: number,
    brightness?: number,
    screenFlip?: boolean,
    vibrate?: 'off' | 'partial' | 'full',
    autoSleep?: boolean,
    deviceName?: string,
    cdcMode?: boolean,
    color?: 'space black' | 'silver'
  }): Promise<any> {
    return this._call('device-config', {
      serialNumber,
      config
    });
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
