import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { mockTelemetry } from "./cliDispatchTestUtils.js";

const originalArgv = [...process.argv];
const originalExitCode = process.exitCode;
const dirs: string[] = [];
afterEach(() => {
  process.argv = [...originalArgv];
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const path of [
    "./commands/capture.js",
    "./commands/init.js",
    "./telemetry/index.js",
    "./telemetry/events.js",
  ])
    vi.doUnmock(path);
  vi.resetModules();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it.each([
  ["capture", false, undefined, "fixture-key", undefined],
  ["capture", true, undefined, undefined, undefined],
  ["init", false, process.execPath, "fixture-key", undefined],
  ["init", true, process.execPath, "fixture-key", undefined],
  ["capture", false, process.execPath, "fixture-key", process.execPath],
] as const)(
  "applies CWD dotenv policy at real CLI startup: %s, opt-out=%s",
  async (command, skip, browser, key, inheritedBrowser) => {
    const dir = mkdtempSync(join(tmpdir(), "hf-cli-dotenv-"));
    dirs.push(dir);
    writeFileSync(
      join(dir, ".env"),
      `HYPERFRAMES_BROWSER_PATH=${process.execPath}\nNODE_OPTIONS=--no-warnings\nGEMINI_API_KEY=fixture-key\n`,
    );
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    vi.stubEnv("HYPERFRAMES_BROWSER_PATH", inheritedBrowser);
    vi.stubEnv("NODE_OPTIONS", undefined);
    vi.stubEnv("GEMINI_API_KEY", undefined);
    vi.stubEnv("HYPERFRAMES_NO_CAPTURE_DOTENV", skip ? "1" : undefined);
    let observed: unknown;
    const definition = {
      default: {
        meta: { name: command },
        args: {},
        run: () => {
          observed = [
            process.env.HYPERFRAMES_BROWSER_PATH,
            process.env.NODE_OPTIONS,
            process.env.GEMINI_API_KEY,
          ];
        },
      },
    };
    vi.doMock("./commands/capture.js", () => definition);
    vi.doMock("./commands/init.js", () => definition);
    mockTelemetry();
    process.argv = ["node", "cli.ts", command];
    await import("./cli.js");
    expect(observed).toEqual([browser, command === "capture" ? undefined : "--no-warnings", key]);
  },
);
