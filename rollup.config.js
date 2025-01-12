import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import path from "path";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/my-module.cjs.js",
      format: "cjs",
    },
    {
      file: "dist/my-module.esm.js",
      format: "esm",
    },
  ],
  external: [
    'winston',
    'winston-daily-rotate-file'
  ],
  plugins: [
    json(),
    resolve({ preferBuiltins: true }),
    commonjs(),
    terser()
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.code === 'EVAL') return;
    warn(warning);
  }
};
