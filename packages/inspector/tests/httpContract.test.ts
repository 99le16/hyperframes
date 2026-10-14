import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { expect, it } from "vitest";

const project = mkdtempSync(join(tmpdir(), "hf-inspector-"));

function start() {
  const server = spawn("bun", ["src/server.ts", project, "0"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = createInterface({ input: server.stdout! });
  const ready = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("service startup timeout")), 10000);
    lines.once("line", (line) => {
      clearTimeout(timer);
      resolve(JSON.parse(line).url as string);
    });
  });
  return {
    url: ready,
    stop: async () => {
      server.kill("SIGTERM");
      await new Promise<void>((resolve) => server.once("exit", () => resolve()));
      lines.close();
    },
  };
}

it("answers info with a version, codes every refusal, and does not turn a large body into an empty 200", async () => {
  const server = start();
  try {
    const url = await server.url;
    const info = await (await fetch(url + "/info")).json();
    expect(info.capability).toBe("inspection");
    expect(info.version).toMatch(/^\d+\.\d+\.\d+/);
    const missing = await fetch(url + "/nope");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not_found", code: "not_found" });
    // fetch refuses to send a foreign Host, so this one request is raw HTTP.
    const rebound = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const req = httpRequest(url + "/info", { headers: { host: "evil.example" } }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          }),
        );
      });
      req.on("error", reject);
      req.end();
    });
    expect(rebound.status).toBe(403);
    expect(rebound.body).toEqual({ error: "host_not_allowed", code: "host_not_allowed" });
    const oversized = await fetch(url + "/inspect", {
      method: "POST",
      body: "x".repeat(64_001),
    });
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({
      error: "request_too_large",
      code: "request_too_large",
    });
  } finally {
    await server.stop();
  }
});
