#!/usr/bin/env node
import fs from "fs";
import path from "path";

const LOCK = path.join(process.cwd(), "pnpm-lock.yaml");
const text = fs.readFileSync(LOCK, "utf8");
const lines = text.split("\n");

const pkgDeps = new Map();
const pkgVersions = new Map();

function extractVersion(pkgKey) {
  const noPeers = pkgKey.replace(/\(.*\)$/, "");
  const m = noPeers.match(/@([^@]+)$/);
  return m ? m[1] : null;
}

let section = null;
let currentKey = null;
let inDeps = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line === "packages:") { section = "packages"; currentKey = null; inDeps = false; continue; }
  if (line === "snapshots:") { section = "snapshots"; currentKey = null; inDeps = false; continue; }
  if (section === null) continue;

  // Key header: 2-space indent, non-space, then ':' (optionally followed by ' {}')
  //   '  7zip-bin@5.2.0: {}'
  //   '  conf@14.0.0:'
  const mKey = line.match(/^  (\S.*?):(\s*\{(.*)\})?\s*$/);
  if (mKey) {
    currentKey = mKey[1];
    inDeps = false;
    if (!pkgDeps.has(currentKey)) pkgDeps.set(currentKey, {});
    if (section === "packages") {
      pkgVersions.set(currentKey, extractVersion(currentKey));
    }
    continue;
  }

  if (currentKey && section === "snapshots" && line === "    dependencies:") {
    inDeps = true;
    continue;
  }
  // Dep line: "      ajv: 8.17.1" (6 spaces) or "      '@scope/pkg': 1.0.0"
  if (currentKey && section === "snapshots" && inDeps && line.startsWith("      ") && line.includes(": ")) {
    const idx = line.indexOf(": ");
    const name = line.slice(6, idx).trim();
    const value = line.slice(idx + 2).trim();
    const deps = pkgDeps.get(currentKey);
    deps[name] = value;
  }
}

// Also read the importers section for the top-level deps' resolved keys.
// importers: .: dependencies: <name>: { specifier, version: <resolvedKey> }

console.log("Lockfile parsed.");
console.log("  packages entries:", pkgVersions.size);
console.log("  snapshots entries:", pkgDeps.size);
console.log("  conf@14.0.0 deps:", JSON.stringify(pkgDeps.get("conf@14.0.0")));
console.log("  ajv@8.17.1 version:", pkgVersions.get("ajv@8.17.1"));
console.log("  '@remix-run/node@2.16.8(typescript@5.8.3)' deps:", JSON.stringify(pkgDeps.get("@remix-run/node@2.16.8(typescript@5.8.3)")));

export { pkgDeps, pkgVersions };
