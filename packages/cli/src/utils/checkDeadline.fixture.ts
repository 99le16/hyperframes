// fallow-ignore-file unused-file
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

// Exercise the public command with the production budget accelerated, not a new CLI knob.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((
  callback: (...args: unknown[]) => void,
  delay?: number,
  ...args: unknown[]
) => realSetTimeout(callback, delay === 120_000 ? 4_000 : delay, ...args)) as typeof setTimeout;
const pidFile = process.env.HF_TEST_BROWSER_PID_FILE;
if (!pidFile) throw new Error("Missing browser PID file");
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
      }
    });
    return page;
  };
  return browser;
};
await import("../cli.js");
