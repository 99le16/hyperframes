import type { Browser } from "puppeteer-core";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchManagedBrowser, closeManagedBrowser } from "../browser/launch.js";
import { captureBrowserArgs } from "./browserLaunchArgs.js";
import { startCaptureProxy } from "./captureProxy.js";

/** The launch-wide proxy covers pages, popups, workers and both extraction passes. */
export async function launchCaptureBrowser(options: {
  executablePath: string;
  protocolTimeout: number;
  disableWebgl: boolean;
  width: number;
  height: number;
}): Promise<{ browser: Browser; close(): Promise<void> }> {
  const proxy = await startCaptureProxy();
  let profile: string | undefined;
  try {
    const profilePath = await mkdtemp(join(tmpdir(), "hf-capture-profile-"));
    profile = profilePath;
    await mkdir(join(profile, "Default"));
    await writeFile(
      join(profile, "Default", "Preferences"),
      JSON.stringify({
        webrtc: { ip_handling_policy: "disable_non_proxied_udp" },
      }),
    );
    const puppeteer = await import("puppeteer-core");
    const browser = await launchManagedBrowser(puppeteer.default, {
      headless: true,
      userDataDir: profile,
      executablePath: options.executablePath,
      protocolTimeout: options.protocolTimeout,
      args: [
        ...captureBrowserArgs(options.disableWebgl, options.width, options.height),
        `--proxy-server=${proxy.url}`,
        "--proxy-bypass-list=<-loopback>",
        "--disable-quic",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
      ],
    });
    browser.once("disconnected", () => void proxy.close());
    return {
      browser,
      async close() {
        // Stop network admission even if Chromium's own shutdown fails.
        await proxy.close();
        try {
          await closeManagedBrowser(browser);
        } finally {
          await rm(profilePath, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    await proxy.close();
    if (profile) await rm(profile, { recursive: true, force: true });
    throw error;
  }
}
