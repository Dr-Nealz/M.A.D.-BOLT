#!/usr/bin/env node
import fs from "fs";
import path from "path";

const PROJECT = process.cwd();
const RUNTIME_DEPS = ["electron-log", "electron-store", "electron-updater", "@remix-run/node"];

function dirSize(p) {
  let t = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    try {
      if (e.isDirectory()) t += dirSize(f);
      else t += fs.statSync(f).size;
    } catch {}
  }
  return t;
}

function countFiles(p) {
  let n = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    try {
      if (e.isDirectory()) n += countFiles(f);
      else n++;
    } catch {}
  }
  return n;
}

for (const dep of RUNTIME_DEPS) {
  const real = fs.realpathSync(path.join(PROJECT, "node_modules", dep));
  const mb = (dirSize(real) / 1024 / 1024).toFixed(1);
  const files = countFiles(real);
  console.log(dep, "->", real);
  console.log("   size:", mb, "MB, files:", files);

  // transitive deps
  const ownNM = path.join(real, "node_modules");
  if (fs.existsSync(ownNM)) {
    const subs = fs.readdirSync(ownNM);
    let subSize = 0, subFiles = 0;
    for (const s of subs) {
      try {
        const sr = fs.realpathSync(path.join(ownNM, s));
        subSize += dirSize(sr);
        subFiles += countFiles(sr);
      } catch {}
    }
    console.log("   transitive:", subs.length, "deps, size:", (subSize/1024/1024).toFixed(1), "MB, files:", subFiles);
  } else {
    console.log("   (no transitive deps)");
  }
}
