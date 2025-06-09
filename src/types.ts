type DesktopPlatform = "darwin" | "win32" | "linux";
type DesktopPlatformForWindow = "macos" | "windows" | "linux";
type LogLevel = "debug" | "info" | "warn" | "error";

export interface Pos {
  X: number;
  Y: number;
}

export interface KeyStyle {
  /**
   * Icon for the key. Can be an MDI icon (https://pictogrammers.com/library/mdi/) or a PNG in base64
   * e.g. "mdi mdi-cog"
   */
  icon: string;
  /**
   * An emoji for the key
   */
  emoji: string;
  /**
   * Width of the key
   */
  width: number;
  /**
   * Background color, "#rrggbb"
   */
  bgColor: string;
  /**
   * Foreground color, "#rrggbb"
   */
  fgColor: string;
  /**
   * Border style: solid, dotted, double, 3d
   */
  borderStyle: 'solid' | 'dotted' | 'double' | '3d';
  /**
   * Border width
   */
  borderWidth: number;
  /**
   * Border color, "#rrggbb"
   */
  borderColor: string;
  /**
   * Font for the key title
   */
  font: string;
  /**
   * Font size for the key title
   */
  fontSize: number;
  /**
   * Icon size
   */
  iconSize: number;
  /**
   * Icon position in percentages
   */
  iconPos: Pos;
  /**
   * Title position in percentages
   */
  titlePos: Pos;
  /**
   * Rotation angle for the title
   */
  titleRotate: number;
  /**
   * Rotation angle for the icon
   */
  iconRotate: number;
  /**
   * Whether to add a shadow to the icon and title
   */
  foregroundOutline: boolean;
  /**
   * Whether to display the icon
   */
  showIcon: boolean;
  /**
   * Whether to display an emoji
   */
  showEmoji: boolean;
  /**
   * Whether to display the title
   */
  showTitle: boolean;
  /**
   * Whether to display an image
   */
  showImage: boolean;
  /**
   * A base64-encoded PNG background image, valid only if showImage is true
   */
  image?: string
}

export interface KeyData {
  pluginID: string;
  cid: string;
  /**
   * Unique identifier of the key, among all keys on the device
   */
  uid: number;
  width: number;
  /**
   * This is your `modelValue.config` object set on the frontend
   */
  data: object;
  title: string;
  style?: KeyStyle
  cfg: {
    keyType: "default";
    clickable: boolean;
  } | {
    keyType: "multiState";
    multiState: {
      defaultState: number;
    }
  } | {
    keyType: "slider";
  } | {
    keyType: "wheel";
  };
}

// callback types for `on`

export interface UiLogPayload {
  level: LogLevel;
  msg: string;
}

export interface SystemShortcutPayload {
  shortcut: string;
}

export type PluginConfigUpdatedPayload = object;

export interface PluginAlivePayload {
  serialNumber: string;
  keys: Array<KeyData>;
}

export interface DataDefaultClick {
  evt: "click";
  key: KeyData;
}

export interface DataMultiStateClick {
  state: number;
  key: KeyData;
}

export interface DataSliderMove {
  value: number;
  key: KeyData;
}

export type DataWheelRoll = {
  state: "start" | "end";
  key: KeyData;
} | {
  state: "rolling";
  delta: number;
  key: KeyData;
}

export interface PluginDataPayload {
  serialNumber: string;
  data: DataDefaultClick | DataMultiStateClick | DataSliderMove | DataWheelRoll;
}

// Well this is wierd. It takes strings on input but gives numbers on output.
export interface DeviceConfigInput {
  /**
   * Sleep timeout in seconds (0 or 30-5999)
   */
  sleepTime?: number;
  /**
   * Screen brightness (0-100)
   */
  brightness?: number;
  /**
   * Whether to flip the screen
   */
  screenFlip?: boolean;
  /**
   * Vibration mode
   */
  vibrate?: 'off' | 'partial' | 'full';
  /**
   * Whether to sleep together with computer sleep state
   */
  autoSleep?: boolean;
  /**
   * Device name (max 32 chars)
   */
  deviceName?: string;
  /**
   * CDC mode switch
   */
  cdcMode?: boolean;
  /**
   * Device color
   */
  color?: 'silver' | 'space black';
}

export interface DeviceConfig {
  sleepTime: number;
  brightness: number;
  screenFlip: boolean;
  /**
   * 0 = off, 1 = partial, 2 = full
   */
  vibrate: 0 | 1 | 2;
  autoSleep: boolean;
  deviceName: string;
  cdcMode: boolean;
  /**
   * Device color
   * 0 = silver, 1 = space black
   */
  color: number;
}

export interface DeviceData {
  platform: DesktopPlatform;
  profileVersion: string;
  firmwareVersion: string;
  updateInfo: any;
  config: DeviceConfig;
  deviceInterface: "CDC" | "HID";
}

export interface DeviceStatusPayloadItem {
  serialNumber: string;
  status: "connected" | "disconnected";
  deviceData?: DeviceData;
}

// types for API calls

export interface ShortcutRegisterItem {
  shortcut: string;
  action: 'register' | 'unregister';
}

export interface DeviceStatusResponseItem {
  serialNumber: string;
  deviceData: DeviceData;
}

interface Process {
  processId: number;
  path: string;
  name: string;
}

export interface DesktopWindow {
  platform: DesktopPlatformForWindow;
  id: number;
  title: string;
  owner: Process;
  bounds: {
    x: number; y: number;
    width: number; height: number;
  };
  memoryUsage: number;
}

export interface AppInfoResponse {
  version: string;
  platform: DesktopPlatform;
}

export type MessageLevel = "info" | "warning" | "error" | "success";

export type Icon =
  "audio" | "video" | "list" | "ok" | "close" | "power" | "settings" | "home" |
  "download" | "drive" | "refresh" | "mute" | "volume_mid" | "volume_max" |
  "image" | "tint" | "prev" | "play" | "pause" | "stop" | "next" | "eject" |
  "left" | "right" | "plus" | "minus" | "eye_open" | "eye_close" | "warning" |
  "shuffle" | "up" | "down" | "loop" | "directory" | "upload" | "call" | "cut" |
  "copy" | "save" | "bars" | "envelope" | "charge" | "paste" | "bell" |
  "keyboard" | "gps" | "file" | "wifi" | "battery_full" | "battery_3" |
  "battery_2" | "battery_1" | "battery_empty" | "usb" | "bluetooth" | "trash" |
  "edit" | "backspace" | "sd_card" | "new_line" | "dummy";

export interface ChartDataItem {
  /**
   * Display name of the metric.
   */
  label: string;
  /**
   * Current value of the metric, can be number or string.
   */
  value: number | string;
  /**
   * Unit of measurement (e.g., FPS, %, GB, ℃).
   */
  unit: string;
  /**
   * Base unit for conversion calculations.
   */
  baseUnit: string;
  /**
   * Raw value before formatting, can be number or string.
   */
  baseVal: number | string;
  /**
   * Maximum length for display formatting (1-4).
   */
  maxLen: number;
  /**
   * Category grouping (e.g., CPU, GPU, MEMORY, OTHER).
   */
  category: string;
  /**
   * Unique identifier for the metric.
   */
  key: string;
  /**
   * MDI icon name without 'mdi-' prefix (e.g., 'chevron-triple-right'). Search in https://pictogrammers.com/library/mdi/.
   */
  icon?: string;
}
