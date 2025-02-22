# FlexDesigner SDK Documentation

This document explains the purpose and usage of the FlexDesigner SDK.

## Installation

### Prerequisites
- Node.js version 18 or higher
- FlexDesigner version 1.0.0 or higher.

### Setup

Add FlexDesigner SDK to your project
> In typical cases, you only need to create a plugin project using `flexcli`, and the FlexDesigner SDK will be automatically installed.

```
npm install @eniactech/flexdesigner-sdk
```

## Methods

### `start()`
Starts the WebSocket connection by extracting port and uid from command-line arguments.

#### PARAMS
- None

#### RETURNS
- None

#### THROWS
- `Error`: If port, uid, or dir are not provided in the command-line arguments.

#### DESCRIPTION
This method parses the command-line arguments for `port`, `uid`, and `dir` options, 
and uses them to establish a WebSocket connection with the server. It sends an
initial "startup" command once connected.

---

### `_parseCommandLineArgs()`
Parses command-line arguments to extract port, uid, and dir.

#### PARAMS
- None

#### RETURNS
- `{ port: <number|string>, uid: <string>, dir: <string> }`: An object containing the parsed arguments.

#### THROWS
- None

#### DESCRIPTION
This method uses the `minimist` library to parse command-line arguments, 
returning an object with `port`, `uid`, and `dir` properties.

---

### `_call(command, payload, timeout = 5000)`
Sends a request to the server with a specific command and payload.

#### PARAMS
- `command`: The command to send to the server.
- `payload`: The payload to send along with the command.
- `timeout`: (Optional) The timeout in milliseconds before rejecting the request. Default is 5000 ms.

#### RETURNS
- `Promise<any>`: A promise that resolves with the response payload or rejects with an error.

#### THROWS
- None

#### DESCRIPTION
The method creates a `PluginCommand` and sends it via WebSocket. It also sets a timeout 
to reject the request if no response is received.

---

### `_handleMessage(msg)`
Handles incoming WebSocket messages.

#### PARAMS
- `msg`: The received message in string format.

#### RETURNS
- None

#### THROWS
- None

#### DESCRIPTION
The method processes messages from the server, checking if they are responses to 
previous requests or if they are broadcasts that need to be handled by registered message handlers.

---

### `on(type, handler)`
Registers a handler for incoming messages of a specific type.

#### PARAMS
- `type`: The message type to handle.
- `handler`: The handler function that processes the message payload.

#### RETURNS
- None

#### THROWS
- None

#### DESCRIPTION
This method allows the registration of handlers for specific message types, 
which are invoked when a message of that type is received from the server.

---

### `off(type)`
Unregisters a handler for a specific message type.

#### PARAMS
- `type`: The message type to unregister the handler for.

#### RETURNS
- None

#### THROWS
- None

#### DESCRIPTION
This method unregisters the handler for the specified message type.

---

### `draw(serialNumber, key, type = 'draw', base64 = null)`
Draws an image on a key.

#### PARAMS
- `serialNumber`: The serial number of the device.
- `key`: The key object received from the event `device.newPage` or `device.userData`.
- `type`: The type of drawing operation, possible values: `"draw" | "base64"`.
- `base64`: (Optional) The base64 image data. Only used if `type` is "base64".

#### RETURNS
- `Promise<any>`: A promise that resolves with the server response.

#### THROWS
- None

#### DESCRIPTION
This method sends a draw command to the server, allowing the image data in 
base64 format to be drawn on the specified key.

---

### `set(serialNumber, key, data)`
Sets data for a specific key.

#### PARAMS
- `serialNumber`: The serial number of the device.
- `key`: The key object received from the event `device.newPage` or `device.userData`.
- `data`: The data to set on the key. The format of `data` depends on the key type.

#### RETURNS
- `Promise<any>`: A promise that resolves with the server response.

#### THROWS
- `Error`: If the provided data is invalid for the given key type.

