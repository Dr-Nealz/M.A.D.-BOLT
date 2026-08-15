// Uploads the M.A.D. BOLT-REMIX v1.0.0 release assets to GitHub.
// Streams the file body directly (no buffering) so 200+ MB uploads don't OOM.
// Pulls the token from Windows Credential Manager via a separate PS1 file.

import { createReadStream, statSync } from 'node:fs';
import { request } from 'node:https';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OWNER = 'Dr-Nealz';
const REPO  = 'M.A.D.-BOLT';
const RELEASE_ID = 371151834;
const TARGET_DIR = 'C:\\Users\\Dr.Neal\\Downloads\\bolt.diy-main\\dist';
const FILES = [
  'M.A.D. BOLT-REMIX-1.0.0-win-x64-setup.exe',
  'M.A.D. BOLT-REMIX-1.0.0-win-x64-portable.zip',
];

// Pull PAT from Windows Credential Manager (git:https://github.com) without printing it.
// The PS1 script is a hardcoded literal with NO user input interpolated — safe to execFile.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PS_SCRIPT = join(__dirname, 'get-pat.ps1');

function getToken() {
  const out = execFileSync('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT],
    { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }
  );
  const token = out.trim();
  if (!token) throw new Error('Could not retrieve PAT from Windows Credential Manager');
  return token;
}

function upload(token, file) {
  return new Promise((resolve, reject) => {
    const path = `${TARGET_DIR}\\${file}`;
    const size = statSync(path).size;
    const mb   = (size / 1048576).toFixed(1);
    console.log(`[upload] ${file} (${mb} MB) — streaming...`);
    const t0 = Date.now();

    const url = new URL(`https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${RELEASE_ID}/assets?name=${encodeURIComponent(file)}`);
    const req = request({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'mad-bolt-remix-setup',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
      },
    });

    req.on('response', (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const j = JSON.parse(body);
          console.log(`[ok ] ${file} -> ${j.browser_download_url}  (${dt}s, ${mb} MB)`);
          resolve(j);
        } else {
          console.error(`[err] ${file} HTTP ${res.statusCode}: ${body}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', (e) => { console.error(`[err] ${file} ${e.message}`); reject(e); });

    const stream = createReadStream(path);
    stream.on('error', (e) => { console.error(`[err] read ${file} ${e.message}`); reject(e); });
    stream.pipe(req);
  });
}

(async () => {
  const token = getToken();
  for (const f of FILES) {
    try {
      await upload(token, f);
    } catch (e) {
      process.exitCode = 1;
    }
  }
})();
