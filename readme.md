# FlexDesigner SDK

A comprehensive SDK for developing plugins for FlexDesigner, providing seamless integration with Flexbar devices and rich interaction capabilities.

## Installation

### Prerequisites

- Node.js version 20 or higher
- FlexDesigner version 1.0.0 or higher.

### Setup

Add FlexDesigner SDK to your project

> In typical cases, you only need to create a plugin project using `flexcli`, and the FlexDesigner SDK will be automatically installed.

```bash
npm install @eniactech/flexdesigner-sdk
```

## Quick Start

```javascript
const { plugin, logger, pluginPath, resourcesPath } = require("@eniactech/flexdesigner-sdk")

// Start the plugin
plugin.start()

// Handle plugin events
plugin.on('plugin.alive', (payload) => {
    logger.info('Plugin loaded:', payload)
})

plugin.on('plugin.data', (payload) => {
    logger.info('User interaction:', payload)
    return 'Response from plugin backend!'
})
```

## Core Concepts

### Plugin Lifecycle

1. **Initialization**: Plugin starts and connects to FlexDesigner
2. **Alive Event**: Triggered when keys are loaded and ready
3. **Data Events**: Triggered when users interact with keys
4. **Configuration**: Plugin can read/write configuration data

### Key Types

- **Standard Keys**: Basic button functionality
- **Multi-State Keys**: Cycle through different states
- **Slider Keys**: Continuous value adjustment
- **Dynamic Keys**: Dynamically managed key collections
- **Wheel Keys**: Rotary encoder support

## API Reference

### Core Plugin APIs

#### plugin.start()

Starts the WebSocket connection and initializes the plugin.

```javascript
plugin.start()
```

#### plugin.on(event, handler)

Registers an event handler for specific events.

**Parameters:**

- `event` (string): Event type
- `handler` (function): Event handler function

```javascript
plugin.on('plugin.data', (payload) => {
    const { data, serialNumber } = payload
    logger.info('Key pressed:', data.key.title)
    return { status: 'success', message: 'Key handled!' }
})
```

#### plugin.off(event)

Unregisters an event handler.

```javascript
plugin.off('plugin.data')
```

### Drawing and Visual Updates

#### plugin.draw(serialNumber, key, type?, base64?)

Updates the visual appearance of a key.

**Parameters:**

- `serialNumber` (string): Device serial number
- `key` (object): Key object from events
- `type` (string): 'draw' (default) or 'base64'
- `base64` (string): Base64 image data (when type is 'base64')

```javascript
// Update key based on key.style properties
plugin.draw(serialNumber, key, 'draw')

// Draw custom image
const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
plugin.draw(serialNumber, key, 'base64', base64Image)
```

### Key State Management

#### plugin.setMultiState(serialNumber, key, state, message?)

Sets the state for multi-state keys.

**Parameters:**

- `serialNumber` (string): Device serial number
- `key` (object): Key object
- `state` (number): Target state index
- `message` (string, optional): Display message

```javascript
plugin.setMultiState(serialNumber, key, 2, 'State Changed')
```

#### plugin.setSlider(serialNumber, key, value)

Sets the value for slider keys.

**Parameters:**

- `serialNumber` (string): Device serial number
- `key` (object): Key object
- `value` (number): Slider value

```javascript
plugin.setSlider(serialNumber, key, 75)
```

### Device Configuration

#### plugin.setDeviceConfig(serialNumber, config)

Configures device settings.

**Parameters:**

- `serialNumber` (string): Device serial number
- `config` (object): Configuration object

```javascript
plugin.setDeviceConfig(serialNumber, {
    sleepTime: 1000,
    brightness: 100,
    screenFlip: true,
    vibrate: 'full',
    autoSleep: true,
    deviceName: 'My Flexbar',
    cdcMode: true,
    color: 'space black'
})
```

### Messaging and Notifications

#### plugin.showFlexbarSnackbarMessage(serialNumber, msg, level, icon?, timeout?, waitUser?)

Displays a message on the Flexbar device.

**Parameters:**

- `serialNumber` (string): Device serial number
- `msg` (string): Message content (max 64 characters)
- `level` (string): Message level ('info', 'warning', 'error', 'success')
- `icon` (string, optional): Icon name
- `timeout` (number, optional): Duration in ms (500-10000, default: 2000)
- `waitUser` (boolean, optional): Wait for user interaction

