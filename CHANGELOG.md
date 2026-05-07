# Changelog

## [1.0.8] – 2026-05-07

### Added

- `plugin.sendControlCommand(serialNumber, command)` — send device control topics: `sys.sleep`, `sys.wake`, `hapic.click` (via WebSocket `control-command`).

### Changed

- npm package now ships only the `dist/` folder (`package.json` `files` field), smaller install size.
- Removed stray `flexdesigner-1.0.0.tgz` from the repository; ignore `*.tgz` in `.gitignore`.
