import { Hono } from "hono";
import type { VectorizeIndex, Ai } from "@cloudflare/workers-types";
import { splitIntoChunks, buildVectorId } from "./lib/chunker.js";

interface Env {
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  MCP_SECRET: string;
  CHUNK_SIZE?: string;
  CHUNK_OVERLAP?: string;
  MARKDOWN_DIR?: string;
}

const app = new Hono<{ Bindings: Env }>();

function authenticate(env: Env, request: Request): boolean {
  const secret = request.headers.get("X-MCP-Secret");
  return secret === env.MCP_SECRET;
}

async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const res = (await env.AI.run("@cf/baai/bge-base-en-v1.5", { text })) as { data: number[] };
  return res.data;
}

app.get("/", (c) => {
  return c.json({
    name: "mcp-markdown-search",
    version: "1.0.0",
    description:
      "MCP server + Cloudflare Worker for markdown search with full-text and semantic capabilities",
    endpoints: {
      health: { method: "GET", path: "/health", description: "Health check" },
      search: {
        method: "POST",
        path: "/search",
        description: "Semantic search",
        auth: "X-MCP-Secret",
      },
      index: {
        method: "POST",
        path: "/index",
        description: "Index a file for search",
        auth: "X-MCP-Secret",
      },
    },
    env: {
      MCP_SECRET: c.env.MCP_SECRET ? "configured" : "missing",
      CHUNK_SIZE: c.env.CHUNK_SIZE || "1000 (default)",
      CHUNK_OVERLAP: c.env.CHUNK_OVERLAP || "100 (default)",
      MARKDOWN_DIR: c.env.MARKDOWN_DIR || "./docs (default)",
    },
    vectorize: "connected",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", version: "1.0.0" });
});

app.post("/search", async (c) => {
  const env = c.env as Env;

  if (!authenticate(env, c.req.raw)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { query } = body;
  const topK = Math.max(1, Math.min(Number(body.topK) || 5, 100));
  const scoreThreshold = Math.max(0, Math.min(Number(body.scoreThreshold ?? 0.5), 1));

  if (!query) {
    return c.json({ error: "query is required" }, 400);
  }

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query as string, env);
  } catch {
    return c.json({ error: "Failed to generate embedding for query" }, 500);
  }

  let results: { matches: { id: string; score: number; metadata?: Record<string, unknown> }[] };
  try {
    results = await env.VECTORIZE.query(embedding, { topK });
  } catch {
    return c.json({ error: "Vector search failed" }, 500);
  }

  const filtered = results.matches.filter((m) => m.score >= scoreThreshold);

  return c.json({
    results: filtered.map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata,
    })),
    query,
  });
});

async function generateVectors(
  chunks: string[],
  filePath: string,
  env: Env,
): Promise<
  { id: string; values: number[]; metadata: Record<string, string | number | boolean | string[]> }[]
> {
  return Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk, env);
      return {
        id: buildVectorId(filePath, index),
        values: embedding,
        metadata: {
          filePath,
          chunkIndex: index,
          totalChunks: chunks.length,
          preview: chunk.slice(0, 200),
        },
      };
    }),
  );
}

app.post("/index", async (c) => {
  const env = c.env as Env;

  if (!authenticate(env, c.req.raw)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { filePath, content } = body as { filePath?: string; content?: string };

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
  }
  if (!content) {
    return c.json({ error: "content is required" }, 400);
  }

  const chunkSize = parseInt(env.CHUNK_SIZE || "1000");
  const chunkOverlap = parseInt(env.CHUNK_OVERLAP || "100");

  const chunks = splitIntoChunks(content, chunkSize, chunkOverlap);

  let vectors: {
    id: string;
    values: number[];
    metadata: Record<string, string | number | boolean | string[]>;
  }[];
  try {
    vectors = await generateVectors(chunks, filePath, env);
  } catch {
    return c.json({ error: "Failed to generate embeddings for chunks" }, 500);
  }

  try {
    await env.VECTORIZE.insert(vectors);
  } catch {
    return c.json({ error: "Failed to insert vectors into index" }, 500);
  }

  return c.json({
    indexed: true,
    filePath,
    chunks: chunks.length,
    vectors: vectors.length,
  });
});

export default app;
