#!/usr/bin/env node
import fs from "fs";
import path from "path";

const PROJECT = process.cwd();
const REAL_NM = path.join(PROJECT, "node_modules");
const PNPM = path.join(REAL_NM, ".pnpm");
const ENTRY = ["electron-log", "electron-store", "electron-updater", "@remix-run/node"];

function resolveReal(name) {
  // 1. Top-level link (npm-style or pnpm's top-level symlink)
  const top = path.join(REAL_NM, name);
  if (fs.existsSync(top)) {
    try { return fs.realpathSync(top); } catch { return top; }
  }
  // 2. Scoped: node_modules/@scope/name
  if (name.startsWith("@")) {
    const [scope, pkg] = name.split("/");
    const scoped = path.join(REAL_NM, scope, pkg);
    if (fs.existsSync(scoped)) {
      try { return fs.realpathSync(scoped); } catch { return scoped; }
    }
  }
  // 3. Search .pnpm store dirs for the package (last-resort)
  //    .pnpm/<encoded>/node_modules/<name>
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

const seen = new Set();
const queue = [...ENTRY];
while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  const realDir = resolveReal(name);
  if (!realDir) { console.log("  MISSING:", name); continue; }
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(realDir, "package.json"), "utf8")); } catch {}
  const deps = { ...(pkg.dependencies||{}), ...(pkg.peerDependencies||{}), ...(pkg.optionalDependencies||{}) };
  for (const d of Object.keys(deps)) queue.push(d);
}
console.log("Closure:", seen.size, "packages:");
console.log([...seen].sort().join("\n"));
console.log("\n--- resolve check ---");
for (const n of seen) console.log(n, "->", resolveReal(n) || "NOT FOUND");
