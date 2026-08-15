#!/usr/bin/env node
/**
 * Prepare a self-contained deploy app directory for electron-builder.
 *
 * The root project uses pnpm, whose node_modules is a virtual store full of
 * symlinks. electron-builder auto-includes production dependencies from
 * package.json by walking node_modules — with pnpm that walk hits the whole
 * .pnpm store and hangs.
 *
 * Fix: build build/app/ containing:
 *   - a minimal package.json (only the 4 runtime deps the main process needs)
 *   - the built renderer/server/main/preload output
 *   - a FLAT, symlink-free node_modules with exactly the runtime dep closure
 *
 * Version resolution is lockfile-aware: each package's deps come from
 * pnpm-lock.yaml snapshots, which record the EXACT resolved version per
 * consumer. This avoids the classic flattening bug where conf@14 needs
 * ajv@8.17.1 (has dist/2020.js) but a naive resolver picks ajv@6.12.6 and the
 * app crashes with `Cannot find module 'ajv/dist/2020.js'`.
 */
import fs from "fs";
import path from "path";
import { pkgDeps } from "./lockfile-parse.mjs";

const PROJECT = process.cwd();
const ROOT_PKG = JSON.parse(fs.readFileSync(path.join(PROJECT, "package.json"), "utf8"));
const REAL_NM = path.join(PROJECT, "node_modules");
const PNPM = path.join(REAL_NM, ".pnpm");
const APP = path.join(PROJECT, "build", "app");
const APP_NM = path.join(APP, "node_modules");

// Runtime deps: the Electron main process deps + every module the server build
// imports at runtime. Vite marks these as external, so they MUST resolve from
// the packaged app's node_modules — otherwise Node walks up to the source tree
// and pulls in a SECOND copy of react (dual-React invalid hook call).
const RUNTIME_DEPS = [
  // electron main process
  "electron-log", "electron-store", "electron-updater", "@remix-run/node",
  // react + react-dom + friends (must be single-copy)
  "react", "react-dom", "scheduler", "react-router", "react-router-dom",
  "react-dnd", "react-dnd-html5-backend", "@remix-run/react", "@remix-run/cloudflare",
  "remix-island", "remix-utils",
  // state / data
  "nanostores", "@nanostores/react", "zustand",
  // LLM providers
  "ai", "@ai-sdk/openai", "@ai-sdk/anthropic", "@ai-sdk/cerebras", "@ai-sdk/cohere",
  "@ai-sdk/deepseek", "@ai-sdk/fireworks", "@ai-sdk/google", "@ai-sdk/mistral",
  "@ai-sdk/amazon-bedrock", "@openrouter/ai-sdk-provider", "ollama-ai-provider",
  // misc UI / utils imported by the server bundle
  "isbot", "chalk", "js-cookie", "zod", "framer-motion", "lucide-react",
  "react-toastify", "@radix-ui/react-dialog", "@radix-ui/react-tooltip",
  "class-variance-authority", "file-saver", "jszip", "ignore", "isomorphic-git",
  "react-qrcode-logo", "rehype-sanitize",
  "@modelcontextprotocol/sdk",
];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

/** Strip surrounding single quotes (scoped names are quoted in the lockfile). */
function unquote(s) {
  return s.replace(/^'|'$/g, "");
}

/** Strip a peer-context suffix, e.g. "2.16.8(typescript@5.8.3)" -> "2.16.8". */
function stripPeers(v) {
  return v.replace(/\(.*\)$/, "");
}

/**
 * Find the lockfile snapshot key for a package at a resolved version.
 * depValue may carry peer context: "2.16.8(typescript@5.8.3)".
 * A package can have multiple snapshot keys at the same version (one bare,
 * one or more with peer contexts). The bare key usually has EMPTY deps while
 * the peer-context key carries the real dependency tree (e.g.
 * "@remix-run/node@2.16.8" has {} but "@remix-run/node@2.16.8(typescript@5.8.3)"
 * has the full dep list). Prefer the key with the MOST deps.
 * Returns the full key (which keeps quotes for scoped packages) or null.
 */
