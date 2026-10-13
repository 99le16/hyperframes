import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import {
  testProcessDescendants,
  testProcessIsAlive,
  waitForTestCondition,
} from "./processTestUtils.js";

it("check names a non-finishing child script, exits non-zero, and closes its browser", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-check-deadline-"));
  const pidFile = join(dir, "browser.pid");
  mkdirSync(join(dir, "compositions"));
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html><body>
<div data-composition-id="main" data-width="320" data-height="180" data-duration="1">
<div data-composition-id="hang" data-composition-src="compositions/hang.html" data-start="0" data-duration="1"></div>
</div><script>window.__timelines.main={duration:()=>1,seek:()=>{},pause:()=>{}};</script></body></html>`,
  );
  writeFileSync(
    join(dir, "compositions/hang.html"),
    `<template id="hang">
<div data-composition-id="hang"><div id="box" style="width:1px;height:1px"></div>
<script>console.debug("HF_TEST_SCRIPT_START");const el=document.getElementById("box");while(el.offsetWidth<2){el.style.height="1px";}</script>
</div></template>`,
  );
  const fixture = join(dirname(fileURLToPath(import.meta.url)), "checkDeadline.fixture.ts");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      fixture,
      "check",
      "--json",
      "--no-browser-gpu",
      "--timeout=500",
      "--samples=1",
      dir,
    ],
    {
      env: { ...process.env, HF_TEST_BROWSER_PID_FILE: pidFile },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  let stdout = "";
  child.stdout.on("data", (data: Buffer) => {
    output += data.toString();
    stdout += data.toString();
  });
  child.stderr.on("data", (data: Buffer) => {
    output += data.toString();
  });
  const done = new Promise<number | null>((resolve) => child.once("exit", resolve));
  let browserPid: number | undefined;
  let descendants: number[] = [];
  try {
    await waitForTestCondition(() => existsSync(pidFile) || child.exitCode !== null, 15_000);
    if (!existsSync(pidFile)) throw new Error(output);
    browserPid = Number(readFileSync(pidFile, "utf8"));
    expect(testProcessIsAlive(browserPid)).toBe(true);
    await waitForTestCondition(() => existsSync(`${pidFile}.script`), 5_000);
    descendants = process.platform === "linux" ? testProcessDescendants(browserPid) : [];
    if (process.platform === "linux") expect(descendants.length).toBeGreaterThan(0);
    await waitForTestCondition(() => child.exitCode !== null, 12_000);
    expect(await done).toBe(1);
    const report = JSON.parse(stdout.slice(stdout.indexOf('{\n  "ok"')));
    expect(report.ok).toBe(false);
    expect(report.runtime.findings).toContainEqual(
      expect.objectContaining({
        severity: "error",
        sourceFile: "compositions/hang.html",
        message: expect.stringContaining("script did not finish"),
      }),
    );
    const ownedPid = browserPid;
    await waitForTestCondition(() => !testProcessIsAlive(ownedPid), 5_000);
    await waitForTestCondition(() => descendants.every((pid) => !testProcessIsAlive(pid)), 5_000);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await waitForTestCondition(
        () => child.exitCode !== null || child.signalCode !== null,
        5_000,
      ).catch(() => undefined);
    }
    for (const pid of [...descendants, ...(browserPid === undefined ? [] : [browserPid])]) {
      if (testProcessIsAlive(pid)) process.kill(pid, "SIGKILL");
    }
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}, 45_000);
