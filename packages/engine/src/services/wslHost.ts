import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { platform, release } from "node:os";

export type RenderNodeAccess =
  | { state: "missing" | "read-write" }
  | { state: "denied"; group: string; userInGroup: boolean };

/** The host facts these checks read; tests pass a fake. */
export interface WslHostFacts {
  platform: NodeJS.Platform;
  release: string;
  readProcVersion(): string;
  renderNodeAccess(path: string): RenderNodeAccess;
}

function groupName(gid: number): string {
  try {
    const line = readFileSync("/etc/group", "utf-8")
      .split("\n")
      .find((entry) => entry.split(":")[2] === String(gid));
    return line?.split(":")[0] || String(gid);
  } catch {
    return String(gid);
  }
}

const realHost: WslHostFacts = {
  get platform() {
    return platform();
  },
  get release() {
    return release();
  },
  readProcVersion: () => readFileSync("/proc/version", "utf-8"),
  renderNodeAccess: (path) => {
    if (!existsSync(path)) return { state: "missing" };
    try {
      accessSync(path, constants.R_OK | constants.W_OK);
      return { state: "read-write" };
    } catch {
      const gid = statSync(path, { throwIfNoEntry: false })?.gid ?? -1;
      return {
        state: "denied",
        group: groupName(gid),
        userInGroup: process.getgroups?.().includes(gid) ?? false,
      };
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

// Chrome 150+ under WSLg picks Wayland EGL, which has no offscreen configs: https://issues.chromium.org/issues/567222741
export function browserLaunchEnv(
  host: WslHostFacts = realHost,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv | undefined {
  if (env.WAYLAND_DISPLAY === undefined || !detectWsl(host)) return undefined;
  const { WAYLAND_DISPLAY: _wslgCompositor, ...rest } = env;
  return rest;
}

const RENDER_NODE = "/dev/dri/renderD128";

const NATIVE_WINDOWS =
  "render from native Windows (project copied to a Windows drive, run from PowerShell), " +
  "where Chrome uses the GPU through Direct3D.";

/**
 * Indented lines saying what we checked on the WSL GPU path and what to try,
 * or null outside WSL. Says nothing about the render mode: callers own that.
 */
export function describeWslGpuAccess(host: WslHostFacts = realHost): string[] | null {
  if (!detectWsl(host)) return null;
  const access = host.renderNodeAccess(RENDER_NODE);
  if (access.state === "denied" && !access.userInGroup) {
    return [
      `  Your Linux user cannot read and write ${RENDER_NODE} and is not in its group ` +
        `("${access.group}"), which can stop Mesa from reaching the GPU.`,
      `  Fix: run \`sudo usermod -aG ${access.group} $USER\`, then \`wsl --shutdown\` from ` +
        "Windows, reopen WSL and render again.",
      `  Or ${NATIVE_WINDOWS}`,
    ];
  }
  if (access.state === "denied") {
    return [
      `  Your Linux user is in the "${access.group}" group but still cannot read and write ` +
        `${RENDER_NODE}; check its permissions with \`ls -l ${RENDER_NODE}\`.`,
      `  Or ${NATIVE_WINDOWS}`,
    ];
  }
  const seen = access.state === "missing" ? "does not exist" : "is readable and writable";
  return [
    `  ${RENDER_NODE} ${seen}, so file permissions are not the cause.`,
    `  To use the GPU, ${NATIVE_WINDOWS}`,
  ];
}
