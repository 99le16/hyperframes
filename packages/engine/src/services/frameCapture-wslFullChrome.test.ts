import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCaptureSession } from "./frameCapture.js";

const SHELL = "/cache/chrome-headless-shell";
const FULL_CHROME = "/cache/puppeteer/chrome/linux-152/chrome-linux64/chrome";
const launches: { args: string[]; chromePath?: string }[] = [];
let captureBrowser = SHELL;

vi.mock("./browserManager.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./browserManager.js")>()),
  resolveHeadlessShellPath: () => SHELL,
  resolveBrowserGpuMode: async () => "hardware",
  resolveCaptureBrowserPath: async () => captureBrowser,
  acquireBrowser: async (args: string[], config?: { chromePath?: string }) => {
    launches.push({ args, chromePath: config?.chromePath });
    throw new Error("launch recorded");
  },
}));

const dirs: string[] = [];
const platform = process.platform;
afterEach(() => {
  launches.length = 0;
  Object.defineProperty(process, "platform", { value: platform });
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

async function launchOnLinux() {
  Object.defineProperty(process, "platform", { value: "linux" });
  const dir = mkdtempSync(join(tmpdir(), "hf-wsl-full-chrome-"));
  dirs.push(dir);
  await expect(
    createCaptureSession(
      "http://localhost:0",
      dir,
      { width: 640, height: 360, fps: { num: 30, den: 1 }, format: "jpeg", requiresWebGpu: false },
      null,
      { forceScreenshot: false, browserGpuMode: "auto" },
    ),
  ).rejects.toThrow("launch recorded");
  return launches.at(-1)!;
}

describe("capture session under the WSL full-Chrome GPU route (#5548)", () => {
  it("launches the full Chrome the GPU probe chose, by screenshot", async () => {
    captureBrowser = FULL_CHROME;
    const launch = await launchOnLinux();
    expect(launch.chromePath).toBe(FULL_CHROME);
    expect(launch.args).not.toContain("--enable-begin-frame-control");
  });

  it("keeps BeginFrame on the headless shell", async () => {
    captureBrowser = SHELL;
    const launch = await launchOnLinux();
    expect(launch.chromePath).toBe(SHELL);
    expect(launch.args).toContain("--enable-begin-frame-control");
  });
});
