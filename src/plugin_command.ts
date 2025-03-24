import { v4 as uuidv4 } from 'uuid';
// plugin_command.js
// This class represents a plugin command structure.

class PluginCommand {
  type: string;
  payload: object;
  timestamp: number;
  uuid: string;
  status: string;
  error: string

  /**
   * Constructor
   */
  constructor(type: string, payload: object, uuid: string = uuidv4(), status: string = 'pending', error = null) {
    this.type = type;
    this.payload = payload;
    this.timestamp = Date.now();
    this.uuid = uuid;
    this.status = status;
    this.error = error;
  }

  toString() {
    // Returns a concise description for logging
    return `PluginCommand(type=${this.type}, uuid=${this.uuid})`;
  }

  toJSON() {
    // Encodes the command object to JSON format
    return {
      type: this.type,
      payload: this.payload,
      timestamp: this.timestamp,
      uuid: this.uuid,
      status: this.status,
      error: this.error
    };
  }

  static fromJSON(json) {
    // Builds a command object from JSON
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return new PluginCommand(obj.type, obj.payload, obj.uuid, obj.status, obj.error);
  }
}

export default PluginCommand;