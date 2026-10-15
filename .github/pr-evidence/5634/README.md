# Beat tracker browser captures

These are screenshots of actual analyzer results in a browser harness, not Studio UI screenshots. Both runs use the same deterministic synthetic 30-second, 22,050 Hz mono signal: 96 BPM clicks with louder chord stabs every 2.2 beats. No analyzer is mocked. The parent bundles its real bpm-detective dependency; the child runs its TypeScript tracker. This is a regression fixture, not a real-music benchmark or a provider test.

- Before source: `5b8a8d091dc27340b644296a5ab523a5f8cccd79`.
- After source: `65b986bce731cdb91acd1794aa25792e0888b49d`.
- Measured before: 134 BPM, 37 beats, 25.6% recall within 70 ms of the interior reference clicks.
- Measured after: 96 BPM, 47 beats, 100% recall on the same reference.
- The image displays seconds 2–12; metrics and JSON cover the full 30 seconds. Recall excludes the first and last two reference clicks.

Reproduce from the child worktree after installing/building both worktrees:

```sh
node .github/pr-evidence/5634/capture.mjs /absolute/path/to/parent-worktree
```

Set `CHROME_PATH` if Chrome is not at its default macOS path. The script bundles each worktree's source, creates a real browser `AudioBuffer`, invokes `analyzeMusicFromBuffer`, saves its measured output to JSON and screenshots the displayed result. It does not open Studio or exercise its fallback-track lifecycle.
