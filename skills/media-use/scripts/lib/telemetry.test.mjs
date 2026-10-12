import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { optedOut } from "./telemetry.mjs";

// optedOut() also reads env vars; pin them to a neutral state for the whole
// file and restore everything (env + shared config) afterwards.
const ENV_KEYS = ["HYPERFRAMES_NO_TELEMETRY", "DO_NOT_TRACK", "CI", "NODE_ENV"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const configPath = join(homedir(), ".hyperframes", "config.json");
const savedConfig = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;

function writeConfig(contents) {
  if (contents === null) {
    rmSync(configPath, { force: true });
  } else {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, contents);
  }
}

test.before(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

test.after(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  writeConfig(savedConfig);
});

test("optedOut is false with no config and no opt-out env", () => {
  writeConfig(null);
  assert.equal(optedOut(), false);
});

test("optedOut honors telemetryEnabled: false from the shared config", () => {
  writeConfig(JSON.stringify({ telemetryEnabled: false }));
  assert.equal(optedOut(), true);
});

test("optedOut is false when the shared config enables telemetry", () => {
  writeConfig(JSON.stringify({ telemetryEnabled: true }));
  assert.equal(optedOut(), false);
});

test("optedOut treats an unreadable shared config as no opt-out", () => {
  writeConfig("{not json");
  assert.equal(optedOut(), false);
});

test("optedOut still honors the env opt-outs", () => {
  writeConfig(JSON.stringify({ telemetryEnabled: true }));
  process.env.DO_NOT_TRACK = "1";
  try {
    assert.equal(optedOut(), true);
  } finally {
    delete process.env.DO_NOT_TRACK;
  }
});
