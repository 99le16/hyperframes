import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  finishSnapshotCleanup,
  ownSnapshotRun,
  planSnapshotCleanup,
  releaseSnapshotRun,
  retainSnapshotOutput,
  SNAPSHOT_GRACE_MS,
} from "./snapshotRuns.js";
import * as atomicFile from "@hyperframes/core/atomic-file";
import { finishSnapshotRun } from "./videoState.js";
import type { ArtifactRecord, VideoState } from "./videoState.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const now = Date.now();
function fixture() {
  const project = mkdtempSync(join(tmpdir(), "hf-run-retention-"));
  roots.push(project);
  const root = join(project, ".hyperframes", "artifacts", "snapshots");
  mkdirSync(root, { recursive: true });
  const state: VideoState = {
    version: 1,
    historyId: null,
    currentRevision: null,
    pendingChanges: false,
    files: {},
    revisions: {},
    checks: { latest: null, revisions: {}, unversioned: [] },
    snapshots: { latest: null, revisions: {}, unversioned: [] },
  };
  function run(age = SNAPSHOT_GRACE_MS * 2, revision: string | null = null) {
    const path = join(root, randomUUID());
    mkdirSync(join(path, "derived"), { recursive: true });
    writeFileSync(join(path, "frame.png"), "pixels");
    writeFileSync(join(path, "contact-sheet.jpg"), "sheet");
    writeFileSync(join(path, "derived", "description.md"), "words");
    const record: ArtifactRecord = {
      id: randomUUID(),
      scope: "root",
      image: join(path, "frame.png"),
      createdAt: now - age,
      contentHash: "hash",
      revision,
      inputFingerprint: "input",
      inputScope: "local-project-files",
      attribution: revision ? "recorded-revision" : "unversioned",
    };
    (revision ? (state.snapshots.revisions[revision] ??= []) : state.snapshots.unversioned).push(
      record,
    );
    utimesSync(path, new Date(now - age), new Date(now - age));
    return { path, record };
  }
  function fill() {
    for (let i = 0; i < 10; i++) run(SNAPSHOT_GRACE_MS + i);
  }
  function collect() {
    const plan = planSnapshotCleanup(project, state, now);
    finishSnapshotCleanup(project, plan);
    return plan;
  }
  return { project, root, state, run, fill, collect };
}

it("does not delete files when retiring references fails to persist, then retries", async () => {
  const f = fixture();
  const old = f.run();
  f.fill();
  const file = join(f.project, ".hyperframes", "video-state.json");
  writeFileSync(file, JSON.stringify(f.state));
  const persist = vi.spyOn(atomicFile, "replaceFileAtomically");
  persist.mockImplementationOnce(() => {
    throw new Error("disk full");
  });
  try {
    await expect(finishSnapshotRun(f.project, f.root)).rejects.toThrow("disk full");
    expect(existsSync(old.path)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8")).snapshots.unversioned[0].image).toBe(
      old.record.image,
    );
    await finishSnapshotRun(f.project, f.root);
    expect(existsSync(old.path)).toBe(false);
    expect(JSON.parse(readFileSync(file, "utf8")).snapshots.unversioned[0].status).toBe("cleaned");
  } finally {
    persist.mockRestore();
  }
});
it("accepts explicit managed output on a fresh project", () => {
  const f = fixture();
  rmSync(f.root, { recursive: true });
  const path = join(f.root, randomUUID());
  retainSnapshotOutput(f.project, path);
  expect(existsSync(join(path, ".user-output"))).toBe(true);
});

it.each(["frame.png", "derived/description.md"])(
  "preserves explicit --keep output %s inside an old run",
  (file) => {
    const f = fixture();
    const old = f.run();
    f.fill();
    const output = join(old.path, file);
    retainSnapshotOutput(f.project, dirname(output));
    retainSnapshotOutput(f.project, dirname(output));
    writeFileSync(output, "new pixels or words");
    utimesSync(
      old.path,
      new Date(now - SNAPSHOT_GRACE_MS * 3),
      new Date(now - SNAPSHOT_GRACE_MS * 3),
    );
    f.collect();
    expect(existsSync(old.path)).toBe(true);
  },
);

