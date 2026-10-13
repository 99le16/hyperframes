import { createInterface } from "node:readline";
import { componentOutputSchema, timelineOutputSchema } from "./outputSchemas";

const url = process.env.HF_INSPECT_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url))
  throw new Error("Set HF_INSPECT_URL to the local HF inspection service URL.");
const tool = {
  name: "inspect_components",
  outputSchema: componentOutputSchema,
  description:
    "HyperFrames-native grep for element-related source. Retrieve related HTML/CSS/GSAP snippets with file paths and line numbers to understand, debug, or edit known elements without whole-file lookup. Batch targets. In the HF harness, returned source validated against the current file satisfies the edit read prerequisite; no extra Read is needed unless the file changes. Shared code may affect other elements; unknown animation origins are explicit.",
  inputSchema: {
    type: "object",
    required: ["targets"],
    additionalProperties: false,
    properties: {
      targets: {
        type: "array",
        maxItems: 20,
        description: "Batch 1–20 targets. Use an empty array only when retrieving snippets by ID.",
        items: {
          oneOf: [
            {
              type: "object",
              required: ["selector"],
              additionalProperties: false,
              properties: {
                selector: { type: "string", description: "CSS selector, such as #title or .word." },
                within: {
                  type: "string",
                  description:
                    "Optional CSS selector restricting target lookup; omit for an unambiguous target.",
                },
              },
            },
            {
              type: "object",
              required: ["hfId"],
              additionalProperties: false,
              properties: {
                hfId: { type: "string", description: "Existing element data-hf-id value." },
                within: {
                  type: "string",
                  description:
                    "Optional CSS selector restricting target lookup; omit for an unambiguous target.",
                },
              },
            },
            {
              type: "object",
              required: ["ref"],
              additionalProperties: false,
              properties: {
                ref: {
                  type: "string",
                  description:
                    "Element ref returned by this inspector session; do not invent it. Rediscover after reload.",
                },
              },
            },
          ],
        },
      },
      descendants: {
        type: "boolean",
        default: true,
        description: "Include source related to descendant elements.",
      },
      maxBytes: {
        description:
          "Response budget in bytes. Whole snippets may be omitted; use returned continuation data or increase the budget.",
        type: "integer",
        minimum: 2048,
        maximum: 256000,
        default: 12000,
      },
      snippets: {
        description:
          "Snippet IDs returned by a prior query; requires its generation. May use targets: [].",
        type: "array",
        items: { type: "string" },
      },
      generation: {
        type: "string",
        description:
          "Generation returned by the previous query. Use for continuation; if stale, query targets again.",
      },
      offset: {
        type: "integer",
        minimum: 0,
        description:
          "Returned nextOffset for continuation; repeat the same query with its generation.",
      },
      time: {
        type: "number",
        minimum: 0,
        description:
          "Optional exact preview seek in global seconds. Does not filter animations by time; omit for ordinary source lookup.",
      },
    },
  },
};
const timelineTool = {
  name: "inspect_timeline",
  outputSchema: timelineOutputSchema,
  description:
    "HyperFrames-native structured search for animation timing and activity. Use to find animations by time or boundary, including when the target element is unknown. Return scheduled HF entries and observed DOM-target GSAP timing, targets, properties and source locations, not full source blocks. Use at, range or boundary (at most one); omit all for the full schedule. Does not seek. Callbacks and unexecuted animation code are outside coverage.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      component: {
        description:
          "Optional element/component scope including descendants; omit for the full project. Uses the same target format as inspect_components.",
        oneOf: tool.inputSchema.properties.targets.items.oneOf,
      },
      at: {
        type: "number",
        minimum: 0,
        description:
          "Global second: active scheduled intervals use start <= at < end; includes instantaneous actions at that time.",
      },
      range: {
        description:
          "Global [start, end) seconds, start < end. Return intersecting scheduled intervals and instantaneous actions inside the range.",
        type: "array",
        items: { type: "number", minimum: 0 },
        minItems: 2,
        maxItems: 2,
      },
      boundary: {
        type: "number",
        minimum: 0,
        description:
          "Global second: return only actions crossing, starting, ending or instantaneous here. Later stagger members are excluded. Group spans are not simultaneous per-target schedules; match target labels and member intervals before inferring overlap.",
      },
      generation: {
        type: "string",
        description:
          "Generation returned by the previous query. Use for continuation; if stale, query targets again.",
      },
      offset: {
        type: "integer",
        minimum: 0,
        description:
          "Returned nextOffset for continuation; repeat the same query with its generation.",
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
    else if (message.method === "tools/list") result = { tools: [tool, timelineTool] };
    else if (
      message.method === "tools/call" &&
      [tool.name, timelineTool.name].includes(message.params?.name)
    ) {
      const response = await fetch(
        `${url}/${message.params.name === timelineTool.name ? "timeline" : "inspect"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.params.arguments),
          signal: AbortSignal.timeout(60_000),
        },
      );
      const body = await response.text();
      const text =
        message.params.name === timelineTool.name && response.ok ? JSON.parse(body).text : body;
      result = {
        content: [{ type: "text", text }],
        ...(response.ok ? { structuredContent: JSON.parse(body) } : {}),
        isError: !response.ok,
      };
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
