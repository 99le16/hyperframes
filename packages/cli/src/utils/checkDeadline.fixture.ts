// fallow-ignore-file unused-file
import { dirname, join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { testProcessIsAlive, testProcessDescendants } from "./processTestUtils.js";

// Accelerate the hang after the independent authored marker confirms browser startup.
// Production still budgets startup; the unit test verifies that shared deadline.
const realSetTimeout = globalThis.setTimeout;
let armDeadline: (() => void) | undefined;
globalThis.setTimeout = ((
  callback: (...args: unknown[]) => void,
  delay?: number,
  ...args: unknown[]
) => {
  const timer = realSetTimeout(callback, delay, ...args);
  if (delay === 120_000) {
    armDeadline = () => {
      clearTimeout(timer);
      realSetTimeout(callback, 4_000, ...args);
      armDeadline = undefined;
    };
  }
  return timer;
}) as typeof setTimeout;
const pidFile = process.env.HF_TEST_BROWSER_PID_FILE;
if (!pidFile) throw new Error("Missing browser PID file");
// Observe cleanup when the command presents its report, before any exit hook runs.
const log = console.log.bind(console);
console.log = (...args: unknown[]) => {
  const [message] = args;
  if (typeof message === "string" && message.startsWith('{\n  "ok"') && existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8"));
    writeFileSync(`${pidFile}.report-browser-alive`, String(testProcessIsAlive(pid)));
  }
  log(...args);
};
const launch = puppeteer.launch.bind(puppeteer);
puppeteer.launch = async (options) => {
  const browser = await launch({ ...options, userDataDir: join(dirname(pidFile), "profile") });
  const pid = browser.process()?.pid;
  if (!pid) throw new Error("Browser did not expose its process");
  writeFileSync(pidFile, String(pid));
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async () => {
    const page = await newPage();
    page.on("console", (message) => {
      if (message.text() === "HF_TEST_SCRIPT_START") {
        writeFileSync(`${pidFile}.script`, "started");
        if (process.platform === "linux") {
          writeFileSync(
            `${pidFile}.tree`,
            JSON.stringify({
              pid,
              alive: testProcessIsAlive(pid),
              descendants: testProcessDescendants(pid),
            }),
          );
        }
        armDeadline?.();
      }
    });
    return page;
  };
  return browser;
};
await import("../cli.js");
