import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const USAGE_PATH = "registry/usage.json";
const QUERY_URL = "https://us.posthog.com/api/projects/356858/query/";
// People who asked for each item by name; dependencies pulled in behind it are not a vote for it.
const QUERY = `SELECT properties.item, count(DISTINCT person_id)
FROM events
WHERE event = 'registry_item_added'
  AND toString(properties.requested) = 'true'
  AND timestamp > now() - INTERVAL 30 DAY
GROUP BY properties.item
LIMIT 10000`;

/** Distinct people per item over the last 30 days, as a Map of item name to count. */
export async function queryUsage(key, fetchImpl = fetch) {
  const res = await fetchImpl(QUERY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: QUERY } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`PostHog query failed: HTTP ${res.status}`);
  const { results } = await res.json();
  if (!Array.isArray(results)) throw new Error("PostHog query returned no results array");
  return new Map(results.filter(([, people]) => Number.isSafeInteger(people) && people >= 0));
}

/** Every indexed item gets a count, 0 when nobody added it, so a missing field means no data. */
export function usageFile(names, counts) {
  const usage30d = Object.fromEntries(names.map((name) => [name, counts.get(name) ?? 0]));
  return JSON.stringify({ usage30d }, null, 2) + "\n";
}

/** Rewrites the usage file, or leaves the published one as it is when the key or the query fails. */
export async function writeUsage(root, key, fetchImpl = fetch) {
  if (!key) {
    console.warn("::warning::POSTHOG_CATALOG_READ_KEY is not set; catalog usage left unchanged.");
    return false;
  }
  try {
    const counts = await queryUsage(key, fetchImpl);
    const index = JSON.parse(readFileSync(join(root, "registry/registry.json"), "utf8"));
    const names = index.items.map((item) => item.name);
    writeFileSync(join(root, USAGE_PATH), usageFile(names, counts));
    console.log(`Catalog usage: ${names.length} items counted.`);
    return true;
  } catch (error) {
    console.warn(`::warning::Catalog usage left unchanged: ${error.message}`);
    return false;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeUsage(
    fileURLToPath(new URL("..", import.meta.url)),
    process.env.POSTHOG_CATALOG_READ_KEY,
  );
}
