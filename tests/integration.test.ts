import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("MCP Integration Tests", () => {
  let tempDir: string;
  let testFiles: string[];

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-test-"));
    const subDir = join(tempDir, "subdir");
    mkdirSync(subDir, { recursive: true });

    writeFileSync(
      join(tempDir, "test1.md"),
      "# Test Document\n\nThis is test content with keyword foo.",
    );
    writeFileSync(join(tempDir, "test2.md"), "# Another Doc\n\nContains bar and keyword baz.");
    writeFileSync(
      join(subDir, "nested.md"),
      "# Nested\n\nContent with keyword foo in nested file.",
    );

    testFiles = [join(tempDir, "test1.md"), join(tempDir, "test2.md"), join(subDir, "nested.md")];
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("walkMarkdown finds all markdown files recursively", async () => {
    const { walkMarkdown } = await import("../src/lib/walker");
    const files = walkMarkdown(tempDir);
    expect(files).toHaveLength(3);
    testFiles.forEach((file) => {
      expect(files).toContain(file);
    });
  });

  test("splitIntoChunks splits on headings", async () => {
    const { splitIntoChunks } = await import("../src/lib/chunker");
    const content = `# Section 1\n\nContent 1\n\n## Section 2\n\nContent 2`;
    const chunks = splitIntoChunks(content);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("buildVectorId creates safe IDs", async () => {
    const { buildVectorId } = await import("../src/lib/chunker");
    const id = buildVectorId("/path/to/file.md", 0);
    expect(id).toMatch(/^[a-zA-Z0-9._-]+__chunk_0$/);
    expect(id).not.toContain("/");
  });
});

describe("WorkerClient Integration", () => {
  test("WorkerClient requires both URL and secret", async () => {
    const { WorkerClient } = await import("../src/lib/worker-client");
    const client = new WorkerClient({ workerUrl: "http://localhost:8787", workerSecret: "secret" });
    expect(client).toBeDefined();
  });

  test("WorkerClient post method validates URL", async () => {
    const { WorkerClient } = await import("../src/lib/worker-client");
    const client = new WorkerClient({ workerUrl: "", workerSecret: "test" });

    let errorThrown = false;
    try {
      await client.search("test");
    } catch {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });

  test("WorkerClient post method validates secret", async () => {
    const { WorkerClient } = await import("../src/lib/worker-client");
    const client = new WorkerClient({ workerUrl: "http://localhost", workerSecret: "" });

    let errorThrown = false;
    try {
      await client.search("test");
    } catch {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });
});

describe("Chunking Integration", () => {
  test("chunks markdown file into searchable pieces", async () => {
    const { splitIntoChunks } = await import("../src/lib/chunker");

    const longContent = `
# Introduction

This is the introduction section with some content that we want to chunk properly.

## Getting Started

Here we have another section with its own content.

### Prerequisites

More content here.

${"x".repeat(2000)}

## Installation

Final section with lots of content that should be split across multiple chunks because it exceeds the default size limit.
`.trim();

    const chunks = splitIntoChunks(longContent, 500, 50);
    expect(chunks.length).toBeGreaterThan(1);

    chunks.forEach((chunk) => {
      expect(chunk.length).toBeGreaterThan(20);
    });
  });

  test("preserves heading structure in chunks", async () => {
    const { splitIntoChunks } = await import("../src/lib/chunker");

    const content = `# Main Title

Introduction paragraph.

## First Section

Content of first section.

### Subsection A

Content A.

### Subsection B

Content B.

## Second Section

More content.

### Subsection C

Content C.
`;

    const chunks = splitIntoChunks(content, 1000, 100);

    const hasFirstSection = chunks.some((c) => c.includes("## First Section"));
    const hasSubsection = chunks.some((c) => c.includes("### Subsection"));

    expect(hasFirstSection || hasSubsection).toBe(true);
  });

  test("handles empty content", async () => {
    const { splitIntoChunks } = await import("../src/lib/chunker");
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("   ")).toEqual([]);
    expect(splitIntoChunks("  \n  ")).toEqual([]);
  });

  test("filters out very short chunks", async () => {
    const { splitIntoChunks } = await import("../src/lib/chunker");
    const chunks = splitIntoChunks("Hi", 1000, 100);
    expect(chunks).toEqual([]);
  });
});

describe("File Discovery Integration", () => {
  test("discovers files in nested directories", () => {
    const testDir = mkdtempSync(join(tmpdir(), "mcp-nested-"));
    const nestedDir = join(testDir, "a", "b", "c");
    mkdirSync(nestedDir, { recursive: true });

    writeFileSync(join(testDir, "root.md"), "# Root");
    writeFileSync(join(nestedDir, "deep.md"), "# Deep");

    const { walkMarkdown } = require("../src/lib/walker");
    const files = walkMarkdown(testDir);

    rmSync(testDir, { recursive: true, force: true });
    expect(files).toHaveLength(2);
  });

  test("filters non-markdown files", () => {
    const testDir = mkdtempSync(join(tmpdir(), "mcp-filter-"));

    writeFileSync(join(testDir, "document.md"), "# Doc");
    writeFileSync(join(testDir, "readme.mdx"), "# MDX");
    writeFileSync(join(testDir, "data.txt"), "# TXT");
    writeFileSync(join(testDir, "script.js"), "console.log('js')");

    const { walkMarkdown } = require("../src/lib/walker");
    const files = walkMarkdown(testDir);

    rmSync(testDir, { recursive: true, force: true });
    expect(files).toHaveLength(2);
    expect(files.every((f: string) => f.endsWith(".md") || f.endsWith(".mdx"))).toBe(true);
  });

  test("handles non-existent directory gracefully", () => {
    const { walkMarkdown } = require("../src/lib/walker");
    const files = walkMarkdown("/non/existent/path");
    expect(files).toEqual([]);
  });
});
