const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");
const { fileURLToPath } = require('url');
let cachedLogger = null;

/**
 * Log directory
 */
const logDir = fileURLToPath(new URL('../logs', import.meta.url));
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Custom color definitions
 */
winston.addColors({
  info: "bold cyan",
  warn: "yellowBG bold white",
  error: "redBG bold white",
  debug: "green",
});

/**
 * Safely convert an object to a JSON string to avoid circular references
 */
function safeStringify(obj, space = 2) {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
}

/**
 * Check if a value is a TypedArray
 */
function isTypedArray(value) {
  return (
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    (typeof BigInt64Array !== "undefined" && value instanceof BigInt64Array) ||
    (typeof BigUint64Array !== "undefined" && value instanceof BigUint64Array)
  );
}

/**
 * Convert a single value into a string
 */
function formatValue(value) {
  // 1. null / undefined
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  // 2. Error
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack}`;
  }

  // 3. TypedArray
  if (isTypedArray(value)) {
    const hexStr = Array.from(value)
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(", ");
    return `${value.constructor.name} [ ${hexStr} ]`;
  }

  // 4. ArrayBuffer
  if (value instanceof ArrayBuffer) {
    const typedArray = new Uint8Array(value);
    const hexStr = Array.from(typedArray)
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(", ");
    return `ArrayBuffer(${value.byteLength}) [ ${hexStr} ]`;
  }

  // 5. Date
  if (value instanceof Date) {
    return `Date(${value.toISOString()})`;
  }

  // 6. Map
  if (value instanceof Map) {
    const entries = [];
    for (const [k, v] of value.entries()) {
      entries.push(`${formatValue(k)} => ${formatValue(v)}`);
    }
    return `Map(${value.size}) { ${entries.join(", ")} }`;
  }

  // 7. Set
  if (value instanceof Set) {
    const entries = [];
    for (const v of value.values()) {
      entries.push(formatValue(v));
    }
    return `Set(${value.size}) { ${entries.join(", ")} }`;
  }

  // 8. Array
  if (Array.isArray(value)) {
    return safeStringify(value);
  }

  // 9. Function
  if (typeof value === "function") {
    return `Function(${value.name || "anonymous"})`;
  }

  // 10. symbol
  if (typeof value === "symbol") {
    return value.toString(); // Symbol(foo)
  }

  // 11. bigint
  if (typeof value === "bigint") {
    return `BigInt(${value.toString()})`;
  }

  // 12. number / boolean / string
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return String(value);
  }

  // 13. generic object
  if (typeof value === "object") {
    return safeStringify(value);
  }

  // 14. fallback
  return String(value);
}

/**
 * Format multiple arguments into one message string
 */
function formatMessage(args) {
  // args is an array of everything passed to logger.info(...), etc.
  return args.map(formatValue).join(" ");
}

/**
 * Create Winston Logger
 */
function createMainLogger() {
  const mainLogger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.printf(({ message, timestamp, level, scope }) => {
        const scopeStr = scope ? `[${scope}]` : "";
        return `${timestamp} [${level}]${scopeStr} -> ${message}`;
      })
    ),
    transports: [
      new DailyRotateFile({
        filename: "%DATE%.log",
        dirname: logDir,
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d",
      }),
    ],
  });

  mainLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ message, timestamp, level, scope }) => {
          const scopeStr = scope ? `(${scope})` : "";
          return `${timestamp} [${level}]${scopeStr} -> ${message}`;
        })
      ),
    })
  );

  // Overwrite the 4 common level methods so that they handle multiple arguments
  ["info", "warn", "error", "debug"].forEach((lvl) => {
    const original = mainLogger[lvl];
    mainLogger[lvl] = function (...args) {
      const msg = formatMessage(args);
      return original.call(this, msg);
    };
  });

  return mainLogger;
}

/**
 * Singleton pattern to avoid multiple creation
 */
if (!cachedLogger) {
  cachedLogger = createMainLogger();
}

module.exports = cachedLogger;