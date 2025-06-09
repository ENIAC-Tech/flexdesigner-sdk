// This file provides the API for plugins.

import defaultLogger from './logger.js';
import PluginTransport from './transport.js';
import type * as Types from './types.js'

const logger = defaultLogger.child({ scope: 'plugin' });
const uiLogger = defaultLogger.child({ scope: 'UI' });
import minimist from 'minimist';

/**
 * @brief Dynamic key management class for handling dynamic key operations.
 *
 * Detailed description:
 * This class provides methods to manage dynamic keys including adding, removing,
 * moving, and drawing operations. It communicates with the server through the
 * parent plugin instance using the "dynamic-plugin" command.
 */
class DynamicKey {

  private transport: PluginTransport;

  /**
   * @brief Constructor for the DynamicKey class.
   *
   * @param {PluginTransport} transport - The plugin transport.
   */
  constructor(transport: PluginTransport) {
    this.transport = transport;
  }

  /**
   * @brief Clear all dynamic keys for a specific key.
   *
   * Detailed description:
   * This method removes all dynamic keys associated with the specified key,
   * effectively resetting the key to its initial state.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  clear(serialNumber: string, key: Object): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'clear',
      serialNumber,
      key
    });
  }

  /**
   * @brief Add a new dynamic key at the specified index.
   *
   * Detailed description:
   * This method adds a new dynamic key with the specified background and user data.
   * The key will be inserted at the given index position.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} addToIndex - The index position where the new key should be added.
   * @param {string} backgroundType - The type of background. Possible values:
   * ```
   * "base64" | "draw"
   * ```
   * @param {string} backgroundData - The background data (base64 image string for "base64" type), or the draw data for "draw" type.
   * @param {number} width - The width of the dynamic key in pixels, from 60 to 1000.
   * @param {Object} userData - Additional user data to associate with the key. This data will be sent to the plugin when the key is pressed.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  add(serialNumber: string, key: Object, addToIndex: number, backgroundType: string, backgroundData: string, width: number, userData: Object): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'add',
      serialNumber,
      backgroundType: backgroundType,
      key: key,
      index: addToIndex,
      width: width,
      backgroundData: backgroundData,
      userData: userData
    });
  }

  /**
   * @brief Remove a dynamic key at the specified index.
   *
   * Detailed description:
   * This method removes the dynamic key located at the specified index position.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} index - The index of the dynamic key to remove.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  remove(serialNumber: string, key: Object, index: number): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'remove',
      serialNumber,
      key,
      index: index
    });
  }

  /**
   * @brief Set the width of the parent key container.
   *
   * Detailed description:
   * This method updates the width property of the parent key, affecting how
   * the dynamic keys are displayed within the container.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} width - The new width in pixels for the parent key container.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  setWidth(serialNumber: string, key: Object, width: number): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'set',
      serialNumber,
      key,
      data: {
        width: width
      }
    });
  }

  /**
   * @brief Move a dynamic key from one position to another.
   *
   * Detailed description:
   * This method moves a dynamic key from the source index to the destination index,
   * reordering the keys within the container.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} srcIndex - The current index of the key to move.
   * @param {number} dstIndex - The target index where the key should be moved.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  move(serialNumber: string, key: Object, srcIndex: number, dstIndex: number): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'move',
      serialNumber,
      key,
      srcIndex: srcIndex,
      dstIndex: dstIndex
    });
  }

  /**
   * @brief Draw or update the background of a specific dynamic key.
   *
   * Detailed description:
   * This method updates the visual appearance of a dynamic key at the specified index
   * by changing its background image or drawing content.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} index - The index of the dynamic key to update.
   * @param {string} backgroundType - The type of background. Possible values:
   * ```
   * "base64" | "draw"
   * ```
   * @param {string} backgroundData - The background data (base64 image string for "base64" type).
   * @param {number} width - The width of the dynamic key in pixels.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  draw(serialNumber: string, key: Object, index: number, backgroundType: string, backgroundData: string, width: number): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'draw',
      serialNumber,
      backgroundType: backgroundType,
      key: key,
      index: index,
      width: width,
      backgroundData: backgroundData
    });
  }

  /**
   * @brief Update user data for a specific dynamic key.
   *
   * Detailed description:
   * This method updates the user data associated with a dynamic key at the specified index.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} index - The index of the dynamic key to update.
   * @param {Object} userData - The new user data to associate with the key.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  update(serialNumber: string, key: Object, index: number, userData: Object): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'update',
      serialNumber,
      key,
      index: index,
      userData: userData
    });
  }

  /**
   * @brief Refresh the dynamic key.
   *
   * Detailed description:
   * This method refreshes the dynamic key.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  refresh(serialNumber: string, key: Object): Promise<any> {
    return this.transport.call("dynamic-plugin", {
      cmd: 'refresh',
      serialNumber,
      key
    });
  }
}

/**
 * @brief Plugin client class for managing WebSocket connections and interactions with the server.
 *
 * Detailed description:
 * This class manages the connection to the WebSocket server, sends commands, 
 * and handles responses. It also allows registering message handlers for specific
 * message types.
 */
class Plugin {

