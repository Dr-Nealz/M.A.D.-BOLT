#!/usr/bin/env node
/**
 * Inspect which package versions are inside a packaged app.asar.
 * Parses the asar header directly (no @electron/asar dep needed).
 *
 * Usage: node scripts/check-asar.mjs <path-to-app.asar> [package-name-filter]
 */
import fs from "fs";

const ASAR = process.argv[2] || "dist/win-unpacked/resources/app.asar";
const FILTER = process.argv[3] || "ajv";

const fd = fs.openSync(ASAR, "r");
const b = Buffer.alloc(16);
fs.readSync(fd, b, 0, 16, 0);
const headerLen = b.readUInt32LE(4);       // asar "pickle" header size
const headerStart = 16 + 8;                // 16-byte lead + 8-byte pickle size prefix
const hb = Buffer.alloc(headerLen);
fs.readSync(fd, hb, 0, hb.length, headerStart);
let header;
// The JSON may be padded/offset by a few bytes; find the first '{' and the
// matching final '}' (depth 0) to bound the parse.
const jsonStart = hb.indexOf(0x7b); // '{'
if (jsonStart < 0) {
  console.error("No JSON header found in asar.");
  process.exit(1);
}
let depth = 0, jsonEnd = -1, inStr = false, esc = false;
for (let i = jsonStart; i < hb.length; i++) {
  const c = hb[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === 0x5c) esc = true;
    else if (c === 0x22) inStr = false;
    continue;
  }
  if (c === 0x22) inStr = true;
  else if (c === 0x7b) depth++;
  else if (c === 0x7d) { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
}
if (jsonEnd < 0) {
  console.error("Unterminated JSON header in asar.");
  process.exit(1);
}
try {
  header = JSON.parse(hb.toString("utf8", jsonStart, jsonEnd));
} catch (e) {
  console.error("Header parse failed:", e.message);
  process.exit(1);
}
// data section starts after header block.
// asar format: [4B header-size][4B data-size][8B header-pickle-size][header-JSON]
// then data. The JSON payload begins after an 8-byte pickle-size prefix (so the
// file offset of the JSON start is headerStart), and each file record's offset
// is relative to a data base that empirically sits a few bytes before
// 16 + 8 + headerLen. We read records with a small lead-in window so the JSON
// 'package.json' start is always captured.
const dataStart = 16 + 8 + headerLen - 8;

// Walk tree, collect dirs containing package.json.
// Newer asar headers have no wrapper "files" — the top-level dirs ARE the
// direct keys (e.g. "node_modules": { files: {...} }).
const dirs = [];
function walkDirEntry(v, pathArr) {
  if (!v || typeof v !== "object") return;
  if (v.files && typeof v.files === "object") {
    for (const [k, sub] of Object.entries(v.files)) {
      const np = [...pathArr, k];
      if (typeof sub === "object" && sub !== null && sub.files) {
        if (sub.files["package.json"]) dirs.push({ path: np.join("/"), pkg: sub.files["package.json"] });
        walkDirEntry(sub, np);
      } else if (typeof sub === "object" && sub !== null) {
        // file record (size/offset) — not a dir
      }
    }
  }
}
// Root dirs are the header's own dir entries (each has a "files" key).
for (const [k, v] of Object.entries(header)) {
  if (v && typeof v === "object" && v.files) {
    walkDirEntry(v, [k]);
  }
}

console.log("total package dirs in asar:", dirs.length);

function readFileRecord(rec) {
  const offset = parseInt(rec.offset, 10);
  const size = rec.size;
  const buf = Buffer.alloc(size);
  fs.readSync(fd, buf, 0, size, dataStart + offset);
  return buf.toString("utf8");
}

// For package.json records the JSON payload starts a few bytes after the
// record's offset (the file begins with a pickle/string length prefix). Probe
// for the first '{' and the last '}' to read the version reliably.
function readPackageVersion(rec) {
  const offset = parseInt(rec.offset, 10);
  const size = rec.size;
  const buf = Buffer.alloc(size + 16);
  fs.readSync(fd, buf, 0, buf.length, dataStart + offset);
  const s = buf.toString("utf8");
  const st = s.indexOf("{");
  if (st < 0) throw new Error("no JSON start found");
  const en = s.lastIndexOf("}");
  const pj = JSON.parse(s.slice(st, en + 1));
  return pj.version;
}

const hits = dirs.filter((d) => d.path.toLowerCase().includes(FILTER.toLowerCase()));
console.log(`dirs matching "${FILTER}":`, hits.length);
for (const d of hits) {
  try {
    const version = readPackageVersion(d.pkg);
    console.log(`  ${d.path}  ->  v${version}`);
  } catch (e) {
    console.log(`  ${d.path}  ->  (unreadable: ${e.message})`);
  }
}

fs.closeSync(fd);