```javascript
plugin.showFlexbarSnackbarMessage(
    serialNumber, 
    'Hello from plugin!', 
    'info', 
    'bell', 
    3000
)
```

#### plugin.showSnackbarMessage(color, message, timeout?)

Shows a message in the FlexDesigner application.

```javascript
plugin.showSnackbarMessage('success', 'Operation completed!', 3000)
```

### System Integration

#### plugin.electronAPI(api, ...args)

Calls Electron APIs for system integration.

**Supported APIs:**

- `dialog.showOpenDialog`
- `dialog.showSaveDialog`
- `dialog.showMessageBox`
- `dialog.showErrorBox`
- `app.getAppPath`
- `app.getPath`
- `screen.getCursorScreenPoint`
- `screen.getPrimaryDisplay`
- `screen.getAllDisplays`

```javascript
// Show file dialog
const result = await plugin.electronAPI('dialog.showOpenDialog', {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
})

// Get cursor position
const cursorPos = await plugin.electronAPI('screen.getCursorScreenPoint')
```

### File Operations

#### plugin.openFile(path)

Reads a file from the filesystem.

```javascript
const content = await plugin.openFile('/path/to/file.txt')
```

#### plugin.saveFile(path, data)

Saves data to a file.

```javascript
await plugin.saveFile('/path/to/output.txt', 'Hello World!')
```

### Application Information

#### plugin.getAppInfo()

Gets FlexDesigner application information.

```javascript
const appInfo = await plugin.getAppInfo()
// Returns: { version: "v1.0.0", platform: "win32" }
```

#### plugin.getOpenedWindows()

Gets list of opened windows on the system.

```javascript
const windows = await plugin.getOpenedWindows()
windows.forEach(win => {
    console.log(`Window: ${win.title} (${win.bounds.width}x${win.bounds.height})`)
})
```

#### plugin.getDeviceStatus()

Gets status of connected devices.

```javascript
const devices = await plugin.getDeviceStatus()
devices.forEach(device => {
    console.log(`Device: ${device.serialNumber}, Status: ${device.status}`)
})
```

### Configuration Management

#### plugin.getConfig()

Retrieves plugin configuration.

```javascript
const config = await plugin.getConfig()
console.log('Current config:', config)
```

#### plugin.setConfig(config)

Updates plugin configuration.

```javascript
await plugin.setConfig({ theme: 'dark', autoUpdate: true })
```

### Performance Monitoring

#### plugin.sendChartData(chartDataArray)

Sends performance metrics for display in FlexDesigner.

**Parameters:**

- `chartDataArray` (array): Array of chart data objects

```javascript
plugin.sendChartData([
    {
        label: 'CPU Usage',
        value: 45.2,
        unit: '%',
        baseUnit: '%',
        baseVal: 45.2,
        maxLen: 2,
        category: 'system',
        key: 'cpu'
    },
    {
        label: 'Memory',
        value: 2.1,
        unit: 'GB',
        baseUnit: 'MB',
        baseVal: 2048,
        maxLen: 3,
        category: 'system',
        key: 'memory'
    }
])
```

### Shortcuts Management

#### plugin.updateShortcuts(shortcuts)

Registers or unregisters keyboard shortcuts.

**Parameters:**

- `shortcuts` (array): Array of shortcut objects

```javascript
plugin.updateShortcuts([
    {
        shortcut: 'CommandOrControl+F1',
        action: 'register'
    },
    {
        shortcut: 'CommandOrControl+F2',
        action: 'unregister'
    }
])
```

## Dynamic Key Management

The `plugin.dynamickey` object provides advanced key management capabilities.

### plugin.dynamickey.clear(serialNumber, key)

Removes all dynamic keys from a container.

```javascript
plugin.dynamickey.clear(serialNumber, key)
```

### plugin.dynamickey.add(serialNumber, key, index, backgroundType, backgroundData, width, userData)

Adds a new dynamic key.

**Parameters:**

- `index` (number): Position to insert the key
- `backgroundType` (string): 'base64' or 'draw'
- `backgroundData` (string): Image data or key object
- `width` (number): Key width in pixels (60-1000)
- `userData` (object): Custom data associated with the key

```javascript
plugin.dynamickey.add(
    serialNumber, 
    key, 
    0, 
    'base64', 
    'data:image/png;base64,iVBORw0...', 
    200, 
    { name: 'Dynamic Key 1', action: 'custom' }
)
```

### plugin.dynamickey.remove(serialNumber, key, index)

Removes a dynamic key at the specified index.

