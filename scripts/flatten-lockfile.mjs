#!/usr/bin/env node
/**
 * Build a correct, flat, symlink-free node_modules for the Electron app,
 * using the pnpm-lock.yaml for EXACT version resolution.
 *
 * Why: pnpm's node_modules is a virtual store of symlinks. electron-builder's
 * asar pack chokes on that walk. And naive flattening (resolve any matching
 * version) breaks packages like conf@14 which need ajv@8.17.1 (has
 * dist/2020.js), not ajv@6.12.6.
 *
 * This flattener resolves each package's deps via the lockfile snapshots,
 * which map every package to its EXACT resolved version. It then copies each
 * package's real file tree (resolving symlinks) into build/app/node_modules.
 */
import fs from "fs";
import path from "path";
import { pkgDeps, pkgVersions } from "./lockfile-parse.mjs";

const PROJECT = process.cwd();
const REAL_NM = path.join(PROJECT, "node_modules");
const PNPM = path.join(REAL_NM, ".pnpm");
const APP = path.join(PROJECT, "build", "app");
const DEST = path.join(APP, "node_modules");

// Runtime deps of the Electron main process (everything else is Vite-inlined).
const ENTRY = ["electron-log", "electron-store", "electron-updater", "@remix-run/node"];

// Map a lockfile resolvedKey to a package name. Keys may be:
//   '8.17.1'                          -> 'ajv'
//   '3.0.1(ajv@8.17.1)'               -> 'ajv-formats'
//   "'@remix-run/node@2.16.8(typescript@5.8.3)'" -> '@remix-run/node'
//   '@types/cookie@0.6.0'             -> '@types/cookie'
function keyToName(resolvedKey) {
  let k = resolvedKey.replace(/^'|'$/g, "");
  // strip peer-context suffix
  k = k.replace(/\(.*\)$/, "");
  // version suffix after last @
  // scoped: '@scope/name@1.2.3'
  const m = k.match(/^(.*)@([^@]+)$/);
  if (m) return m[1];
  return k;
}

function resolveStoreDir(name) {
  // Given a package name, find its version from the lockfile is ambiguous
  // (multiple versions). Instead, resolve by scanning the .pnpm store for the
  // exact version encoded in the resolvedKey we looked up. We'll do this in
  // the walker using exact versions.
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

// Resolve a package name to its real store dir, given the exact version
// that the lockfile chose for the DEPENDENT context.
function resolveExact(name, version) {
  // Try the .pnpm store dir named '<encoded>@<version>'
  const encoded = name.replace(/\//g, "+");
  const storeDir = path.join(PNPM, `${encoded}@${version}`, "node_modules", name);
  if (fs.existsSync(storeDir)) {
    try { return fs.realpathSync(storeDir); } catch { return storeDir; }
  }
  // Fallback: scan for matching version
  if (fs.existsSync(PNPM)) {
    for (const dir of fs.readdirSync(PNPM)) {
      if (!dir.startsWith(encoded + "@")) continue;
      const dVer = dir.slice(encoded.length + 1);
      if (dVer === version) {
        const cand = path.join(PNPM, dir, "node_modules", name);
        if (fs.existsSync(cand)) {
          try { return fs.realpathSync(cand); } catch { return cand; }
        }
      }
    }
  }
  return null;
}

// ── Walk the dependency graph via the lockfile ─────────────────
// queue items: { name, version }
const seen = new Map();  // name -> version (final resolved)
const queue = ENTRY.map((n) => {
  // Resolve entry version from the store (there may be multiple; pick the
  // one matching the lockfile for our runtime deps).
  const topLink = path.join(REAL_NM, n);
  const real = fs.realpathSync(topLink);
  // real is like .../.pnpm/electron-log@5.4.1/node_modules/electron-log
  const m = real.match(/\.pnpm\/([^\\/]+)@([^\\/(]+)/);
  return { name: n, version: m ? m[2] : null };
});

const order = []; // packages in copy order

while (queue.length) {
  const { name, version } = queue.shift();
  if (seen.has(name)) {
    // If already resolved to a different version and this one conflicts,
    // keep the first (pnpm dedupes by preferring the existing).
    continue;
  }
  seen.set(name, version);
  order.push({ name, version });

  // Find this package's snapshot key in the lockfile.
  // The snapshot key is '<name>@<version>' with optional peer context.
  // We search pkgDeps for a key whose name+version matches.
  let deps = {};
  const candidateKeys = [...pkgDeps.keys()].filter((k) => {
    const plain = k.replace(/^'|'$/g, "").replace(/\(.*\)$/, "");
    return plain === `${name}@${version}` || plain === name && version === null;
  });
  if (candidateKeys.length) {
    const key = candidateKeys[0];
    deps = pkgDeps.get(key) || {};
  }

  for (const [depName, depKey] of Object.entries(deps)) {
    const dName = keyToName(depKey);
    // Extract the version from the resolvedKey
    let dKeyClean = depKey.replace(/^'|'$/g, "").replace(/\(.*\)$/, "");
    const vm = dKeyClean.match(/@([^@]+)$/);
    const dVer = vm ? vm[1] : null;
    if (dName && dVer) queue.push({ name: dName, version: dVer });
  }
}

console.log("Resolved runtime dependency closure:", order.length, "packages");

// ── Copy each into the flat node_modules ───────────────────────
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
let bytes = 0;
const failed = [];
for (const { name, version } of order) {
  const realDir = resolveExact(name, version);
  if (!realDir) { failed.push(name + "@" + version); continue; }
  copyTree(realDir, path.join(DEST, name));
  bytes += fs.statSync(path.join(DEST, name)).size || 0;
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
console.log("  packages:", order.length);
console.log("  size:", (bytes / 1024 / 1024).toFixed(1), "MB");
console.log("  symlinks:", countSymlinks(DEST));
if (failed.length) console.log("  FAILED to resolve:", failed.join(", "));

// Validate the critical package that broke before:
const ajv2020 = path.join(DEST, "ajv", "dist", "2020.js");
console.log("  ajv/dist/2020.js exists:", fs.existsSync(ajv2020), ajv2020);