function findSnapshot(name, depValue) {
  const base = stripPeers(depValue);
  const target = `${name}@${base}`;
  let best = null;
  let bestCount = -1;
  for (const key of pkgDeps.keys()) {
    if (unquote(key).replace(/\(.*\)$/, "") !== target) continue;
    const deps = pkgDeps.get(key);
    const count = deps ? Object.keys(deps).length : 0;
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  return best;
}

/**
 * Locate the real (symlink-free) install dir of a package in the .pnpm store.
 * Store dirs encode scoped names with '+' and peer contexts with '_':
 *   @remix-run+node@2.16.8_typescript@5.8.3
 */
function resolveStore(name, versionWithPeers) {
  const base = stripPeers(versionWithPeers);
  const encoded = name.replace(/\//g, "+");
  const direct = path.join(PNPM, `${encoded}@${base}`, "node_modules", name);
  if (fs.existsSync(direct)) return direct;
  if (fs.existsSync(PNPM)) {
    for (const dir of fs.readdirSync(PNPM)) {
      if (!dir.startsWith(encoded + "@")) continue;
      const rest = dir.slice(encoded.length + 1); // e.g. "2.16.8" or "2.16.8_typescript@5.8.3"
      if (rest === base || rest.startsWith(base + "_")) {
        const cand = path.join(PNPM, dir, "node_modules", name);
        if (fs.existsSync(cand)) return cand;
      }
    }
  }
  return null;
}

/** Copy a directory tree, resolving symlinks to real files/dirs. */
function copyTree(src, dest) {
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink()) {
    const real = fs.realpathSync(src);
    const r2 = fs.lstatSync(real);
    if (r2.isDirectory()) copyTree(real, dest);
    else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(real, dest);
    }
    return;
  }
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (e.name === ".bin" || e.name === ".cache") continue;
      copyTree(path.join(src, e.name), path.join(dest, e.name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function countSymlinks(dir) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isSymbolicLink()) n++;
    if (e.isDirectory()) n += countSymlinks(f);
  }
  return n;
}

// ── 1. Compute runtime dep closure (lockfile-aware) ────────────
const seen = new Map(); // name -> { version, storeDir }
const queue = [];
const missing = [];

for (const name of RUNTIME_DEPS) {
  // Resolve the entry version from the installed package.json.
  const top = path.join(REAL_NM, name, "package.json");
  let version = null;
  try {
    version = JSON.parse(fs.readFileSync(top, "utf8")).version;
  } catch {
    missing.push(name);
    continue;
  }
  queue.push({ name, version });
}

while (queue.length) {
  const { name, version } = queue.shift();
  // If we've already placed this package, only a DIFFERENT resolved version
  // needs to replace it (a later, stricter requirement wins over an earlier
  // lax one — e.g. conf needs ajv@8.17.1 even if a prior dep got ajv@6.12.6).
  const existing = seen.get(name);
  if (existing) {
    if (stripPeers(version) === stripPeers(existing.version)) continue;
    seen.delete(name);
  }
  const storeDir = resolveStore(name, version);
  if (!storeDir) { missing.push(`${name}@${version}`); continue; }
  seen.set(name, { version, storeDir });

  const snapKey = findSnapshot(name, version);
  const deps = snapKey ? pkgDeps.get(snapKey) : {};
  for (const [depName, depValue] of Object.entries(deps)) {
    const cleanName = unquote(depName);
    if (!cleanName) continue;
    queue.push({ name: cleanName, version: stripPeers(depValue) });
  }
}

console.log("Runtime closure (lockfile-aware):", seen.size, "packages");
if (missing.length) console.log("  MISSING:", missing.join(", "));

// ── 2. Fresh app dir ───────────────────────────────────────────
rmrf(APP);
fs.mkdirSync(APP, { recursive: true });