```javascript
plugin.dynamickey.remove(serialNumber, key, 2)
```

### plugin.dynamickey.move(serialNumber, key, srcIndex, dstIndex)

Moves a dynamic key from one position to another.

```javascript
plugin.dynamickey.move(serialNumber, key, 0, 3)
```

### plugin.dynamickey.setWidth(serialNumber, key, width)

Changes the width of the dynamic key container.

```javascript
plugin.dynamickey.setWidth(serialNumber, key, 800)
```

### plugin.dynamickey.draw(serialNumber, key, index, backgroundType, backgroundData, width)

Updates the visual appearance of a specific dynamic key.

```javascript
plugin.dynamickey.draw(
    serialNumber, 
    key, 
    1, 
    'base64', 
    'data:image/png;base64,iVBORw0...', 
    200
)
```

### plugin.dynamickey.update(serialNumber, key, index, userData)

Updates the user data for a dynamic key.

```javascript
plugin.dynamickey.update(serialNumber, key, 0, { status: 'updated' })
```

### plugin.dynamickey.refresh(serialNumber, key)

Refreshes the dynamic key display (recommended after width changes).

```javascript
plugin.dynamickey.refresh(serialNumber, key)
```

## Event Handling

### Plugin Events

#### 'plugin.alive'

Triggered when keys are loaded and ready for interaction.

```javascript
plugin.on('plugin.alive', (payload) => {
    const { serialNumber, keys } = payload
  
    keys.forEach(key => {
        console.log(`Key loaded: ${key.cid} at position ${key.uid}`)
      
        // Initialize key based on its type
        if (key.cid === 'com.example.counter') {
            key.style.showTitle = true
            key.title = '0'
            plugin.draw(serialNumber, key, 'draw')
        }
    })
})
```

#### 'plugin.data'

Triggered when users interact with keys.

```javascript
plugin.on('plugin.data', (payload) => {
    const { serialNumber, data } = payload
    const key = data.key
  
    if (key.cid === 'com.example.button') {
        console.log('Button pressed!')
        return { status: 'success', message: 'Button handled' }
    }
  
    if (key.cid === 'com.example.slider') {
        console.log(`Slider value: ${data.value}`)
    }
})
```

#### 'plugin.config.updated'

Triggered when plugin configuration changes.

```javascript
plugin.on('plugin.config.updated', (payload) => {
    console.log('Configuration updated:', payload.config)
})
```

### System Events

#### 'system.shortcut'

Triggered when registered shortcuts are pressed.

```javascript
plugin.on('system.shortcut', (payload) => {
    console.log(`Shortcut pressed: ${payload.shortcut}`)
})
```

#### 'system.actwin'

Triggered when the active window changes.

```javascript
plugin.on('system.actwin', (payload) => {
    const { oldWin, newWin } = payload
    console.log(`Window changed: ${oldWin.title} -> ${newWin.title}`)
})
```

### Device Events

#### 'device.status'

Triggered when device connection status changes.

```javascript
plugin.on('device.status', (devices) => {
    devices.forEach(device => {
        if (device.status === 'connected') {
            console.log(`Device connected: ${device.serialNumber}`)
            // Configure the newly connected device
            plugin.setDeviceConfig(device.serialNumber, {
                brightness: 80,
                deviceName: 'My Plugin Device'
            })
        }
    })
})
```

### UI Events

#### 'ui.message'

Triggered when receiving messages from the plugin's UI.

```javascript
plugin.on('ui.message', async (payload) => {
    console.log('Message from UI:', payload)
  
    if (payload.action === 'test') {
        // Perform test operations
        await testAPIs()
        return 'Test completed!'
    }
  
    return 'Message received!'
})
```

#### 'ui.log'

Handles log messages from the plugin's UI (automatically handled).

## Utilities and Helpers

### Logger

The SDK provides a logger instance for debugging and monitoring.

```javascript
const { logger } = require("@eniactech/flexdesigner-sdk")

logger.info('Information message')
logger.warn('Warning message')
logger.error('Error message')
logger.debug('Debug message')
```

### Path Utilities

Access to plugin-specific paths.

```javascript
const { pluginPath, resourcesPath } = require("@eniactech/flexdesigner-sdk")

console.log('Plugin directory:', pluginPath)
console.log('Resources directory:', resourcesPath)
```

## Complete Example

Here's a comprehensive example demonstrating various SDK features:

