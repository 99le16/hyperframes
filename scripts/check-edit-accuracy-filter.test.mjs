import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The edit accuracy bench is skipped when its path filter matches nothing, so every local file the
// jobs that build and run it execute must be in that filter, or a change to it skips the gate.
const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

function job(name) {
  const start = ci.indexOf(`\n  ${name}:\n`);
  assert.notEqual(start, -1, `job ${name} not found`);
  const rest = ci.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[a-z0-9_-]+:\n/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

function filterGlobs() {
  const block = ci.match(/\n {12}edit_accuracy:\n((?: {14}- .*\n)+)/);
  assert.ok(block, "edit_accuracy filter not found");
  return [...block[1].matchAll(/- "(.*)"/g)].map((m) => m[1]);
}

function globRegex(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (glob.startsWith("**/", i)) {
      re += "(?:.*/)?";
      i += 2;
    } else if (glob.startsWith("**", i)) {
      re += ".*";
      i += 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "{") re += "(?:";
    else if (c === "}") re += ")";
    else if (c === ",") re += "|";
    else re += c.replace(/[.+?^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function covered(path, globs) {
  const include = globs.filter((g) => !g.startsWith("!")).map(globRegex);
  const exclude = globs.filter((g) => g.startsWith("!")).map((g) => globRegex(g.slice(1)));
  return include.some((r) => r.test(path)) && !exclude.some((r) => r.test(path));
}

function localInputs(text) {
  const inputs = new Set();
  for (const m of text.matchAll(/uses: \.\/(\S+)/g)) inputs.add(`${m[1]}/action.yml`);
  for (const m of text.matchAll(/\b(?:bash|sh|node|bun) (scripts\/\S+)/g)) inputs.add(m[1]);
  if (/bun (?:install|run)\b|install-workspace-dependencies/.test(text)) {
    inputs.add("package.json");
    inputs.add("bun.lock");
  }
  return [...inputs];
}

test("the edit accuracy filter covers every local input of the jobs that build and run the bench", () => {
  const globs = filterGlobs();
  const inputs = ["build", "studio-edit-accuracy", "studio-edit-accuracy-gate"].flatMap((name) =>
    localInputs(job(name)),
  );
  assert.ok(inputs.includes("scripts/ci/install-workspace-dependencies.sh"));
  const missing = [...new Set(inputs)].filter((path) => !covered(path, globs));
  assert.deepEqual(missing, []);
});

test("the filter keeps the root manifest, lockfile and install script, and drops tests and docs", () => {
  const globs = filterGlobs();
  for (const path of [
    "package.json",
    "bun.lock",
    "scripts/ci/install-workspace-dependencies.sh",
    ".github/actions/prepare-ffmpeg-bin/action.yml",
    "packages/studio/src/App.tsx",
  ])
    assert.ok(covered(path, globs), `${path} should run the bench`);
  for (const path of [
    "packages/studio/src/App.test.tsx",
    "packages/core/src/README.md",
    "docs/index.mdx",
  ])
    assert.ok(!covered(path, globs), `${path} should not run the bench`);
});
