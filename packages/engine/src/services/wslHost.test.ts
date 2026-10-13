import { describe, expect, it } from "vitest";

import { describeWslGpuFallback, detectWsl, type WslHostFacts } from "./wslHost.js";

const RENDER_NODE = "/dev/dri/renderD128";

function fakeHost(overrides: Partial<WslHostFacts> = {}): WslHostFacts {
  return {
    platform: "linux",
    release: "6.18.54.1-microsoft-standard-WSL2",
    readProcVersion: () => "Linux version 6.18.54.1-microsoft-standard-WSL2",
    exists: (path) => path === RENDER_NODE,
    canOpen: () => false,
    ...overrides,
  };
}

describe("detectWsl", () => {
  it("detects WSL from the kernel release", () => {
    expect(detectWsl(fakeHost({ readProcVersion: () => "" }))).toBe(true);
  });

  it("falls back to /proc/version when the release string is generic", () => {
    expect(detectWsl(fakeHost({ release: "6.8.0-45-generic" }))).toBe(true);
  });

  it("is false on plain Linux and on other platforms", () => {
    const plainLinux = fakeHost({
      release: "6.8.0-45-generic",
      readProcVersion: () => "Linux version 6.8.0-45-generic (buildd@ubuntu)",
    });
    expect(detectWsl(plainLinux)).toBe(false);
    expect(detectWsl(fakeHost({ platform: "win32" }))).toBe(false);
  });

  it("is false when /proc/version cannot be read", () => {
    const host = fakeHost({
      release: "6.8.0-45-generic",
      readProcVersion: () => {
        throw new Error("EACCES");
      },
    });
    expect(detectWsl(host)).toBe(false);
  });
});

describe("describeWslGpuFallback", () => {
  it("names the render group and the exact fix when the render node is not openable", () => {
    const note = describeWslGpuFallback(fakeHost());
    expect(note).toContain(`cannot open ${RENDER_NODE} (not in the "render" group)`);
    expect(note).toContain("sudo usermod -aG render $USER");
    expect(note).toContain("wsl --shutdown");
    expect(note).toContain("native Windows");
    expect(note).not.toContain("Docker");
  });

  it("does not blame permissions when the render node opens", () => {
    const note = describeWslGpuFallback(fakeHost({ canOpen: () => true }));
    expect(note).toContain(`${RENDER_NODE} opens fine, so file permissions are not the cause`);
    expect(note).not.toContain("usermod");
    expect(note).toContain("native Windows");
  });

  it("says the render node is missing when WSL exposes none", () => {
    const note = describeWslGpuFallback(fakeHost({ exists: () => false }));
    expect(note).toContain(`${RENDER_NODE} does not exist`);
    expect(note).not.toContain("usermod");
  });

  it("returns null outside WSL", () => {
    expect(describeWslGpuFallback(fakeHost({ platform: "darwin" }))).toBeNull();
  });
});
