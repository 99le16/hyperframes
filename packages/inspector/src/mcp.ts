import { createInterface } from "node:readline";

const url = process.env.HF_INSPECT_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url))
  throw new Error("Set HF_INSPECT_URL to the local HF inspection service URL.");
const tool = {
  name: "inspect_components",
  description:
    "Recover original HTML/CSS/GSAP source snippets for known elements before editing. Batch targets; shared code is returned once. Does not verify edits or render video. Default queries do not seek. Use returned generation and snippet IDs to retrieve omitted blocks. Source may be shared with other elements; unknown animation origins are explicit.",
  inputSchema: {
    type: "object",
    required: ["targets"],
    additionalProperties: false,
    properties: {
      targets: {
        type: "array",
        maxItems: 20,
        items: {
          oneOf: [
            {
              type: "object",
              required: ["selector"],
              additionalProperties: false,
              properties: { selector: { type: "string" }, within: { type: "string" } },
            },
            {
              type: "object",
              required: ["hfId"],
              additionalProperties: false,
              properties: { hfId: { type: "string" }, within: { type: "string" } },
            },
            {
              type: "object",
              required: ["ref"],
              additionalProperties: false,
              properties: { ref: { type: "string" } },
            },
          ],
        },
      },
      descendants: { type: "boolean", default: true },
      maxBytes: { type: "integer", minimum: 2048, maximum: 256000, default: 12000 },
      snippets: { type: "array", items: { type: "string" } },
      generation: { type: "string" },
      offset: { type: "integer", minimum: 0 },
      time: {
        type: "number",
        minimum: 0,
        description: "Optional explicit exact seek; omit for ordinary code lookup.",
      },
    },
  },
};
const input = createInterface({ input: process.stdin });
for await (const line of input) {
  let id: string | number | null = null;
  try {
    const message = JSON.parse(line);
    if (message.id == null) continue;
    id = message.id;
    let result: unknown;
    if (message.method === "initialize")
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "hyperframes-inspector", version: "0.1.0" },
      };
    else if (message.method === "ping") result = {};
    else if (message.method === "tools/list") result = { tools: [tool] };
    else if (message.method === "tools/call" && message.params?.name === tool.name) {
      const response = await fetch(`${url}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.params.arguments),
        signal: AbortSignal.timeout(60_000),
      });
      result = { content: [{ type: "text", text: await response.text() }], isError: !response.ok };
    } else {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Method not found" },
        }) + "\n",
      );
      continue;
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }) + "\n");
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      }) + "\n",
    );
  }
}
