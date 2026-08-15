#!/usr/bin/env node
/**
 * Write ALL packages in build/app/node_modules as dependencies in
 * build/app/package.json (exact versions).
 *
 * electron-builder's npm collector runs `npm list` in the app dir. Packages
 * not declared in dependencies are "extraneous" and get NO path field →
 * collector includes nothing → node_modules is dropped from the package.
 * Declaring every installed package (with its real version) fixes that.
 */
import fs from "fs";
import path from "path";

const APP = path.join(process.cwd(), "build", "app");
const APP_NM = path.join(APP, "node_modules");
const PKG_PATH = path.join(APP, "package.json");

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const deps = {};

// Ensure the app package is ESM so build/server/index.js (ESM) loads.
pkg.type = "module";

// Collect every package dir directly under node_modules.
const entries = fs.readdirSync(APP_NM, { withFileTypes: true });
for (const e of entries) {
  if (!e.isDirectory()) continue;
  const pj = path.join(APP_NM, e.name, "package.json");
  if (!fs.existsSync(pj)) continue;
  let version;
  try { version = JSON.parse(fs.readFileSync(pj, "utf8")).version; } catch { continue; }
  if (version) deps[e.name] = version;
}

// Scoped packages live in @scope/ dirs.
for (const scope of fs.readdirSync(APP_NM, { withFileTypes: true })) {
  if (!scope.isDirectory() || !scope.name.startsWith("@")) continue;
  const scopeDir = path.join(APP_NM, scope.name);
  for (const sub of fs.readdirSync(scopeDir, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    const name = `${scope.name}/${sub.name}`;
    const pj = path.join(scopeDir, sub.name, "package.json");
    if (!fs.existsSync(pj)) continue;
    let version;
    try { version = JSON.parse(fs.readFileSync(pj, "utf8")).version; } catch { continue; }
    if (version) deps[name] = version;
  }
}

pkg.dependencies = deps;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Wrote ${Object.keys(deps).length} dependencies to ${PKG_PATH}`);
console.log("  sample:", JSON.stringify(Object.entries(deps).slice(0, 5)));
