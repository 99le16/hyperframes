import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { USAGE_PATH, writeUsage } from "./catalog-usage.mjs";

const PUBLISHED = '{\n  "usage30d": {\n    "aurora": 7\n  }\n}\n';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "catalog-usage-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "registry"));
  const items = [
    { name: "aurora", type: "hyperframes:block" },
    { name: "blob", type: "hyperframes:block" },
  ];
  writeFileSync(join(root, "registry/registry.json"), JSON.stringify({ items }));
  writeFileSync(join(root, USAGE_PATH), PUBLISHED);
  return { root, usage: () => readFileSync(join(root, USAGE_PATH), "utf8") };
}

test("writes each indexed item's count, zero for items nobody added", async (t) => {
  const { root, usage } = fixture(t);
  const requests = [];
  const fetchStub = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return {
      ok: true,
      json: async () => ({
        results: [
          ["aurora", 12],
          ["removed-item", 4],
        ],
      }),
    };
  };
  assert.equal(await writeUsage(root, "key", fetchStub), true);
  assert.deepEqual(JSON.parse(usage()), { usage30d: { aurora: 12, blob: 0 } });
  assert.match(requests[0].url, /\/api\/projects\/356858\/query\/$/);
  assert.match(requests[0].body.query.query, /event = 'registry_item_added'/);
});

test("a failed query or a missing key leaves the published usage and never throws", async (t) => {
  const { root, usage } = fixture(t);
  const failures = [
    async () => ({ ok: false, status: 500 }),
    async () => {
      throw new Error("network down");
    },
    async () => ({ ok: true, json: async () => ({ error: "bad query" }) }),
  ];
  for (const fetchStub of failures) assert.equal(await writeUsage(root, "key", fetchStub), false);
  let called = false;
  assert.equal(
    await writeUsage(root, "", async () => {
      called = true;
    }),
    false,
  );
  assert.equal(called, false);
  assert.equal(usage(), PUBLISHED);
});
