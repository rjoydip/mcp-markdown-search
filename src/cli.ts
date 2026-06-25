#!/usr/bin/env bun
/**
 * CLI for mcp-markdown-search
 *
 * Usage:
 *   bun run src/cli.ts --search "query" [--dir ./docs]
 *   bun run src/cli.ts --list
 *   bun run src/cli.ts --read path/to/file.md
 *   bun run src/cli.ts --help
 *
 * Or as MCP server:
 *   bun run src/mcp.ts
 */

import { parseArgs } from "util";
import { readFileSync } from "fs";
import { resolve } from "path";
import { walkMarkdown } from "./lib/walker.js";

const HELP = `
mcp-markdown-search CLI

Usage:
  bun run src/cli.ts --search <query>     Search markdown files
  bun run src/cli.ts --list               List all markdown files
  bun run src/cli.ts --read <path>        Read a markdown file
  bun run src/cli.ts --help               Show this help

Options:
  --search <query>    Search for text in markdown files
  --case             Case-sensitive search (default: false)
  --dir <path>       Directory to search (default: . or MARKDOWN_DIR)
  --list             List all markdown files in directory
  --read <path>      Read and print file contents
  --help             Show this help message

Environment:
  MARKDOWN_DIR       Directory to search (default: .)
`.trim();

interface CliOptions {
  search?: string;
  list?: boolean;
  read?: string;
  case?: boolean;
  dir?: string;
  help?: boolean;
}

async function runSearch(query: string, dir: string, caseSensitive: boolean): Promise<void> {
  const files = walkMarkdown(dir);
  if (files.length === 0) {
    console.log("No markdown files found");
    return;
  }

  if (!Bun.which("rg")) {
    console.error("ripgrep (rg) is not installed. Install it to use search.");
    return;
  }

  const args = caseSensitive ? [query, ...files] : ["-i", query, ...files];
  const proc = Bun.spawn(["rg", ...args], { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout as ReadableStream<Uint8Array>).text();

  if (output) {
    process.stdout.write(output);
  } else {
    console.log("No matches found");
  }
}

function runList(dir: string): void {
  const files = walkMarkdown(dir);
  if (files.length === 0) {
    console.log("No markdown files found");
    return;
  }
  console.log(files.join("\n"));
}

function runRead(filePath: string, baseDir: string): void {
  const base = resolve(baseDir);
  const resolved = resolve(base, filePath);
  if (!resolved.startsWith(base + "\\") && !resolved.startsWith(base + "/") && resolved !== base) {
    throw new Error("Access denied: path is outside the allowed directory");
  }
  const content = readFileSync(resolved, "utf-8");
  console.log(content);
}

function parseCliArgs(argv: string[]): CliOptions {
  const parsed = parseArgs({
    args: argv,
    options: {
      search: { type: "string", short: "s" },
      list: { type: "boolean", short: "l" },
      read: { type: "string", short: "r" },
      case: { type: "boolean", short: "c" },
      dir: { type: "string", short: "d" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });
  return parsed.values as CliOptions;
}

async function dispatchCommand(options: CliOptions, dir: string): Promise<void> {
  if (options.search !== undefined) {
    await runSearch(options.search, dir, options.case ?? false);
  } else if (options.list) {
    runList(dir);
  } else if (options.read) {
    runRead(options.read, dir);
  } else {
    console.error("No command specified. Use --help for usage.");
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  let options: CliOptions;
  try {
    options = parseCliArgs(args);
  } catch (e) {
    console.error("Invalid arguments:", e);
    console.log(HELP);
    process.exit(1);
  }

  const dir = options.dir || process.env.MARKDOWN_DIR || ".";

  try {
    await dispatchCommand(options, dir);
  } catch (e) {
    console.error(String(e));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
