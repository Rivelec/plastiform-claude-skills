#!/usr/bin/env node
// Plastiform Finder MCP server — zero-dep stdio JSON-RPC, Node >= 18 (global fetch).
// One tool: find_product → POST https://form.plastiform.info/api/calculate
// Contract: form.plastiform.info/docs/api.md. The API validates; 400 details pass through verbatim.
// ponytail: hand-rolled protocol (4 methods + ping) — switch to @modelcontextprotocol/sdk only if
// we ever need resources/prompts/streaming.

const API = process.env.PLASTIFORM_API_URL || "https://form.plastiform.info";

const TOOL = {
  name: "find_product",
  description:
    "Select the right Plastiform impression product(s) for a measurement/use-case via the live " +
    "form.plastiform.info Finder API. Deterministic. Returns levelOne (ideal, best first), " +
    "levelTwo (alternatives), and cutter/case accessory flags. Empty levelOne = no standard " +
    "product fits — advise contacting a Plastiform expert. On validation error the response " +
    "names each bad field under `details` — fix and retry. Never send `constraint`: it is " +
    "auto-derived as ceil((1 - dmos/dim) * 100).",
  inputSchema: {
    type: "object",
    required: ["path"],
    properties: {
      path: {
        type: "string",
        enum: ["dimensions", "roughness", "visual", "protection", "reinforcement"],
        description:
          "Application type: dimensions = dimensional impression/part measurement, roughness = " +
          "surface roughness capture, visual = visual defect capture, protection = surface " +
          "protection/masking/calibration, reinforcement = structural reinforcement/stabilization.",
      },
      isInnerShape: {
        type: "string",
        enum: ["inside", "outside"],
        description: "Required for dimensions/roughness/visual. inside = inner shape/cavity, outside = outer shape/projection.",
      },
      isPartial: {
        type: "string",
        enum: ["partial", "total"],
        description: "dimensions only. partial = local area, total = complete surface.",
      },
      dim: {
        type: "number",
        description: "Largest section the impression occupies (> 0), in measureSystem. Required for dimensions/roughness/visual, and protection when hasConstraint=yes.",
      },
      dmos: {
        type: "number",
        description: "Smallest passage the impression must exit through (> 0), in measureSystem. Required alongside dim.",
      },
      measureSystem: {
        type: "string",
        enum: ["mm", "inch"],
        description: "Unit for dim and dmos. Required whenever dim/dmos are sent.",
      },
      isMeasurableWith: {
        type: "string",
        enum: ["contact", "optic", "both", "eye"],
        description: "Measurement method. dimensions/roughness: contact | optic | both. visual: eye | optic.",
      },
      orientation: {
        type: "string",
        enum: ["vertical", "horizontal", "top"],
        description: "visual only. Surface orientation during inspection.",
      },
      type: {
        type: "string",
        enum: ["seal", "surface", "temperature", "mask", "caliber", "vibration", "clamp", "base", "reinforcement"],
        description: "protection: seal | surface | temperature | mask | caliber. reinforcement: vibration | clamp | base | reinforcement.",
      },
      applicationType: {
        type: "string",
        enum: ["single", "multiple"],
        description: "protection only. One-time vs repeated application.",
      },
      hasConstraint: {
        type: "string",
        enum: ["yes", "no"],
        description: "protection only. yes requires dim/dmos/measureSystem.",
      },
      isFragile: {
        type: "string",
        enum: ["yes", "no"],
        description: "reinforcement only. Is the part fragile?",
      },
    },
  },
};

const reply = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
const fail = (id, code, message) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");

let pending = 0;
let stdinDone = false;
const maybeExit = () => { if (stdinDone && pending === 0) process.exit(0); };

async function handle(msg) {
  if (msg.id === undefined) return; // notification (initialized, cancelled…): never reply
  switch (msg.method) {
    case "initialize":
      return reply(msg.id, {
        protocolVersion: msg.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "plastiform-finder", version: "0.4.0" },
      });
    case "ping":
      return reply(msg.id, {});
    case "tools/list":
      return reply(msg.id, { tools: [TOOL] });
    case "tools/call": {
      if (msg.params?.name !== TOOL.name) return fail(msg.id, -32602, `Unknown tool: ${msg.params?.name}`);
      pending++;
      try {
        const res = await fetch(`${API}/api/calculate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(msg.params?.arguments ?? {}),
        });
        const text = await res.text(); // raw pass-through — 400 details teach the model
        reply(msg.id, { content: [{ type: "text", text }], isError: !res.ok });
      } catch (e) {
        reply(msg.id, { content: [{ type: "text", text: `Network error calling ${API}: ${e.message}` }], isError: true });
      }
      pending--;
      return maybeExit();
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

let buf = "";
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    try {
      handle(JSON.parse(line));
    } catch (e) {
      console.error(`plastiform-finder: bad JSON line: ${e.message}`);
    }
  }
});
process.stdin.on("end", () => { stdinDone = true; maybeExit(); });
