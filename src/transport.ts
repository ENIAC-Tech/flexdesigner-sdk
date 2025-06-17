// This file handles plugin-side WebSocket transport logic.

import WebSocket from 'ws';
import defaultLogger from './logger.js';

const logger = defaultLogger.child({ scope: 'plugin' });
import { v4 as uuidv4 } from "uuid";

class PluginTransport {
  uuid: string;
  port: number;

  ws: WebSocket | null;
  handlers: {
    [type: string]: Function;
  };
  pendingCalls: {
    [uuid: string]: {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      timer: NodeJS.Timeout;
    }
  };

  /**
   * @brief Constructor for the Plugin class.
   */
  constructor(uuid: string, port: number) {
    this.uuid = uuid;
    this.port = port;

    this.ws = null;
    this.handlers = {};    // For on(type, handler)
    this.pendingCalls = {};
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
    logger.info(`Starting plugin transport with port ${this.port}, uid ${this.uuid}`);

    const serverUrl = `ws://localhost:${this.port}`;
    this.ws = new WebSocket(serverUrl);

    this.ws.on('open', () => {
      logger.info(`Connected to server at ${serverUrl}, Sending init command`);
      this._send('startup', { pluginID: this.uuid });
    });

    this.ws.on('message', (msg: string) => {
      this._handleMessage(msg).catch((err) => {
        logger.error(`Error handling message: ${err.message}`);
      });
    });

    this.ws.on('close', () => {
      logger.warn('Connection closed');
      // Retry connection
      logger.info('Retrying connection in 5 seconds...');
      setTimeout(this.start, 5000);
    });

    this.ws.on('error', (err) => {
      logger.error(`WebSocket error: ${err.message}`);
      // Retry connection
      logger.info('Retrying connection in 5 seconds...');
      setTimeout(this.start, 5000);
    });
  }

  _send(command: string, payload: object): string {
    const msg_uuid = uuidv4();
    const cmd: Command = {
      pluginID: this.uuid,
      type: command,
      payload: payload,
      timestamp: Date.now(),
      uuid: msg_uuid,
    }
    this.ws.send(JSON.stringify(cmd));
    return msg_uuid;
  }

  _sendResponse(uuid: string, result: object, status: string = "success"): void {
    const cmd = {
      pluginID: this.uuid,
      type: "response",
      payload: result,
      timestamp: Date.now(),
      uuid: uuid,
      status: status,
    }
    this.ws.send(JSON.stringify(cmd));
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
  call(command: string, payload: Object, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const uuid = this._send(command, payload);
      let timer: NodeJS.Timeout | null = null;
      if (timeout > 0) {
        timer = setTimeout(() => {
          delete this.pendingCalls[uuid];
          reject(new Error(`Request timed out, command: ${command}, payload: ${JSON.stringify(payload)}`));
        }, timeout);
      }
      this.pendingCalls[uuid] = { resolve, reject, timer };
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
    let cmd: Command;
    try {
      cmd = JSON.parse(msg);
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
      this._sendResponse(cmd.uuid, result)
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

}

interface Command {
  uuid: string;
  pluginID?: string;
  type?: string;
  payload?: object;
  timestamp?: number;
  status?: string;
  error?: string
}

export default PluginTransport;
