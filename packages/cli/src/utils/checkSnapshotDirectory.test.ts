import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  beginCheckSnapshots,
  checkSnapshotDirectory,
  finishCheckSnapshots,
} from "./checkSnapshotDirectory.js";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
it("keeps a shared check capture leased until all concurrent checks finish", async () => {
  const project = mkdtempSync(join(tmpdir(), "hf-check-capture-"));
  roots.push(project);
  beginCheckSnapshots(project);
  beginCheckSnapshots(project);
  const path = checkSnapshotDirectory(project);
  expect(checkSnapshotDirectory(project)).toBe(path);
  await finishCheckSnapshots(project);
  expect(existsSync(join(path, ".capture-owner.json"))).toBe(true);
  expect(checkSnapshotDirectory(project)).toBe(path);
  await finishCheckSnapshots(project);
  expect(existsSync(join(path, ".capture-owner.json"))).toBe(false);
  beginCheckSnapshots(project);
  const next = checkSnapshotDirectory(project);
  expect(next).not.toBe(path);
  await finishCheckSnapshots(project);
});
