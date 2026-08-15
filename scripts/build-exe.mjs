#!/usr/bin/env node
/**
 * Bolt Local — Windows .EXE Builder
 *
 * Runs the full Electron build pipeline:
 *   1. Clean old artifacts
 *   2. Build renderer (Remix Vite)
 *   3. Build main + preload (Vite)
 *   4. Package Windows .exe (electron-builder)
 *
 * Usage:
 *   node scripts/build-exe.mjs
 *
 * NOTE: electron-builder.yml has signAndEditExecutable: false so
 * no code-signing tools / admin / symlinks are required.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = process.cwd();

// ── Colours ───────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function log(msg, color = C.reset) {
  console.log(`  ${color}${msg}${C.reset}`);
}

function header(title) {
  console.log(`\n${C.cyan}${C.bright}  === ${title} ===${C.reset}\n`);
}

// Runs a shell command (commands are hardcoded, no user input → safe)
function run(cmd) {
  log(`> ${cmd}`, C.dim);
  const out = execSync(cmd, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const line of out.split("\n").filter(Boolean)) {
    if (line.includes("✓ built")) log(line, C.green);
    else if (/error|Error|ELIFECYCLE|failed|cannot execute/.test(line))
      log(line, C.red);
    else if (/packaging|downloaded|electron-builder/.test(line))
      log(line, C.cyan);
    else log(line, C.dim);
  }
}

// ── Environment ───────────────────────────────────────────────
process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
process.env.CSC_ENABLE_CODE_SIGNING = "0";

// ── Step 0: Clean ─────────────────────────────────────────────
header("Cleaning old build artifacts");
for (const d of ["dist", "build"]) {
  const full = path.join(PROJECT_ROOT, d);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    log(`Removed: ${d}`, C.dim);
  }
}
log("Clean.", C.green);

// ── Step 1: Renderer ──────────────────────────────────────────
header("Building renderer (Remix Vite) ~2 min");
run("pnpm exec remix vite:build --config vite-electron.config.js");
log("Renderer: done", C.green);

// ── Step 2: Main + preload ────────────────────────────────────
header("Building main process");
run("pnpm exec vite build --config ./electron/main/vite.config.ts");
log("Main: done", C.green);

header("Building preload script");
run("pnpm exec vite build --config ./electron/preload/vite.config.ts");
log("Preload: done", C.green);

// ── Step 3: Prepare self-contained app dir ────────────────────
header("Preparing self-contained app dir (flat node_modules)");
run("node scripts/prepare-deploy.mjs");
log("Deploy dir: done", C.green);

// ── Step 4: Package .exe ──────────────────────────────────────
header("Packaging Windows .exe (NSIS installer)");
log("No code-signing needed (signAndEditExecutable: false)...", C.dim);
run("pnpm exec electron-builder --win");
log("Packaging: done", C.green);

// ── Done ──────────────────────────────────────────────────────
console.log(`\n${C.green}${C.bright}  === BUILD SUCCESSFUL ===${C.reset}`);

const DIST = path.join(PROJECT_ROOT, "dist");
const exes = [];
function findExes(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) findExes(full);
    else if (entry.endsWith(".exe")) exes.push(full);
  }
}
findExes(DIST);

if (exes.length) {
  for (const exe of exes) {
    const mb = (fs.statSync(exe).size / (1024 * 1024)).toFixed(1);
    log(`\n  File:  ${path.basename(exe)}`, C.bright);
    log(`  Path:  ${exe}`, C.dim);
    log(`  Size:  ${mb} MB`, C.dim);
  }
} else {
  log("No .exe found — check dist/", C.yellow);
}
console.log(`\n  ${C.dim}Output: ${DIST}${C.reset}\n`);
