import { afterEach, describe, expect, it, vi } from "vitest";
import type { Browser, PuppeteerNode } from "puppeteer-core";

const WSL_BROWSER_ENV = { PATH: "/usr/bin", DISPLAY: ":0" };

vi.mock("./wslHost.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./wslHost.js")>()),
  browserLaunchEnv: () => WSL_BROWSER_ENV,
}));

const {
  _resetAutoBrowserGpuModeCacheForTests,
  _resetBrowserPoolForTests,
  _setPuppeteerForTests,
  acquireBrowser,
  drainBrowserPool,
  resolveBrowserGpuMode,
} = await import("./browserManager.js");

// heygen-com/hyperframes#5548: the GPU probe and the render browser must start in the same env.
describe("browser launches under WSL", () => {
  afterEach(async () => {
    await drainBrowserPool();
    _resetBrowserPoolForTests();
    _resetAutoBrowserGpuModeCacheForTests();
    _setPuppeteerForTests(undefined);
    vi.restoreAllMocks();
  });

  it("start the GPU probe and the render browser without WSLg's WAYLAND_DISPLAY", async () => {
    const browser = {
      connected: true,
      newPage: vi.fn().mockResolvedValue({
        evaluate: vi.fn().mockResolvedValue({
          hasWebGL: true,
          vendor: "Google Inc. (Microsoft Corporation)",
          renderer: "ANGLE (Microsoft Corporation, D3D12 (NVIDIA GeForce RTX 4070 SUPER))",
        }),
      }),
      version: vi.fn().mockResolvedValue("HeadlessChrome/152.0.7977.30"),
      close: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      process: () => ({ kill: vi.fn(), killed: false }),
    } as unknown as Browser;
    const launch = vi.fn().mockResolvedValue(browser);
    _setPuppeteerForTests({ launch } as unknown as PuppeteerNode);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(await resolveBrowserGpuMode("auto", { platform: "linux" })).toBe("hardware");
    const lease = await acquireBrowser(["--no-sandbox"], { forceScreenshot: true });
    await lease.release();

    expect(launch).toHaveBeenCalledTimes(2);
    for (const [options] of launch.mock.calls) expect(options.env).toBe(WSL_BROWSER_ENV);
  });
});
