# WebContainer

**WebContainer** is the in-browser Node.js runtime that powers M.A.D. BOLT-REMIX's core experience. It runs your AI-generated code entirely in the browser tab — no remote server, no virtual machine.

## How It Works

When M.A.D. writes files for your project, they live in a sandboxed **virtual filesystem** inside WebContainer. A **live preview** and an **integrated terminal** (`@xterm/xterm`) reflect changes in real time.

- Runs a shell emulating **zsh**.
- Executes **JavaScript / WebAssembly only** — no native binaries.
- **Python** is limited to the standard library (no `pip`).
- **Git is not available** inside the container (use M.A.D.'s built-in Git integration instead).

## Available Commands

The container exposes a useful subset of tools:

```
cat, cd, chmod, clear, cp, curl, echo, env, exit, export,
false, getconf, head, hostname, jq, kill, ln, ls, mkdir, mv,
node, npm, ps, pwd, rm, rmdir, sort, source, tail, touch, true,
uname, uptime, which, wasm, xdg-open, xxd
```

## Common Tasks

### Installing dependencies

M.A.D. runs `npm install` for you when your app has a package manifest. You can also run it manually in the terminal.

### Running a dev server

Ask M.A.D. for a Vite project and it will scaffold one and start the dev server. The **live preview** pane updates as you (or the AI) edit files.

> **Note:** Native modules that require compilation aren't supported inside WebContainer. Prefer pure-JS or WASM packages.

## Limits & Best Practices

- No persistent storage across sessions — treat WebContainer as ephemeral.
- Keep apps small and dependency-light for best performance.
- Use the built-in **Git** integration (below) to save your work to GitHub.

## Related

- [Git & GitHub](/guide/git) — version-control your WebContainer project.
- [Deploy](/guide/deploy) — take your finished app to the cloud.
