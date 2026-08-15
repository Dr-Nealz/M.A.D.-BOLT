# Getting Started

Welcome to the **M.A.D. BOLT-REMIX** documentation — your guide to building full-stack apps from a single prompt, engineered by **Dr. Neal (The M.A.D. Doctor)** in the M.A.D. Laboratory.

## What Is M.A.D. BOLT-REMIX?

M.A.D. BOLT-REMIX is an AI-powered, full-stack application builder that runs entirely in your browser. Describe what you want in plain language, and the built-in AI — backed by **19+ LLM providers** — writes the files, wires the dependencies, and renders a **live preview** in a sandboxed WebContainer runtime.

It is the productized, branded evolution of the open-source **bolt.diy** project (MIT License, © StackBlitz), with the **GALVANI by M.A.D. LABS** identity, the **Multiverse Aurora** theme, and the **NVIDIA** + **9router** provider integrations.

## Quick Start

### Option A — Desktop App (recommended)

Download the latest **M.A.D. BOLT-REMIX** desktop build (Windows/macOS/Linux) from the [GitHub Releases](https://github.com/Dr-Nealz/M.A.D.-BOLT/releases) page and install it like any app.

### Option B — Run from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/Dr-Nealz/M.A.D.-BOLT.git
   cd M.A.D.-BOLT
   ```
2. Install dependencies (pnpm is required):
   ```bash
   pnpm install
   ```
3. Start the dev server:
   ```bash
   pnpm run dev
   ```
4. Open `http://localhost:5173` in your browser.

### Option C — Docker

```bash
docker build -t mad-bolt-remix .
docker run -it -d --name mad-bolt -p 5173:5173 --env-file .env.local mad-bolt-remix
```

## Configure Your First Provider

1. Open the settings panel (the sliders icon in the top bar).
2. Toggle on a provider — e.g. **OpenAI**, **Anthropic**, **Google**, **Mistral**, **NVIDIA**, or **9router**.
3. Paste your API key into the provider's card (or configure it via `.env.local`).
4. Pick a model from the model dropdown and start chatting.

> **Tip:** M.A.D. BOLT-REMIX keeps your API keys **in your browser only** — nothing is sent to a server. For the desktop app they are stored locally on your machine.

## Next Steps

- [Providers](/guide/providers) — all supported providers and how to configure them.
- [WebContainer](/guide/webcontainer) — how the in-browser sandbox works.
- [Git & GitHub](/guide/git) — clone, commit, and push from inside the app.
- [MCP](/guide/mcp) — extend M.A.D. with Model Context Protocol servers.
- [Deploy](/guide/deploy) — ship your app to Netlify, Vercel, and more.
- [Desktop App](/guide/desktop) — install and use the Electron desktop build.
- [Licensing](/guide/licensing) — the two-layer licensing model.