  uuid: string;
  directory: string;
  port: number;
  transport: PluginTransport;
  dynamickey: DynamicKey;

  /**
   * @brief Constructor for the Plugin class.
   */
  constructor() {
    const argv = minimist(process.argv.slice(2));
    this.uuid = argv.uid;
    this.directory = argv.dir;
    this.port = parseInt(argv.port);

    if (!this.uuid || !this.directory || !this.port) {
      console.error(`Usage: node plugin_client.js --port=<port> --uid=<uid> --dir=<dir>, Args: ${JSON.stringify(process.argv.slice(2))}`);
      process.exit(1);
    }

    this.transport = new PluginTransport(this.uuid, this.port);
    this.dynamickey = new DynamicKey(this.transport);
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
   */
  start(): void {
    logger.info(`Starting plugin client with dir ${this.directory}`);

    // Register default handlers
    this.on('ui.log', (payload) => {
      try {
        uiLogger[payload.level](payload.msg);
      } catch (error) {
        logger.warn(`Invalid log level: ${payload.level}, message: ${payload.msg}`);
      }
    })

    this.transport.start();
  }

  on(type: "plugin.alive", handler: (message: Types.PluginAlivePayload) => void): void;
  on(type: "plugin.data", handler: (message: Types.PluginDataPayload) => void): void;
  on(type: "plugin.config.updated", handler: (message: Types.PluginConfigUpdatedPayload) => void): void;

  on(type: "ui.log", handler: (message: Types.UiLogPayload) => void): void;
  on(type: "system.shortcut", handler: (message: Types.SystemShortcutPayload) => void): void;
  on(type: "device.status", handler: (message: Array<Types.DeviceStatusPayloadItem>) => void): void;

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
  on(type: string, handler: (message: any) => any): void;

  on(type: string, handler: Function): void {
    this.transport.on(type, handler);
  }

  /**
   * @brief Unregisters a handler for a specific message type.
   *
   * @param {string} type - The message type to unregister the handler for.
   * @returns {void}
   */
  off(type: string): void {
    this.transport.off(type);
  }

  /**
   * @brief Update the visual on a key based on `key.style`.
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `device.newPage` or `device.userData`.
   * @param type - Use literal "draw" or just don't fill this field.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  draw(serialNumber: string, key: Types.KeyData, type?: 'draw'): Promise<any> ;

  /**
   * @brief Draw an image on a key.
   *
   * Detailed description:
   * This method sends a draw command to the server, allowing the image data in 
   * base64 format to be drawn on the specified key.
   *
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param type - Use literal "base64".
   * @param {string} base64 - The image data as a data URL in PNG. e.g. "data:image/png;base64,iVBORw0KGg..."
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  draw(serialNumber: string, key: Types.KeyData, type: 'base64', base64: string): Promise<any> ;

  draw(serialNumber: string, key: Types.KeyData, type = 'draw', base64: string = null): Promise<any> {
    return this.transport.call('draw', {
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
   * @param {Array<Types.ChartDataItem>} chartDataArray - An array of chart data objects. See comments in `ChartDataItem` for details.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  sendChartData(chartDataArray: Array<Types.ChartDataItem>): Promise<any> {
    return this.transport.call('custom-chart-data', {
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
   * @param {string} msg - The message content to display (required).
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
  showFlexbarSnackbarMessage(serialNumber: string, msg: string, level: Types.MessageLevel, icon?: Types.Icon, timeout: number = 2000, waitUser: boolean = false): Promise<any> {
    // Constants for validation
    const allowedLevels = ['info', 'warning', 'error', 'success'];

    const allowedIcons = [
      'audio',
      'video',
      'list',
      'ok',
      'close',
      'power',
      'settings',
      'home',
      'download',
      'drive',
      'refresh',
      'mute',
      'volume_mid',
      'volume_max',
      'image',
      'tint',
      'prev',
      'play',
      'pause',
      'stop',
      'next',
      'eject',
      'left',
      'right',
      'plus',
      'minus',
      'eye_open',
      'eye_close',
      'warning',
      'shuffle',
      'up',
      'down',
      'loop',
      'directory',
      'upload',
      'call',
      'cut',
      'copy',
      'save',
      'bars',
      'envelope',
      'charge',
      'paste',
      'bell',
      'keyboard',
      'gps',
      'file',
      'wifi',
      'battery_full',
      'battery_3',
      'battery_2',
      'battery_1',
      'battery_empty',
      'usb',
      'bluetooth',
      'trash',
      'edit',
      'backspace',
      'sd_card',
      'new_line',
      'dummy'
    ]

    // Validate required parameters
    if (!msg || typeof msg !== 'string' || msg.length > 64) {
      throw new Error('Message is required and must be a string with length < 64');
    }

    if (!level || typeof level !== 'string') {
      throw new Error('Level is required and must be a string');
    }

    // Validate level
    if (!allowedLevels.includes(level)) {
      throw new Error(`Invalid level. Must be one of: ${allowedLevels.join(', ')}`);
    }

    // Validate icon if provided
    if (icon !== undefined && !allowedIcons.includes(icon)) {
      throw new Error(`Invalid icon. Must be one of: ${allowedIcons.join(', ')}`);
    }

    // Validate timeout range
    if (timeout < 500 || timeout > 10000) {
      throw new Error('Timeout must be between 500 and 10000 milliseconds');
    }

    // Prepare the payload
    const payload: any = {
      serialNumber,
      msg,
      level,
      timeout,
      waitUser
    };

    // Add icon if provided
    if (icon !== undefined) {
      payload.icon = icon;
    }

    return this.transport.call('show-snackbar-message', payload);
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
  updateShortcuts(shortcuts: Array<Types.ShortcutRegisterItem>): Promise<any> {
    return this.transport.call('update-shortcuts', { shortcuts });
  }

  /**
   * @brief Set the state for a multistate key.
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} state - The next state.
   * @param {string?} message - Optional message to display on the bar.
   * @throws {Error} If the provided data is invalid for the given key type.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  setMultiState(serialNumber: string, key: Types.KeyData, state: number, message?: string) {
    if (key.cfg.keyType !== 'multiState') {
      throw new Error(`Invalid key type: ${key.cfg.keyType}`);
    }
    return this.transport.call('set', {
      serialNumber,
      key,
      data: { state, message }
    });
  }

  /**
   * @brief Set the value for a slider key.
   * @param {string} serialNumber - The serial number of the device.
   * @param {Object} key - The key object received from the event `plugin.data` or `plugin.alive`.
   * @param {number} value - The slider value to set.
   * @throws {Error} If the provided data is invalid for the given key type.
   * @returns {Promise<any>} A promise that resolves with the server response.
   */
  setSlider(serialNumber: string, key: Types.KeyData, value: number) {
    if (key.cfg.keyType !== 'slider') {
      throw new Error(`Invalid key type: ${key.cfg.keyType}`);
    }
    return this.transport.call('set', {
      serialNumber,
      key,
      data: { value }
    });
  }

  /**
   * @deprecated Use `setMultiState` or `setSlider` depending on key type
   */
  set(serialNumber: string, key: Types.KeyData, data: object) {
    return this.transport.call('set', {
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
  showSnackbarMessage(color: string, message: string, timeout: number = 3000) {
    return this.transport.call('ui-operation', {
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
  electronAPI(api: string, ...args) {
    return this.transport.call(
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
  getAppInfo(): Promise<Types.AppInfoResponse> {
    return this.transport.call(
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
    return this.transport.call(
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
    return this.transport.call(
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
   * @returns {Promise<Array<Types.DesktopWindow>>} A promise that resolves to an array of window objects.
   * @throws {Error} Throws an error if the call fails
   */
  getOpenedWindows(): Promise<Array<Types.DesktopWindow>> {
    return this.transport.call(
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
   * @returns {Promise<Array<Types.DeviceStatusResponseItem>>} A promise that resolves to a JSON object.
   * @throws {Error} Throws an error if the call fails
   */
  getDeviceStatus(): Promise<Array<Types.DeviceStatusResponseItem>> {
    return this.transport.call(
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
   * @param {Types.DeviceConfigInput} config Device configuration object. See comments in `DeviceConfigInput` for details.
   * @returns {Promise<any>} Promise that resolves with the result
   */
  setDeviceConfig(serialNumber: string, config: Types.DeviceConfigInput): Promise<any> {
    return this.transport.call('device-config', {
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
    return this.transport.call(
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
    return this.transport.call(
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
