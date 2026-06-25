import { splitIntoChunks, buildVectorId } from "../src/lib/chunker";
import { test, expect } from "bun:test";

test("splitIntoChunks returns empty for empty text", () => {
  expect(splitIntoChunks("")).toEqual([]);
  expect(splitIntoChunks("   ")).toEqual([]);
});

test("splitIntoChunks returns single chunk for small text", () => {
  const text = "This is a small document.";
  const chunks = splitIntoChunks(text, 1000, 100);
  expect(chunks).toHaveLength(1);
  expect(chunks[0]).toBe(text);
});

test("splitIntoChunks splits on headings", () => {
  const text = `# Heading 1\n\nContent 1\n\n## Heading 2\n\nContent 2`;
  const chunks = splitIntoChunks(text, 1000, 100);
  expect(chunks.length).toBeGreaterThanOrEqual(2);
});

test("splitIntoChunks respects max chunk size", () => {
  const text = "a".repeat(2000);
  const chunks = splitIntoChunks(text, 1000, 100);
  expect(chunks.length).toBe(3);
});

test("splitIntoChunks filters short chunks", () => {
  const text = "Hi";
  const chunks = splitIntoChunks(text, 1000, 100);
  expect(chunks).toEqual([]);
});

test("buildVectorId creates safe IDs", () => {
  const id = buildVectorId("/path/to/file.md", 0);
  expect(id).toBe("_path_to_file.md__chunk_0");
  expect(id).not.toContain("/");
  expect(id).not.toContain("\\");
});