it("retires old unversioned records before deleting entire runs and derived files", () => {
  const f = fixture();
  const old = f.run();
  f.fill();
  const plan = planSnapshotCleanup(f.project, f.state, now);
  expect(old.record.image).toBeUndefined();
  expect(old.record.status).toBe("cleaned");
  expect(existsSync(join(old.path, "contact-sheet.jpg"))).toBe(true);
  finishSnapshotCleanup(f.project, plan);
  expect(existsSync(old.path)).toBe(false);
});
it("bounds repeated current-revision runs while preserving the newest evidence", () => {
  const f = fixture();
  f.state.currentRevision = "r1";
  const old = f.run(SNAPSHOT_GRACE_MS * 3, "r1");
  const latest = f.run(SNAPSHOT_GRACE_MS * 2, "r1");
  f.fill();
  f.state.snapshots.latest = { revision: "r1", id: latest.record.id };
  f.collect();
  expect(existsSync(old.path)).toBe(false);
  expect(existsSync(latest.path)).toBe(true);
  expect(f.state.snapshots.latest?.id).toBe(latest.record.id);
});
it("keeps recent runs, latest evidence, retained rendered revisions and pending file cleanup", () => {
  const f = fixture();
  const latest = f.run();
  const rendered = f.run(undefined, "rendered");
  const pending = f.run();
  f.state.renders = { latest: null, retainedRevisions: ["rendered"] };
  f.state.snapshots.latest = { revision: null, id: latest.record.id };
  f.state.pendingArtifactCleanup = [
    {
      path: pending.record.image!,
      kind: "snapshots",
      revision: "old",
      id: pending.record.id,
      hash: "hash",
    },
  ];
  delete pending.record.image;
  pending.record.status = "cleaned";
  f.fill();
  const recent = f.run(1000);
  f.collect();
  for (const item of [latest, rendered, pending, recent]) expect(existsSync(item.path)).toBe(true);
});
it("protects live captures then releases completed runs in the same long-lived process", () => {
  const f = fixture();
  const path = join(f.root, randomUUID());
  ownSnapshotRun(f.project, path);
  writeFileSync(join(path, "frame.png"), "capture");
  utimesSync(path, new Date(now - SNAPSHOT_GRACE_MS * 3), new Date(now - SNAPSHOT_GRACE_MS * 3));
  f.fill();
  f.collect();
  expect(existsSync(path)).toBe(true);
  releaseSnapshotRun(f.project, path);
  // Removing the lease starts the grace period again.
  utimesSync(path, new Date(now - SNAPSHOT_GRACE_MS * 3), new Date(now - SNAPSHOT_GRACE_MS * 3));
  f.collect();
  expect(existsSync(path)).toBe(false);
});
it("reclaims crashed captures but preserves malformed owner metadata", () => {
  const f = fixture();
  const crashed = f.run();
  const malformed = f.run();
  writeFileSync(
    join(crashed.path, ".capture-owner.json"),
    JSON.stringify({ version: 1, pid: 2147483647 }),
  );
  writeFileSync(join(malformed.path, ".capture-owner.json"), "broken");
  for (const item of [crashed, malformed])
    utimesSync(
      item.path,
      new Date(now - SNAPSHOT_GRACE_MS * 3),
      new Date(now - SNAPSHOT_GRACE_MS * 3),
    );
  f.fill();
  f.collect();
  expect(existsSync(crashed.path)).toBe(false);
  expect(existsSync(malformed.path)).toBe(true);
});
it("does not traverse directory symlinks or delete arbitrary output directories", () => {
  const f = fixture();
  const outside = mkdtempSync(join(tmpdir(), "hf-external-"));
  roots.push(outside);
  writeFileSync(join(outside, "keep.png"), "keep");
  symlinkSync(outside, join(f.root, randomUUID()), "dir");
  mkdirSync(join(f.root, "custom-output"));
  const old = f.run();
  symlinkSync(outside, join(old.path, "external"), "dir");
  utimesSync(
    old.path,
    new Date(now - SNAPSHOT_GRACE_MS * 3),
    new Date(now - SNAPSHOT_GRACE_MS * 3),
  );
  f.fill();
  f.collect();
  expect(existsSync(old.path)).toBe(false);
  expect(readFileSync(join(outside, "keep.png"), "utf8")).toBe("keep");
  expect(existsSync(join(f.root, "custom-output"))).toBe(true);
});
it("refuses a symlinked managed root", () => {
  const f = fixture();
  rmSync(f.root, { recursive: true });
  const outside = mkdtempSync(join(tmpdir(), "hf-root-link-"));
  roots.push(outside);
  symlinkSync(outside, f.root, "dir");
  expect(planSnapshotCleanup(f.project, f.state, now)).toEqual([]);
  expect(() => ownSnapshotRun(f.project, join(f.root, randomUUID()))).toThrow("symlinks");
});
it("revalidates identity and activity after a deletion plan is persisted", () => {
  const f = fixture();
  const old = f.run();
  f.fill();
  const plan = planSnapshotCleanup(f.project, f.state, now);
  writeFileSync(join(old.path, "new.png"), "new activity");
  finishSnapshotCleanup(f.project, plan);
  expect(existsSync(old.path)).toBe(true);
});
it("treats a disappearing managed root as best-effort cleanup", () => {
  const f = fixture();
  rmSync(f.root, { recursive: true });
  expect(f.collect()).toEqual([]);
});