// ── 3. Copy built output ───────────────────────────────────────
// The main process hardcodes app.getAppPath()/build/{server,client,electron},
// so the built renderer/server/main/preload must live under build/ INSIDE the
// packaged app.
const APP_BUILD = path.join(APP, "build");
fs.mkdirSync(APP_BUILD, { recursive: true });
for (const d of ["client", "server", "electron"]) {
  const src = path.join(PROJECT, "build", d);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(APP_BUILD, d), { recursive: true });
    console.log("  copied build/", d, "-> app/build/", d);
  }
}
// Copy runtime shims (e.g. react-dom-server.mjs polyfill)
const SHIMS_SRC = path.join(PROJECT, "build", "shims");
if (fs.existsSync(SHIMS_SRC)) {
  fs.cpSync(SHIMS_SRC, path.join(APP_BUILD, "shims"), { recursive: true });
  console.log("  copied build/shims -> app/build/shims");
} else {
  // Create the shim on the fly if it doesn't exist (e.g. after clean build)
  const shimDir = path.join(APP_BUILD, "shims");
  fs.mkdirSync(shimDir, { recursive: true });
  fs.writeFileSync(
    path.join(shimDir, "react-dom-server.mjs"),
    `// Polyfill for renderToReadableStream for React 18 in Node.js.\n` +
    `import { renderToPipeableStream } from 'react-dom/server.node';\n` +
    `export function renderToReadableStream(element, options) {\n` +
    `  return new Promise((resolve, reject) => {\n` +
    `    let pipeable;\n` +
    `    try { pipeable = renderToPipeableStream(element, options); }\n` +
    `    catch (e) { reject(e); return; }\n` +
    `    const { readable, writable } = new TransformStream();\n` +
    `    pipeable.pipe(writable);\n` +
    `    pipeable.on('error', reject);\n` +
    `    resolve(readable);\n` +
    `  });\n` +
    `}\n`
  );
  console.log("  created build/shims/react-dom-server.mjs polyfill");
}
if (fs.existsSync(path.join(PROJECT, "electron-update.yml"))) {
  fs.copyFileSync(path.join(PROJECT, "electron-update.yml"), path.join(APP, "electron-update.yml"));
}

// ── 4. Flat node_modules ───────────────────────────────────────
fs.mkdirSync(APP_NM, { recursive: true });
let bytes = 0;
for (const [name, { storeDir }] of seen) {
  copyTree(storeDir, path.join(APP_NM, name));
  bytes += fs.statSync(path.join(APP_NM, name)).size || 0;
}
console.log(`  flat node_modules: ${seen.size} pkgs, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${countSymlinks(APP_NM)} symlinks`);

// ── 5. Minimal package.json ────────────────────────────────────
const deployPkg = {
  name: ROOT_PKG.name,
  version: ROOT_PKG.version,
  description: ROOT_PKG.description || "Bolt Local",
  author: ROOT_PKG.author || "Bolt Local",
  type: "module",
  main: "build/electron/main/index.mjs",
  dependencies: {},
};
for (const d of RUNTIME_DEPS) {
  const info = seen.get(d);
  if (info) deployPkg.dependencies[d] = info.version;
}
fs.writeFileSync(path.join(APP, "package.json"), JSON.stringify(deployPkg, null, 2));
console.log("  wrote package.json with deps:", RUNTIME_DEPS.join(", "));

// ── 6. Self-check: the package that broke before ───────────────
const ajv2020 = path.join(APP_NM, "ajv", "dist", "2020.js");
console.log("  self-check ajv/dist/2020.js:", fs.existsSync(ajv2020));
if (!fs.existsSync(ajv2020)) {
  const ajvPkg = path.join(APP_NM, "ajv", "package.json");
  let v = "?";
  try { v = JSON.parse(fs.readFileSync(ajvPkg, "utf8")).version; } catch {}
  console.error("  ERROR: ajv@" + v + " is in the bundle; conf needs ajv@8.17.1!");
  process.exitCode = 1;
}

console.log("\nDone. build/app/ ready.");