```javascript
const { plugin, logger, pluginPath } = require("@eniactech/flexdesigner-sdk")
const { createCanvas } = require('@napi-rs/canvas')

// Store key data
const keyData = {}

// Plugin lifecycle
plugin.start()

// Handle key loading
plugin.on('plugin.alive', (payload) => {
    const { serialNumber, keys } = payload
  
    keys.forEach(key => {
        keyData[key.uid] = key
      
        switch (key.cid) {
            case 'com.example.counter':
                // Initialize counter
                keyData[key.uid].counter = 0
                key.style.showTitle = true
                key.title = 'Click Me!'
                plugin.draw(serialNumber, key, 'draw')
                break
              
            case 'com.example.slider':
                // Set initial slider value
                plugin.setSlider(serialNumber, key, 50)
                break
              
            case 'com.example.dynamic':
                // Setup dynamic keys
                setupDynamicKeys(serialNumber, key)
                break
        }
    })
})

// Handle user interactions
plugin.on('plugin.data', (payload) => {
    const { serialNumber, data } = payload
    const key = data.key
  
    switch (key.cid) {
        case 'com.example.counter':
            // Increment counter
            keyData[key.uid].counter++
            key.title = `${keyData[key.uid].counter}`
            plugin.draw(serialNumber, key, 'draw')
            break
          
        case 'com.example.wheel':
            // Handle wheel rotation
            showWheelFeedback(serialNumber, data.delta)
            break
    }
})

// Handle device connections
plugin.on('device.status', (devices) => {
    devices.forEach(device => {
        if (device.status === 'connected') {
            logger.info(`Device connected: ${device.serialNumber}`)
          
            // Configure device
            plugin.setDeviceConfig(device.serialNumber, {
                brightness: 100,
                deviceName: 'SDK Example Device',
                autoSleep: true
            })
        }
    })
})

// Helper function for dynamic keys
function setupDynamicKeys(serialNumber, key) {
    plugin.dynamickey.clear(serialNumber, key)
  
    // Add multiple dynamic keys
    for (let i = 0; i < 3; i++) {
        const canvas = createCanvas(200, 60)
        const ctx = canvas.getContext('2d')
      
        // Draw custom background
        ctx.fillStyle = `hsl(${i * 120}, 70%, 50%)`
        ctx.fillRect(0, 0, 200, 60)
      
        ctx.fillStyle = 'white'
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`Key ${i}`, 100, 35)
      
        const imageData = canvas.toDataURL()
      
        plugin.dynamickey.add(
            serialNumber,
            key,
            i,
            'base64',
            imageData,
            200,
            { id: i, name: `Dynamic Key ${i}` }
        )
    }
}

// Performance monitoring
setInterval(() => {
    const memUsage = process.memoryUsage()
  
    plugin.sendChartData([
        {
            label: 'Memory Usage',
            value: memUsage.heapUsed / 1024 / 1024,
            unit: 'MB',
            baseUnit: 'bytes',
            baseVal: memUsage.heapUsed,
            maxLen: 3,
            category: 'system',
            key: 'memory'
        }
    ])
}, 5000)

// Register shortcuts
setTimeout(() => {
    plugin.updateShortcuts([
        {
            shortcut: 'CommandOrControl+Shift+F1',
            action: 'register'
        }
    ])
}, 1000)

logger.info('Plugin example started successfully!')
```

## Best Practices

### Performance

- Use `plugin.dynamickey.refresh()` after width changes
- Batch multiple dynamic key operations when possible
- Optimize image sizes for better performance

### Error Handling

- Always wrap async operations in try-catch blocks
- Validate key types before calling type-specific methods
- Handle device disconnection gracefully

### User Experience

- Provide visual feedback for user interactions
- Use appropriate message levels for notifications
- Keep snackbar messages concise and informative

### Development

- Use the logger for debugging instead of console.log
- Test with multiple device connections
- Validate configuration before applying changes

## Troubleshooting

### Common Issues

1. **Plugin not starting**: Ensure correct command-line arguments are provided
2. **Keys not updating**: Check if the correct serial number is used
3. **Dynamic keys not displaying**: Call `refresh()` after width changes
4. **Events not firing**: Verify event handler registration

### Debugging

Enable debug logging by setting the appropriate log level:

```javascript
logger.debug('Debug information')
```

Monitor WebSocket connections and ensure the plugin can communicate with FlexDesigner.

## License

This SDK is provided under the terms specified by EniacTech. Please refer to your license agreement for usage terms and conditions.
