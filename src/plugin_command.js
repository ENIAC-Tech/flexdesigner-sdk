const { v4: uuidv4 } = require('uuid');
// plugin_command.js
// This class represents a plugin command structure.

class PluginCommand {
  constructor(type, payload, uuid, status, error=null) {
    this.type = type;
    this.payload = payload;
    this.timestamp = Date.now();
    this.uuid = uuid || uuidv4();
    this.status = status || 'pending';
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

module.exports = PluginCommand;