import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

// A skills-only install: the launcher sits three levels below a root that has
// neither a plugin manifest nor a built checkout, and HOME has no checkout either.
function standaloneLayout() {
  const root = mkdtempSync(join(tmpdir(), "embedded-captions-hf-cli-"));
  const scripts = join(root, "skills", "embedded-captions", "scripts");
  mkdirSync(scripts, { recursive: true });
  for (const name of ["hf-cli.cjs", "standalone-cli.cjs"])
    copyFileSync(join(here, name), join(scripts, name));
  return { root, scripts };
}

function resolveCli(scripts, root, env = {}) {
  const home = join(root, "home");
  mkdirSync(home, { recursive: true });
  const clean = { ...process.env, HOME: home, USERPROFILE: home, ...env };
  delete clean.HYPERFRAMES_ROOT;
  Object.assign(clean, env);
  return execFileSync(process.execPath, [join(scripts, "hf-cli.cjs")], {
    encoding: "utf8",
    env: clean,
  }).trim();
}

test("a standalone skills install falls back to the npx launcher", () => {
  const { root, scripts } = standaloneLayout();
  try {
    assert.equal(resolveCli(scripts, root), join(scripts, "standalone-cli.cjs"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a built checkout named by HYPERFRAMES_ROOT still wins over the fallback", () => {
  const { root, scripts } = standaloneLayout();
  try {
    const cliDir = join(root, "hf", "packages", "cli", "dist");
    mkdirSync(cliDir, { recursive: true });
    writeFileSync(join(cliDir, "cli.js"), "");
    assert.equal(
      resolveCli(scripts, root, { HYPERFRAMES_ROOT: join(root, "hf") }),
      join(cliDir, "cli.js"),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the fallback runs the published CLI through npx and pins the requested version", async () => {
  const { invocation } = await import("./standalone-cli.cjs");
  const posix = invocation(
    ["render", "-o", "out.mp4"],
    { PATH: "/usr/bin" },
    "linux",
    "/usr/bin/node",
  );
  assert.deepEqual(posix.command, "npx");
  assert.deepEqual(posix.args, ["--yes", "hyperframes@latest", "render", "-o", "out.mp4"]);
  assert.equal(posix.env.HYPERFRAMES_SKIP_SKILLS, "1");
  const pinned = invocation(
    ["check"],
    { HYPERFRAMES_CLI_VERSION: "0.8.149" },
    "linux",
    "/usr/bin/node",
  );
  assert.equal(pinned.args[1], "hyperframes@0.8.149");
});
