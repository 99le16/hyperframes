import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ArtifactRecord, VideoState } from "./videoState.js";

const SNAPSHOT_RUNS_TO_KEEP = 10;
export const SNAPSHOT_GRACE_MS = 24 * 60 * 60 * 1000;
const OWNER = ".capture-owner.json";
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const rootOf = (project: string) =>
  join(resolve(project), ".hyperframes", "artifacts", "snapshots");

function ordinaryPath(project: string, path: string): boolean {
  const root = resolve(project);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`)) return false;
  let current = root;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function createSnapshotParents(project: string, path: string): void {
  let parent = resolve(project);
  for (const part of relative(parent, path).split(sep).filter(Boolean)) {
    parent = join(parent, part);
    try {
      mkdirSync(parent);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
    if (!ordinaryPath(project, parent)) throw new Error("Snapshot storage must not use symlinks.");
  }
}

/** A live CLI owns its captures until exit, including late contact-sheet and description writes. */
export function ownSnapshotRun(project: string, path: string): void {
  const root = rootOf(project);
  if (dirname(path) !== root || !UUID.test(path.slice(root.length + 1))) return;
  createSnapshotParents(project, root);
  mkdirSync(path);
  writeFileSync(join(path, OWNER), JSON.stringify({ version: 1, pid: process.pid }), {
    flag: "wx",
  });
}

function missingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function retainedOutput(path: string): boolean {
  try {
    lstatSync(join(path, ".user-output"));
    return true;
  } catch (error) {
    return !missingFile(error);
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "ESRCH");
  }
}

function ownerPid(owner: unknown): number | null {
  if (!owner || typeof owner !== "object" || !("pid" in owner)) return null;
  const pid = owner.pid;
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}

function liveOwner(path: string): boolean {
  if (retainedOutput(path)) return true;
  try {
    const marker = join(path, OWNER);
    if (lstatSync(marker).isSymbolicLink()) return true;
    const pid = ownerPid(JSON.parse(readFileSync(marker, "utf8")));
    return pid === null || processIsAlive(pid);
  } catch (error) {
    return !missingFile(error);
  }
}

function recordsOf(state: VideoState): ArtifactRecord[] {
  return [...Object.values(state.snapshots.revisions).flat(), ...state.snapshots.unversioned];
}

function containingRun(root: string, path: string | undefined): string | null {
  if (!path) return null;
  const name = relative(root, resolve(path)).split(sep)[0];
  return name && UUID.test(name) ? join(root, name) : null;
}

function keepContainingRun(keep: Set<string>, root: string, path: string | undefined): void {
  const run = containingRun(root, path);
  if (run) keep.add(run);
}

function protectedRuns(root: string, state: VideoState, records: ArtifactRecord[]): Set<string> {
  const keep = new Set<string>();
  for (const revision of [state.currentRevision, ...(state.renders?.retainedRevisions ?? [])]) {
    const latest = records
      .filter((record) => record.revision === revision && record.status !== "cleaned")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    keepContainingRun(keep, root, latest?.image);
  }
  const latest = records.find((record) => record.id === state.snapshots.latest?.id);
  keepContainingRun(keep, root, latest?.image);
  for (const item of state.pendingArtifactCleanup ?? []) keepContainingRun(keep, root, item.path);
  return keep;
}

function runsOnDisk(root: string) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && UUID.test(entry.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      try {
        const stat = lstatSync(path);
        return [{ path, stat }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs || a.path.localeCompare(b.path));
}

/** Called under the video-state lock; only managed, old, inactive UUID directories are disposable. */
export function planSnapshotCleanup(
  project: string,
  state: VideoState,
  now = Date.now(),
): SnapshotRun[] {
  const root = rootOf(project);
  if (!ordinaryPath(project, root)) return [];
  const records = recordsOf(state);
  const keep = protectedRuns(root, state, records);
  const runs = runsOnDisk(root);
  for (const run of runs.slice(0, SNAPSHOT_RUNS_TO_KEEP)) keep.add(run.path);
  const pending: SnapshotRun[] = [];
  for (const { path, stat } of runs) {
    if (keep.has(path) || now - stat.mtimeMs < SNAPSHOT_GRACE_MS || liveOwner(path)) continue;
    try {
      const run = { path, dev: stat.dev, ino: stat.ino, mtimeMs: stat.mtimeMs };
      if (!unchangedRun(project, run)) continue;
      pending.push(run);
      retireReferences(records, root, path);
    } catch {
      // Cleanup is opportunistic; a busy or unreadable run is retried on the next capture.
    }
  }
  return pending;
}

function retireReferences(records: ArtifactRecord[], root: string, path: string): void {
  for (const record of records) {
    if (containingRun(root, record.image) !== path) continue;
    delete record.image;
    record.status = "cleaned";
  }
}

function unchangedRun(project: string, run: SnapshotRun): boolean {
  if (!ordinaryPath(project, run.path)) return false;
  const current = lstatSync(run.path);
  return (
    current.isDirectory() &&
    current.dev === run.dev &&
    current.ino === run.ino &&
    current.mtimeMs === run.mtimeMs
  );
}

export interface SnapshotRun {
  path: string;
  dev: number;
  ino: number;
  mtimeMs: number;
}

/** Retire references durably before calling this. Failed removals are selected again next time. */
export function finishSnapshotCleanup(project: string, runs: readonly SnapshotRun[]): void {
  for (const run of runs) {
    try {
      if (!unchangedRun(project, run) || liveOwner(run.path)) continue;
      rmSync(run.path, { recursive: true });
    } catch {
      // Retired evidence is safe to retry on the next completed capture.
    }
  }
}

export function releaseSnapshotRun(project: string, path: string): void {
  if (dirname(path) !== rootOf(project) || !ordinaryPath(project, path)) return;
  try {
    const marker = join(path, OWNER);
    if (lstatSync(marker).isSymbolicLink()) return;
    const owner: unknown = JSON.parse(readFileSync(marker, "utf8"));
    if (owner && typeof owner === "object" && "pid" in owner && owner.pid === process.pid)
      unlinkSync(marker);
  } catch {
    // A missing or unreadable lease must not fail a successful capture.
  }
}

/** Explicit outputs remain user evidence even when reusing a managed UUID folder. */
export function retainSnapshotOutput(project: string, path: string): void {
  const root = rootOf(project);
  const run = containingRun(root, path);
  if (!run) return;
  createSnapshotParents(project, resolve(path));
  try {
    writeFileSync(
      join(run, ".user-output"),
      "Explicit --output; retained until manual cleanup.\n",
      { flag: "wx" },
    );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
}
