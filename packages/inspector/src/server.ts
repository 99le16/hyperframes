import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { Inspector } from "./service";
import type { InspectRequest } from "./types";

const version = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;
const MAX_BODY = 64_000;

function codeOf(message: string) {
  return /^[a-z][a-z0-9_-]*(?=:|$)/.exec(message)?.[0] ?? "invalid_request";
}

function send(res: ServerResponse, status: number, message: string) {
  res.writeHead(status).end(JSON.stringify({ error: message, code: codeOf(message) }));
}

function loopback(host: string | undefined) {
  if (!host) return true;
  const name = host
    .replace(/:\d+$/, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  return name === "127.0.0.1" || name === "localhost" || name === "::1";
}

function readBody(req: IncomingMessage): Promise<Buffer | "too_large"> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const finish = (value: Buffer | "too_large") => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_BODY) {
        req.pause();
        finish("too_large");
        return;
      }
      chunks.push(bytes);
    });
    req.on("end", () => finish(Buffer.concat(chunks)));
    req.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

const project = process.argv[2];
if (!project)
  throw new Error("Usage: server PROJECT [PORT] (bun src/server.ts, or node dist/server.js)");
const inspector = new Inspector(project);
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (!loopback(req.headers.host)) {
    send(res, 403, "host_not_allowed");
    return;
  }
  if (req.headers.origin) {
    send(res, 403, "browser_origin_not_allowed");
    return;
  }
  if (req.method === "GET" && req.url === "/info") {
    res.end(
      JSON.stringify({
        project: inspector.project,
        version,
        capability: "inspection",
        stats: inspector.stats,
      }),
    );
    return;
  }
  if (req.method !== "POST" || !["/inspect", "/timeline", "/element-map"].includes(req.url ?? "")) {
    send(res, 404, "not_found");
    return;
  }
  try {
    const body = await readBody(req);
    if (body === "too_large") {
      send(res, 400, "request_too_large");
      return;
    }
    const request: InspectRequest = JSON.parse(body.toString("utf8") || "{}");
    if (req.url === "/element-map") res.end(JSON.stringify(await inspector.elementMap()));
    else if (req.url === "/timeline") res.end(JSON.stringify(await inspector.timeline(request)));
    else res.end(JSON.stringify(await inspector.inspect(request)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    send(res, message === "no-composition" ? 404 : 400, message);
  }
});
server.listen(Number(process.argv[3] ?? 0), "127.0.0.1", () => {
  const address = server.address();
  if (address && typeof address !== "string")
    console.log(
      JSON.stringify({ url: `http://127.0.0.1:${address.port}`, project: inspector.project }),
    );
});
async function close() {
  server.close();
  await inspector.dispose();
}
process.once("SIGINT", () => {
  void close();
});
process.once("SIGTERM", () => {
  void close();
});
