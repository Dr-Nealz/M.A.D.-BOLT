# Desktop App

M.A.D. BOLT-REMIX ships as a **desktop application** for Windows, macOS, and Linux via **Electron** — the same app you use in the browser, packaged for your OS.

## Install

Download the installer or portable build for your platform from the [GitHub Releases](https://github.com/Dr-Nealz/M.A.D.-BOLT/releases) page:

- **Windows** — NSIS installer (`.exe`) or portable (`.exe`).
- **macOS** — `.dmg`.
- **Linux** — AppImage / deb.

Install like any app and launch **M.A.D. BOLT-REMIX**.

## What's Different vs. the Browser Version

- **Local API keys** — keys are stored on your machine via `electron-store`, not in the browser.
- **stdio MCP servers** — the desktop build can spawn local MCP processes (browser builds can't).
- **Auto-updates** — future releases can update in place via the built-in updater.

## Building from Source

```bash
pnpm install
pnpm run electron:build:win     # Windows (installer + portable)
pnpm run electron:build:mac     # macOS
pnpm run electron:build:linux   # Linux
pnpm run electron:build:dist    # All platforms
```

## Under the Hood

- The renderer is the same Remix app, built with `vite-electron.config.js`.
- The Electron main/preload scripts are compiled separately (`electron/main/`, `electron/preload/`).
- Packaging uses **electron-builder** with NSIS (Windows), dmg (macOS), AppImage/deb (Linux).

## Related

- [Getting Started](/guide/getting-started) — full setup instructions.
- [Licensing](/guide/licensing) — desktop distribution terms.