#### DESCRIPTION
This method sends a command to update the state or value of a specified key 
based on the key type. It supports "multiState" and "slider" key types.

---

### `showSnackbarMessage(color, message, timeout = 3000)`
Shows a snackbar message in the parent window.

#### PARAMS
- `color`: The color type for the message. Possible values: `"success" | "info" | "warning" | "error"`.
- `message`: The message content to display.
- `timeout`: (Optional) Duration in milliseconds before hiding the message.

#### RETURNS
- `Promise<any>`: A promise that resolves with the response.

#### THROWS
- None

#### DESCRIPTION
Displays a transient message (snackbar) with a specified color and timeout.

---

### `electronAPI(api, ...args)`
Calls the Electron API.

#### PARAMS
- `api`: The Electron API method to call. Possible values include:
  - `"dialog.showOpenDialog"`
  - `"dialog.showSaveDialog"`
  - `"dialog.showMessageBox"`
  - `"dialog.showErrorBox"`
  - `"app.getAppPath"`
  - `"app.getPath"`
  - `"screen.getCursorScreenPoint"`
  - `"screen.getPrimaryDisplay"`
  - `"screen.getAllDisplays"`
  - `"screen.getDisplayNearestPoint"`
  - `"screen.getDisplayMatching"`
  - `"screen.screenToDipPoint"`
  - `"screen.dipToScreenPoint"`
- `...args`: Arguments to be passed to the Electron API call.

#### RETURNS
- `Promise<any>`: A promise that resolves exactly as the Electron API returns.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
This function allows you to call various Electron APIs through a single interface.

---

### `getAppInfo()`
Gets application information.

#### PARAMS
- None

#### RETURNS
- `Promise<Object>`: A promise that resolves with the app info in JSON format.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
This function retrieves the application version and platform.

---

### `openFile(path)`
Opens a file from the given path.

#### PARAMS
- `path`: The file path.

#### RETURNS
- `Promise<string|Buffer>`: A promise that resolves with the file content.

#### THROWS
- `Error`: Throws an error if file opening fails.

#### DESCRIPTION
Retrieves the file content if successful; otherwise throws an error.

---

### `saveFile(path, data)`
Saves data to a specified file path.

#### PARAMS
- `path`: The file path.
- `data`: The file content (string or Buffer).

#### RETURNS
- `Promise<Object>`: A promise that resolves with the result in JSON format:
  ```
  {
    "status": "success" | "error",
    "error": "Error message if status is 'error'"
  }
  ```

#### THROWS
- `Error`: Throws an error if saving fails.

#### DESCRIPTION
Saves string or Buffer data to the provided file path and returns a status.

---

### `getOpenedWindows()`
Gets the list of opened windows.

#### PARAMS
- None

#### RETURNS
- `Promise<Object[]>`: A promise that resolves to an array of window objects.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
Retrieves an array of window objects in JSON format, each containing details 
such as `platform`, `id`, `title`, `owner`, `bounds`, and `memoryUsage`.

---

### `getDeviceStatus()`
Gets the device status.

#### PARAMS
- None

#### RETURNS
- `Promise<Object>`: A promise that resolves to a JSON object containing device status fields.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
Returns a JSON object containing various status fields such as `connecting`, 
`connected`, `serialNumber`, `platform`, `profileVersion`, and `fwVersion`.

---

### `getConfig()`
Gets the plugin configuration.

#### PARAMS
- None

#### RETURNS
- `Promise<Object>`: A promise that resolves to the plugin configuration object.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
Retrieves the plugin configuration.

---

### `setConfig(config)`
Sets the plugin configuration.

#### PARAMS
- `config`: The plugin configuration object.

#### RETURNS
- `Promise<Object>`: A promise that resolves to the result `{ status: 'success' | 'error' }`.

#### THROWS
- `Error`: Throws an error if the call fails.

#### DESCRIPTION
Sets the plugin configuration with the provided `config` object.