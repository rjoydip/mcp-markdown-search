import { readdirSync, realpathSync, statSync } from "fs";
import path from "path";

/**
 * walkMarkdown — recursively collect all .md and .mdx files under `dir`.
 * Returns absolute paths. Silently skips unreadable directories.
 * Detects symlink cycles via resolved real path tracking.
 */
// fallow-ignore-next-line complexity
export function walkMarkdown(dir: string, visited: Set<string> = new Set()): string[] {
  const results: string[] = [];
  try {
    const real = realpathSync(dir);
    if (visited.has(real)) return results;
    visited.add(real);

    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          results.push(...walkMarkdown(full, visited));
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
