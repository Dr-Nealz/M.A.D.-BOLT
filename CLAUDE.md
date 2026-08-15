# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install           # Install dependencies (pnpm is the required package manager)
pnpm run dev           # Start dev server (Remix Vite + Cloudflare dev proxy)
pnpm test              # Run Vitest unit tests
pnpm test:watch        # Run Vitest in watch mode
pnpm run lint          # ESLint (cached) on app/
pnpm run lint:fix      # ESLint --fix + Prettier write
pnpm run typecheck     # TypeScript type check
pnpm run typegen       # Generate Cloudflare Worker types via wrangler
pnpm run build         # Production build (Remix Vite)
pnpm run preview       # Build + serve locally via Wrangler Pages
pnpm run deploy        # Build + deploy to Cloudflare Pages

# Single test file:
pnpm vitest run path/to/test.spec.ts

# Electron (desktop app):
pnpm run electron:dev              # Electron dev mode
pnpm run electron:build:dist       # Build for all platforms
pnpm run electron:build:win        # Windows only
```

## Architecture

**Remix (v2) on Cloudflare Pages.** File-based routes live in `app/routes/`. The app server-runs on Cloudflare Workers (Pages Functions), so runtime APIs must be Workers-compatible — no Node.js built-ins like `fs` or `child_process` in route handlers.

**In-browser code execution via WebContainer API.** The workbench (`app/components/workbench/`) runs AI-generated code inside WebContainer sandboxes. This is the core user experience: the LLM writes files, and a live preview + integrated terminal (`@xterm/xterm`) reflects changes.

**Multi-provider AI layer.** LLM providers are abstracted through the Vercel AI SDK (`ai` package + `@ai-sdk/*` providers). Provider registration, model listing, and API key management are in `app/lib/services/` and `app/lib/stores/settings.ts`. Providers are toggled in the UI and also configurable via env vars (`OPENAI_API_KEY`, `OLLAMA_API_BASE_URL`, etc.). **Enhanced with NVIDIA and 9router providers**:
- **NVIDIA Provider** (`app/lib/modules/llm/providers/nvidia.ts`) - Direct access to NVIDIA's LLM models (Llama Nemotron series, Mistral, etc.)
- **9router Provider** (`app/lib/modules/llm/providers/9router.ts`) - Unified routing across multiple providers through a single interface

**State management.** Two layers:
- **nanostores** (`app/lib/stores/`) — lightweight reactive stores for chat, editor, files, settings, terminals, theme.
- **Zustand** — used for more complex state (e.g., workbench, streaming).

**Persistence.** Chat history and project snapshots are stored in IndexedDB (`app/lib/persistence/`) and localStorage. There is no traditional server-side database; the app is designed to run statelessly on Cloudflare Pages.

**Git integration.** GitHub and GitLab API clients in `app/lib/services/`. Git operations (clone, status, diff) use `isomorphic-git` for browser-compatible Git functionality.

**Deploy integrations.** Netlify and Vercel deploy flows are implemented as API routes (`app/routes/api.netlify-deploy.ts`, `app/routes/api.vercel-deploy.ts`) that proxy through the user's OAuth credentials.

**Electron wrapper.** The same Remix app is packaged for desktop via Electron (`electron/` directory, `vite-electron.config.ts`). The Electron main/preload scripts are built separately from the renderer.

**Styling.** UnoCSS (utility-first, configured in `uno.config.ts`) + Tailwind merge utilities + SCSS for some component styles. Code editor uses CodeMirror 6 with VS Code theme.

**Message parsing.** AI responses are parsed in `app/lib/runtime/enhanced-message-parser.ts` to detect file operations, diffs, and commands embedded in LLM output.

## Key Conventions

- Route files follow Remix convention: `app/routes/<path>.tsx` for pages, `app/routes/api.<name>.ts` for API routes.
- Environment variables are loaded from `.env`, `.env.local`, `.env.production` via dotenv + Vite's `envPrefix`. Cloudflare-specific vars are whitelisted in `vite.config.ts`.
- Tests live alongside source files (`*.spec.ts`) or in `app/lib/runtime/__snapshots__/`.
- Husky git hooks run on `prepare`.
- The project uses `remix-island` for partial hydration of interactive components.
