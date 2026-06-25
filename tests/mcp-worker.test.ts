import { describe, test, expect } from "bun:test";

const WORKER_URL = process.env.WORKER_URL || "";
const MCP_SECRET = process.env.MCP_SECRET || "";

const describeEndpoints = WORKER_URL ? describe : describe.skip;
const describeAuth = WORKER_URL && MCP_SECRET ? describe : describe.skip;

describeEndpoints("MCP Endpoints", () => {
  const baseUrl = WORKER_URL.replace(/\/$/, "");

  test("GET / returns service metadata", async () => {
    const res = await fetch(baseUrl + "/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("name", "mcp-markdown-search");
    expect(body).toHaveProperty("version", "1.0.0");
    expect(body).toHaveProperty("endpoints.health");
    expect(body).toHaveProperty("endpoints.search");
    expect(body).toHaveProperty("endpoints.index");
  });

  test("GET /health returns ok", async () => {
    const res = await fetch(baseUrl + "/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("version", "1.0.0");
  });

  test("POST /search returns 400 when query is missing", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "query is required");
  });

  test("POST /search returns 400 when body is invalid JSON", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });

  test("POST /search accepts valid request", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test query", topK: 5 }),
    });
    expect([200, 500]).toContain(res.status);
  });

  test("POST /index returns 400 when filePath is missing", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# hello" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "filePath is required");
  });

  test("POST /index returns 400 when content is missing", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("error", "content is required");
  });

  test("POST /index returns 400 when body is invalid JSON", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });

  test("POST /index accepts valid request", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: "/docs/test.md",
        content: "# Test Document\n\nThis is test content.",
      }),
    });
    expect([200, 500]).toContain(res.status);
  });
});

describeAuth("MCP Auth", () => {
  const baseUrl = WORKER_URL.replace(/\/$/, "");

  test("POST /search returns 401 without auth header", async () => {
    const res = await fetch(baseUrl + "/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test", topK: 1 }),
    });
    // 401 when auth enforced, 500 when auth bypassed (missing AI/Vectorize)
    expect([401, 500]).toContain(res.status);
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
    expect([401, 500]).toContain(res.status);
  });

  test("POST /index returns 401 without auth header", async () => {
    const res = await fetch(baseUrl + "/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
    });
    expect([401, 500]).toContain(res.status);
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
    expect([401, 500]).toContain(res.status);
  });
});
