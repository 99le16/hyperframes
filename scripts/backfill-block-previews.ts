#!/usr/bin/env tsx
/**
 * Record published preview URLs in registry block + component manifests.
 *
 * For every block and component, each `preview` field keeps a declared URL that
 * answers, else takes the catalog CDN file when that answers. Run it after
 * `generate-catalog-previews.ts --missing` and `upload-docs-images.sh`: it only
 * records files that are live, so it never writes a dead link.
 *
 * Usage:
 *   npx tsx scripts/backfill-block-previews.ts           # all items
 *   npx tsx scripts/backfill-block-previews.ts --dry-run  # preview changes only
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAsCommand } from "./entrypoint.ts";
import {
  declaredPreview,
  liveUrls,
  previewToRecord,
  previewUrls,
  type Preview,
  type PreviewKind,
} from "./catalog-preview-media.ts";

const registryDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "registry");

interface Entry {
  kind: PreviewKind;
  name: string;
  manifestPath: string;
  manifest: Record<string, unknown>;
}

function entriesOf(kind: PreviewKind): Entry[] {
  const dir = join(registryDir, `${kind}s`);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifestPath = join(dir, entry.name, "registry-item.json");
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        return [{ kind, name: entry.name, manifestPath, manifest }];
      } catch {
        return [];
      }
    });
}

/** The manifest text with `preview` replaced or appended last. Text, not a JSON round trip, which
 * would rewrite the rest of the file (`1.0` to `1`, escapes decoded). */
export function withPreview(text: string, preview: Preview): string {
  const value = JSON.stringify(preview, null, 2).replace(/\n/g, "\n  ");
  const declared = /"preview"\s*:\s*(\{[^{}]*\}|"[^"]*"|null)/;
  if (declared.test(text)) return text.replace(declared, () => `"preview": ${value}`);
  return text.replace(/\s*\}\s*$/, () => `,\n  "preview": ${value}\n}\n`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const entries = [...entriesOf("block"), ...entriesOf("component")];
  const live = await liveUrls(
    entries.flatMap((e) => previewUrls(e.kind, e.name, declaredPreview(e.manifest.preview))),
  );

  const changed: string[] = [];
  for (const { kind, name, manifestPath, manifest } of entries) {
    const preview = previewToRecord(kind, name, declaredPreview(manifest.preview), (url) =>
      live.has(url),
    );
    if (!preview) continue;
    changed.push(manifestPath);
    if (dryRun) console.log(`[dry-run] ${kind} ${name}: would set preview →`, preview);
    else writeFileSync(manifestPath, withPreview(readFileSync(manifestPath, "utf-8"), preview));
  }
  // The inserted block is formatted like the rest of the file.
  if (!dryRun && changed.length > 0)
    execFileSync("npx", ["oxfmt", ...changed], { stdio: "inherit" });
  console.log(
    `\n${dryRun ? "[dry-run] " : ""}Done: ${changed.length} of ${entries.length} changed`,
  );
}

runAsCommand(import.meta.url, main);
