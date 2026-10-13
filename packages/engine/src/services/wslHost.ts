/**
 * WSL host detection and the explanation printed when Chrome's GPU check
 * falls back to software under WSL (heygen-com/hyperframes#5548).
 */

import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { platform, release } from "node:os";

/** The host facts these checks read; tests pass a fake. */
export interface WslHostFacts {
  platform: NodeJS.Platform;
  release: string;
  readProcVersion(): string;
  exists(path: string): boolean;
  canOpen(path: string): boolean;
}

const realHost: WslHostFacts = {
  get platform() {
    return platform();
  },
  get release() {
    return release();
  },
  readProcVersion: () => readFileSync("/proc/version", "utf-8"),
  exists: existsSync,
  canOpen: (path) => {
    try {
      accessSync(path, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  },
};

export function detectWsl(host: WslHostFacts = realHost): boolean {
  if (host.platform !== "linux") return false;
  try {
    const osRelease = host.release.toLowerCase();
    if (osRelease.includes("microsoft") || osRelease.includes("wsl")) return true;
    const procVersion = host.readProcVersion().toLowerCase();
    return procVersion.includes("microsoft") || procVersion.includes("wsl");
  } catch {
    return false;
  }
}

const RENDER_NODE = "/dev/dri/renderD128";

/** What we can check about a WSL GPU fallback and how to fix it; null outside WSL. */
export function describeWslGpuFallback(host: WslHostFacts = realHost): string | null {
  if (!detectWsl(host)) return null;
  const lines = [
    "[hyperframes] WSL: Chrome could not use the GPU, so this render uses software WebGL " +
      "(SwiftShader) and runs at CPU speed.",
  ];
  const nativeWindows =
    "render from native Windows (project copied to a Windows drive, run from PowerShell), " +
    "where Chrome uses the GPU through Direct3D.";
  if (host.exists(RENDER_NODE) && !host.canOpen(RENDER_NODE)) {
    lines.push(
      `  Your Linux user cannot open ${RENDER_NODE} (not in the "render" group), which can ` +
        "stop Mesa from reaching the GPU.",
      "  Fix: run `sudo usermod -aG render $USER`, then `wsl --shutdown` from Windows, " +
        "reopen WSL and render again.",
      `  Or ${nativeWindows}`,
    );
  } else {
    const state = host.exists(RENDER_NODE) ? "opens fine" : "does not exist";
    lines.push(
      `  ${RENDER_NODE} ${state}, so file permissions are not the cause.`,
      `  To use the GPU, ${nativeWindows}`,
    );
  }
  lines.push("  Pass --no-browser-gpu to skip the GPU check and render in software.");
  return lines.join("\n");
}
