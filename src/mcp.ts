import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { resolve, relative, isAbsolute } from "path";
import { walkMarkdown, isMarkdownFile } from "./lib/walker.js";
import { WorkerClient } from "./lib/worker-client.js";

const markdownDir = process.env.MARKDOWN_DIR || "./docs";
const workerUrl = process.env.WORKER_URL || "";
const mcpSecret = process.env.MCP_SECRET || "";

const workerClient = workerUrl && mcpSecret ? new WorkerClient({ workerUrl, mcpSecret }) : null;

const server = new Server(
  {
    name: "mcp-markdown-search",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const tools = [
  {
    name: "search_markdown",
    description: "Full-text search across markdown files using ripgrep",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        caseSensitive: { type: "boolean", description: "Case sensitive search" },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_search",
    description: "Semantic search using vector similarity",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        topK: { type: "number", description: "Number of results", default: 5 },
      },
      required: ["query"],
    },
  },
  {
    name: "list_markdown_files",
    description: "List all markdown files in the docs directory",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_markdown_file",
    description: "Read the full content of a markdown file",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Absolute path to the file" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "index_file_to_vector",
    description: "Index a single file for semantic search",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Absolute path to the file" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "index_all_to_vector",
    description: "Index all markdown files for semantic search",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

type ToolResult = { content: [{ type: "text"; text: string }]; isError?: boolean };

function notConfigured(): ToolResult {
  const missing = [];
  if (!workerUrl) missing.push("WORKER_URL");
  if (!mcpSecret) missing.push("MCP_SECRET");
  return {
    content: [
      { type: "text", text: `Semantic search not configured: missing ${missing.join(", ")}` },
    ],
    isError: true,
  };
}

async function handleSearchMarkdown(args: {
  query: string;
  caseSensitive?: boolean;
}): Promise<ToolResult> {
  const { query, caseSensitive = false } = args;
  const files = walkMarkdown(markdownDir);
  const result = await searchMarkdown(query, files, caseSensitive);
  return { content: [{ type: "text", text: result }] };
}

async function handleSemanticSearch(args: { query: string; topK?: number }): Promise<ToolResult> {
  if (!workerClient) return notConfigured();
  const { query, topK = 5 } = args;
  const response = await workerClient.search(query, topK);
  return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
}

function handleListMarkdownFiles(): ToolResult {
  const files = walkMarkdown(markdownDir);
  return { content: [{ type: "text", text: files.join("\n") }] };
}

function resolveSafePath(userPath: string, baseDir?: string): string {
  const base = resolve(baseDir ?? markdownDir);
  const resolved = resolve(base, userPath);
  const rel = relative(base, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Access denied: path is outside the allowed directory");
  }
  return resolved;
}

function handleReadMarkdownFile(args: { filePath: string }): ToolResult {
  const { filePath } = args;
  if (!isMarkdownFile(filePath)) {
    return {
      content: [{ type: "text", text: "Only .md and .mdx files are supported" }],
      isError: true,
    };
  }
  const resolved = resolveSafePath(filePath);
  const content = readFileSync(resolved, "utf-8");
  return { content: [{ type: "text", text: content }] };
}

async function handleIndexFileToVector(args: { filePath: string }): Promise<ToolResult> {
  if (!workerClient) return notConfigured();
  const { filePath } = args;
  if (!isMarkdownFile(filePath)) {
    return {
      content: [{ type: "text", text: "Only .md and .mdx files are supported" }],
      isError: true,
    };
  }
  const resolved = resolveSafePath(filePath);
  const content = readFileSync(resolved, "utf-8");
  const response = await workerClient.index(resolved, content);
  return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
}

const BATCH_CONCURRENCY = 5;

async function handleIndexAllToVector(): Promise<ToolResult> {
  if (!workerClient) return notConfigured();
  const files = walkMarkdown(markdownDir);
  const results: { file: string; status: string; error?: string }[] = [];

  for (let i = 0; i < files.length; i += BATCH_CONCURRENCY) {
    const batch = files.slice(i, i + BATCH_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.allSettled(
      batch.map(async (file) => {
        const content = readFileSync(file, "utf-8");
        return workerClient.index(file, content);
      }),
    );
    for (let j = 0; j < batch.length; j++) {
      const r = settled[j];
      results.push({
        file: batch[j],
        status: r.status === "fulfilled" ? "ok" : "error",
        error: r.status === "rejected" ? String(r.reason) : undefined,
      });
    }
  }

  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
}

// fallow-ignore-next-line complexity
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_markdown":
        return handleSearchMarkdown(args as { query: string; caseSensitive?: boolean });
      case "semantic_search":
        return handleSemanticSearch(args as { query: string; topK?: number });
      case "list_markdown_files":
        return handleListMarkdownFiles();
      case "read_markdown_file":
        return handleReadMarkdownFile(args as { filePath: string });
      case "index_file_to_vector":
        return handleIndexFileToVector(args as { filePath: string });
      case "index_all_to_vector":
        return handleIndexAllToVector();
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return { content: [{ type: "text", text: String(error) }], isError: true };
  }
});

async function searchMarkdown(
  query: string,
  files: string[],
  caseSensitive: boolean,
): Promise<string> {
  const args = caseSensitive ? [query, ...files] : ["-i", query, ...files];
  if (!Bun.which("rg")) {
    return "ripgrep (rg) is not installed. Install it to use search.";
  }
  const proc = Bun.spawn(["rg", ...args], { stdout: "pipe", stderr: "ignore" });
  const output = await new Response(proc.stdout as ReadableStream<Uint8Array>).text();
  return output || "No results found";
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
