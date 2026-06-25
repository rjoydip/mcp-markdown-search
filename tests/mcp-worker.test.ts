import { describe, test, expect, beforeAll } from "bun:test";
import pkg from "../package.json";

const WORKER_URL = process.env.WORKER_URL || "";
const MCP_SECRET = process.env.MCP_SECRET || "";
const baseUrl = WORKER_URL.replace(/\/$/, "");

const describeEndpoints = WORKER_URL ? describe : describe.skip;
const describeAuthOn = WORKER_URL && MCP_SECRET ? describe : describe.skip;
const describeAuthOff = WORKER_URL && !MCP_SECRET ? describe : describe.skip;

function headers(extra: Record<string, string> = {}): Record<string, string> {
  if (MCP_SECRET) {
    return { "Content-Type": "application/json", "X-MCP-Secret": MCP_SECRET, ...extra };
  }
  return { "Content-Type": "application/json", ...extra };
}

if (WORKER_URL) {
  beforeAll(async () => {
    const res = await fetch(`${baseUrl}/health`);
    if (res.status !== 200) {
      throw new Error(
        `MCP Worker unreachable at ${baseUrl}/health (status ${res.status}). ` +
          `Start it with: bun run dev`,
      );
    }
  });
}

describeEndpoints("MCP Endpoints", () => {
  test("GET / returns service metadata", async () => {
    const res = await fetch(baseUrl + "/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("name", "mcp-markdown-search");
    expect(body).toHaveProperty("version", pkg.version);
    expect(body).toHaveProperty("endpoints.health");
    expect(body).toHaveProperty("endpoints.search");
    expect(body).toHaveProperty("endpoints.index");
  });

  test("GET /health returns ok", async () => {
    const res = await fetch(baseUrl + "/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("version", pkg.version);
  });

  test("POST /search returns 400 when query is missing", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "query is required");
  });

  test("POST /search returns 400 when body is invalid JSON", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: headers(),
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });

  test("POST /search accepts valid request", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ query: "test query", topK: 5 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("POST /index returns 400 when filePath is missing", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ content: "# hello" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "filePath is required");
  });

  test("POST /index returns 400 when content is missing", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ filePath: "test.md" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "content is required");
  });

  test("POST /index returns 400 when body is invalid JSON", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: headers(),
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });

  test("POST /index accepts valid request", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        filePath: "/docs/test.md",
        content: "# Test Document\n\nThis is test content.",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("indexed", true);
  });
});

describeAuthOn("MCP Auth (enforced)", () => {
  // Runs when MCP_SECRET env var is set — Worker has auth configured.
  // Requests without valid auth must return 401.

  test("POST /search returns 401 without auth header", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test", topK: 1 }),
    });
    expect(res.status).toBe(401);
  });

  test("POST /search returns 401 with wrong secret", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MCP-Secret": "wrong-secret",
      },
      body: JSON.stringify({ query: "test", topK: 1 }),
    });
    expect(res.status).toBe(401);
  });

  test("POST /index returns 401 without auth header", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
    });
    expect(res.status).toBe(401);
  });

  test("POST /index returns 401 with wrong secret", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MCP-Secret": "wrong-secret",
      },
      body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
    });
    expect(res.status).toBe(401);
  });
});

describeAuthOff("MCP Auth (bypassed)", () => {
  // Runs when MCP_SECRET is unset — Worker bypasses auth.
  // Requests proceed to handler logic, which fails with 500 when AI/Vectorize bindings are unavailable.

  test("POST /search returns 500 without auth header (AI missing)", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test", topK: 1 }),
    });
    expect(res.status).toBe(500);
  });

  test("POST /search returns 500 with wrong secret (AI missing)", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MCP-Secret": "wrong-secret",
      },
      body: JSON.stringify({ query: "test", topK: 1 }),
    });
    expect(res.status).toBe(500);
  });

  test("POST /index returns 500 without auth header (AI missing)", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
    });
    expect(res.status).toBe(500);
  });

  test("POST /index returns 500 with wrong secret (AI missing)", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MCP-Secret": "wrong-secret",
      },
      body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
    });
    expect(res.status).toBe(500);
  });
});
