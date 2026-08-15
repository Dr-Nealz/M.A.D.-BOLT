#!/usr/bin/env node
/**
 * Build a clean, flat, symlink-free node_modules containing exactly the
 * runtime dependencies of the Electron app, so electron-builder can pack
 * it without walking the pnpm virtual store (which is what hangs it).
 *
 * The renderer and server bundles are fully inlined by Vite, so the ONLY
 * runtime deps are those the Electron main process imports:
 *   electron-log, electron-store, electron-updater, @remix-run/node
 * plus their transitive closures.
 *
 * We compute the full closure, copy each package's real file tree (resolving
 * symlinks to real content) into a staging dir, then swap it in as
 * `node_modules` for the packaging step.
 */
import fs from "fs";
import path from "path";

const PROJECT = process.cwd();
const REAL_NM = path.join(PROJECT, "node_modules");          // pnpm store links
const PNPM = path.join(REAL_NM, ".pnpm");
const STAGING = path.join(PROJECT, ".node_modules-flat");    // our flat copy
const BACKUP = path.join(PROJECT, ".node_modules-pnpm");     // original, moved aside

// Entry points that the built main process needs at runtime.
const ENTRY = ["electron-log", "electron-store", "electron-updater", "@remix-run/node"];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function resolveReal(name) {
  const top = path.join(REAL_NM, name);
  if (fs.existsSync(top)) {
    try { return fs.realpathSync(top); } catch { return top; }
  }
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    const scoped = path.join(REAL_NM, scope, pkg);
    if (fs.existsSync(scoped)) {
      try { return fs.realpathSync(scoped); } catch { return scoped; }
    }
  }
  const encoded = name.replace(/\//g, "+");
  if (fs.existsSync(PNPM)) {
    for (const dir of fs.readdirSync(PNPM)) {
      if (!dir.startsWith(encoded + "@")) continue;
      const cand = path.join(PNPM, dir, "node_modules", name);
      if (fs.existsSync(cand)) {
        try { return fs.realpathSync(cand); } catch { return cand; }
      }
    }
  }
  return null;
}

// Copy a directory tree, resolving symlinks to real files/dirs.
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

// Compute transitive closure.
const seen = new Set();
const queue = [...ENTRY];
const missing = [];
while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  const realDir = resolveReal(name);
  if (!realDir) { missing.push(name); continue; }
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(realDir, "package.json"), "utf8")); } catch {}
  const deps = { ...(pkg.dependencies||{}), ...(pkg.peerDependencies||{}), ...(pkg.optionalDependencies||{}) };
  for (const d of Object.keys(deps)) queue.push(d);
}

console.log("Closure size:", seen.size, "packages");
if (missing.length) console.log("  MISSING:", missing.join(", "));

// Copy each into the flat node_modules.
rmrf(STAGING);
fs.mkdirSync(STAGING, { recursive: true });
let bytes = 0;
for (const name of seen) {
  const realDir = resolveReal(name);
  if (!realDir) continue;
  copyTree(realDir, path.join(STAGING, name));
  bytes += fs.statSync(path.join(STAGING, name)).size || 0;
}

function countSymlinks(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isSymbolicLink()) n++;
    if (e.isDirectory()) n += countSymlinks(f);
  }
  return n;
}

console.log("Flatten complete.");
console.log("  packages:", seen.size);
console.log("  size:", (bytes / 1024 / 1024).toFixed(1), "MB (top-level)");
console.log("  symlinks:", countSymlinks(STAGING));

// Swap: move real node_modules aside, put flat one in place.
rmrf(BACKUP);
fs.renameSync(REAL_NM, BACKUP);
fs.renameSync(STAGING, REAL_NM);
console.log("Swapped: node_modules -> flat copy, original -> .node_modules-pnpm");
