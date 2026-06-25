import { walkMarkdown, isMarkdownFile } from "../src/lib/walker";
import { test, expect } from "bun:test";

test("isMarkdownFile returns true for md files", () => {
  expect(isMarkdownFile("file.md")).toBe(true);
  expect(isMarkdownFile("file.mdx")).toBe(true);
  expect(isMarkdownFile("path/to/file.md")).toBe(true);
});

test("isMarkdownFile returns false for non-markdown files", () => {
  expect(isMarkdownFile("file.txt")).toBe(false);
  expect(isMarkdownFile("file.js")).toBe(false);
  expect(isMarkdownFile("file")).toBe(false);
});

test("walkMarkdown returns empty for non-existent dir", () => {
  const files = walkMarkdown("/non/existent/path");
  expect(files).toEqual([]);
});
