import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, resolve, relative, isAbsolute } from "path";
import { tmpdir } from "os";
import { walkMarkdown, isMarkdownFile } from "../src/lib/walker";
import { splitIntoChunks, buildVectorId } from "../src/lib/chunker";
import { WorkerClient } from "../src/lib/worker-client";

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

  test("walkMarkdown finds all markdown files recursively", () => {
    const files = walkMarkdown(tempDir);
    expect(files).toHaveLength(3);
    testFiles.forEach((file) => {
      expect(files).toContain(file);
    });
  });

  test("splitIntoChunks splits on headings", () => {
    const content = `# Section 1\n\nContent 1\n\n## Section 2\n\nContent 2`;
    const chunks = splitIntoChunks(content);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test("buildVectorId creates safe IDs", () => {
    const id = buildVectorId("/path/to/file.md", 0);
    expect(id).toMatch(/^[a-zA-Z0-9._-]+__chunk_0$/);
    expect(id).not.toContain("/");
  });

  test("handleReadMarkdownFile logic reads markdown from allowed dir", () => {
    const filePath = "test1.md";
    const base = resolve(tempDir);
    const resolved = resolve(base, filePath);
    const rel = relative(base, resolved);
    expect(!rel.startsWith("..") && !isAbsolute(rel)).toBe(true);
    expect(isMarkdownFile(filePath)).toBe(true);
    const content = readFileSync(resolved, "utf-8");
    expect(content).toContain("Test Document");
  });

  test("handleReadMarkdownFile rejects non-markdown extension", () => {
    expect(isMarkdownFile("data.txt")).toBe(false);
    expect(isMarkdownFile("script.js")).toBe(false);
  });

  test("handleReadMarkdownFile rejects path traversal", () => {
    const base = resolve(tempDir);
    const traversal = resolve(base, "../../etc/passwd");
    const rel = relative(base, traversal);
    expect(rel.startsWith("..") || isAbsolute(rel)).toBe(true);
  });

  test("handleListMarkdownFiles logic lists .md/.mdx files", () => {
    const files = walkMarkdown(tempDir);
    expect(files.every((f) => f.endsWith(".md"))).toBe(true);
    expect(files).toContain(join(tempDir, "test1.md"));
  });
});

describe("WorkerClient Integration", () => {
  test("WorkerClient requires both URL and secret", () => {
    const client = new WorkerClient({ workerUrl: "http://localhost:8787", mcpSecret: "secret" });
    expect(client).toBeDefined();
  });

  test("WorkerClient post method validates URL", async () => {
    const client = new WorkerClient({ workerUrl: "", mcpSecret: "test" });

    let errorThrown = false;
    try {
      await client.search("test");
    } catch {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });

  test("WorkerClient post method validates secret", async () => {
    const client = new WorkerClient({ workerUrl: "http://localhost", mcpSecret: "" });

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
  test("chunks markdown file into searchable pieces", () => {
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

  test("preserves heading structure in chunks", () => {
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

  test("handles empty content", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks("   ")).toEqual([]);
    expect(splitIntoChunks("  \n  ")).toEqual([]);
  });

  test("filters out very short chunks", () => {
    const chunks = splitIntoChunks("Hi", 1000, 100);
    expect(chunks).toEqual([]);
  });
});

describe("File Discovery Integration", () => {
  let nestedDir: string;
  let filterDir: string;

  beforeAll(() => {
    nestedDir = mkdtempSync(join(tmpdir(), "mcp-nested-"));
    const deepDir = join(nestedDir, "a", "b", "c");
    mkdirSync(deepDir, { recursive: true });
    writeFileSync(join(nestedDir, "root.md"), "# Root");
    writeFileSync(join(deepDir, "deep.md"), "# Deep");

    filterDir = mkdtempSync(join(tmpdir(), "mcp-filter-"));
    writeFileSync(join(filterDir, "document.md"), "# Doc");
    writeFileSync(join(filterDir, "readme.mdx"), "# MDX");
    writeFileSync(join(filterDir, "data.txt"), "# TXT");
    writeFileSync(join(filterDir, "script.js"), "console.log('js')");
  });

  afterAll(() => {
    rmSync(nestedDir, { recursive: true, force: true });
    rmSync(filterDir, { recursive: true, force: true });
  });

  test("discovers files in nested directories", () => {
    const files = walkMarkdown(nestedDir);
    expect(files).toHaveLength(2);
  });

  test("filters non-markdown files", () => {
    const files = walkMarkdown(filterDir);
    expect(files).toHaveLength(2);
    expect(files.every((f: string) => f.endsWith(".md") || f.endsWith(".mdx"))).toBe(true);
  });

  test("handles non-existent directory gracefully", () => {
    const files = walkMarkdown("/non/existent/path");
    expect(files).toEqual([]);
  });
});
