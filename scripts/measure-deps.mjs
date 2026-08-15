#!/usr/bin/env node
import fs from "fs";
import path from "path";

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

for (const d of ["electron-log", "electron-store", "electron-updater", "@remix-run/node"]) {
  const link = path.join("node_modules", d);
  const real = fs.realpathSync(link);
  const mb = (dirSize(real) / 1024 / 1024).toFixed(1);
  console.log(d, "->", real, "size:", mb, "MB");
}
