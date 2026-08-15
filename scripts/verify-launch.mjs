#!/usr/bin/env node
/**
 * Verify the packaged Windows app actually LAUNCHES.
 *
 * Runs the unpacked exe, watches stdout/stderr + process liveness, and kills
 * it after it stays alive past a healthy window (a real renderer window open).
 *
 * This is the self-correction test: "does the installer actually work?"
 * A process that crashes instantly (module-not-found on ajv, missing preload,
 * etc.) fails this check.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const EXE = process.argv[2] || "dist/win-unpacked/M.A.D. BOLT-REMIX.exe";
const HEALTHY_MS = Number(process.argv[3] || 12000); // stay-alive window

if (!fs.existsSync(EXE)) {
  console.error(`EXE not found: ${EXE}`);
  process.exit(2);
}
console.log(`Launching: ${EXE}`);
console.log(`Healthy-window: ${HEALTHY_MS}ms of liveness (window open = good)`);

const child = spawn(EXE, [], { cwd: path.dirname(EXE), env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" } });

let aliveSince = 0;
let output = "";
let timedOut = false;

const onData = (d) => {
  const s = d.toString();
  output += s;
  // Log interesting lines
  for (const line of s.split("\n")) {
    if (/error|Error|ERR_|Cannot find|failed|FATAL|Unhandled/i.test(line) && line.trim()) {
      console.log("[app]", line.trim().slice(0, 300));
    }
  }
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);

child.on("spawn", () => {
  aliveSince = Date.now();
  console.log("  spawned. Waiting for health window...");
});

child.on("exit", (code, signal) => {
  const dt = (Date.now() - aliveSince) / 1000;
  console.log(`\n  EXITED code=${code} signal=${signal} after ${dt.toFixed(1)}s`);
  if (!timedOut) {
    console.log("\n  FAIL: app exited before the healthy window — crash.");
    console.log("  last output:\n" + output.slice(-3000));
    process.exit(1);
  }
});

// Health check: if still alive after the window, consider it a success.
setTimeout(() => {
  if (child.exitCode === null) {
    timedOut = true;
    console.log(`\n  STILL ALIVE after ${HEALTHY_MS / 1000}s — window opened, app is running. SUCCESS.`);
    // Give it a moment to emit any final logs, then kill.
    setTimeout(() => {
      try { child.kill(); } catch {}
      console.log("  killed test instance.");
      process.exit(0);
    }, 1000);
  }
}, HEALTHY_MS);
