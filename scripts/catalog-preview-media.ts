// One owner for a catalog item's preview media, shared by the renderer and the recorder:
// where its poster and video live, whether they answer, and which frame the poster shows.

export type PreviewKind = "block" | "component";
export type PreviewField = "video" | "poster";
export type Preview = Partial<Record<PreviewField, string>>;

const CDN_BASE = "https://static.heygen.ai/hyperframes-oss/docs/images/catalog";
const FIELDS: PreviewField[] = ["video", "poster"];

/** Where `upload-docs-images.sh` publishes what the renderer writes to docs/images/catalog/. */
export function cdnPreview(kind: PreviewKind, name: string): Required<Preview> {
  const base = `${CDN_BASE}/${kind}s/${name}`;
  return { video: `${base}.mp4`, poster: `${base}.png` };
}

/** A manifest's `preview`, which older components wrote as a bare video URL. */
export function declaredPreview(value: unknown): Preview {
  if (typeof value === "string") return { video: value };
  return value && typeof value === "object" ? (value as Preview) : {};
}

/** The preview to record, or null when unchanged. Per field: a declared URL that answers, else the
 * CDN file if it answers, else as it was, so no URL is recorded before its file is published. */
export function previewToRecord(
  kind: PreviewKind,
  name: string,
  declared: Preview,
  live: (url: string) => boolean,
): Preview | null {
  const cdn = cdnPreview(kind, name);
  const next: Preview = { ...declared };
  for (const field of FIELDS) {
    const own = declared[field];
    if (own && live(own)) continue;
    if (live(cdn[field])) next[field] = cdn[field];
  }
  return FIELDS.every((field) => next[field] === declared[field]) ? null : next;
}

/** Fields with no published file at the declared or the CDN URL: what the renderer still owes. */
export function unpublishedFields(
  kind: PreviewKind,
  name: string,
  declared: Preview,
  live: (url: string) => boolean,
): PreviewField[] {
  const cdn = cdnPreview(kind, name);
  return FIELDS.filter((field) => {
    const own = declared[field];
    return !(own && live(own)) && !live(cdn[field]);
  });
}

/** A CDN answer that means "no such file"; S3 answers 403 for a key that does not exist. */
const ABSENT = new Set([403, 404]);

/** The URLs that answer 200 to HEAD. Any answer but 403/404, or none, fails the run rather than
 * reading as "not published". ponytail: 8 requests at a time, enough for a few hundred items. */
export async function liveUrls(
  urls: string[],
  request: typeof fetch = fetch,
): Promise<Set<string>> {
  const live = new Set<string>();
  const queue = [...new Set(urls)];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const response = await request(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
      if (response.ok) live.add(url);
      else if (!ABSENT.has(response.status))
        throw new Error(`Cannot tell whether ${url} is published: HTTP ${response.status}`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return live;
}

/** Every URL `previewToRecord` and `unpublishedFields` may ask about for this item. */
export function previewUrls(kind: PreviewKind, name: string, declared: Preview): string[] {
  const cdn = cdnPreview(kind, name);
  return FIELDS.flatMap((field) => {
    const own = declared[field];
    return own ? [cdn[field], own] : [cdn[field]];
  });
}

/** Seconds in where the poster is taken: the entry's `data-poster-time`, else after the treatment
 * appears, capped for long compositions (a fixed time can land between two words). */
export function posterTime(entryHtml: string, duration: number): number {
  const declared = Number(/\sdata-poster-time="([\d.]+)"/.exec(entryHtml)?.[1]);
  return declared >= 0 && declared < duration ? declared : Math.min(3.0, duration * 0.6);
}
