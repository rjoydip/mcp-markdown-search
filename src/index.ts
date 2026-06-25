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

async function embedQuery(text: string, env: Env): Promise<number[]> {
  const res = (await env.AI.run("@cf/baai/bge-base-en-v1.5", { text })) as { data: number[] };
  return res.data;
}

app.get("/health", (c) => {
  return c.json({ status: "ok", version: "1.0.0" });
});

app.post("/search", async (c) => {
  const env = c.env as Env;

  if (!authenticate(env, c.req.raw)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { query, topK = 5, scoreThreshold = 0.5 } = await c.req.json();

  const embedding = await embedQuery(query, env);
  const results = await env.VECTORIZE.query(embedding, { topK });

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

app.post("/index", async (c) => {
  const env = c.env as Env;

  if (!authenticate(env, c.req.raw)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { filePath, content } = await c.req.json();

  const chunkSize = parseInt(env.CHUNK_SIZE || "1000");
  const chunkOverlap = parseInt(env.CHUNK_OVERLAP || "100");

  const chunks = splitIntoChunks(content, chunkSize, chunkOverlap);

  const vectors = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await embedQuery(chunk, env);
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

  await env.VECTORIZE.insert(vectors);

  return c.json({
    indexed: true,
    filePath,
    chunks: chunks.length,
    vectors: vectors.length,
  });
});

export default app;
