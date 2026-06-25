import { readdirSync, statSync } from "fs";
import path from "path";

/**
 * walkMarkdown — recursively collect all .md and .mdx files under `dir`.
 * Returns absolute paths. Silently skips unreadable directories.
 */
// fallow-ignore-next-line complexity
export function walkMarkdown(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          results.push(...walkMarkdown(full));
        } else if (/\.(md|mdx)$/.test(entry)) {
          results.push(full);
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // skip unreadable directory
  }
  return results;
}

/**
 * isMarkdownFile — quick check on a filename/path extension.
 */
export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|mdx)$/.test(filePath);
}
