import { describe, test, expect } from "bun:test";
import app from "../src/index";

describe("Worker Routes - Root", () => {
  const env = {
    MCP_SECRET: "test-secret",
    AI: {} as never,
    VECTORIZE: {} as never,
  };

  test("GET / returns metadata", async () => {
    const res = await app.request("/", { method: "GET" }, env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("mcp-markdown-search");
    expect(body.version).toBe("1.0.0");
    expect(body.endpoints).toBeDefined();
    expect(body.endpoints.health).toBeDefined();
    expect(body.endpoints.search).toBeDefined();
    expect(body.endpoints.index).toBeDefined();
  });
});

describe("Worker Routes - Health", () => {
  test("GET /health returns ok", async () => {
    const res = await app.request("/health", { method: "GET" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("Worker Routes - Search", () => {
  const env = {
    MCP_SECRET: "test-secret",
    AI: {} as never,
    VECTORIZE: {} as never,
  };

  test("POST /search returns 401 without auth", async () => {
    const res = await app.request(
      "/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  test("POST /search returns 400 without query", async () => {
    const res = await app.request(
      "/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MCP-Secret": "test-secret" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("query is required");
  });
});

describe("Worker Routes - Index", () => {
  const env = {
    MCP_SECRET: "test-secret",
    AI: {} as never,
    VECTORIZE: {} as never,
  };

  test("POST /index returns 401 without auth", async () => {
    const res = await app.request(
      "/index",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "test.md", content: "# hello" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  test("POST /index returns 400 without filePath", async () => {
    const res = await app.request(
      "/index",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MCP-Secret": "test-secret" },
        body: JSON.stringify({ content: "# hello" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("filePath is required");
  });

  test("POST /index returns 400 without content", async () => {
    const res = await app.request(
      "/index",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MCP-Secret": "test-secret" },
        body: JSON.stringify({ filePath: "test.md" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("content is required");
  });
});
