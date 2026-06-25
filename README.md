# mcp-markdown-search

[![License](https://img.shields.io/github/license/rjoydip/mcp-markdown-search)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3+-green)](https://bun.sh)
[![Fallow Health](.artifacts/fallow-health.svg)](https://docs.fallow.tools/)
[![CI](https://github.com/rjoydip/mcp-markdown-search/actions/workflows/ci.yml/badge.svg)](https://github.com/rjoydip/mcp-markdown-search/actions/workflows/ci.yml)

MCP server for searching markdown files with full-text and semantic search capabilities.

## Quick start

```sh
bun install
bun run dev:mcp   # Start MCP server (stdio)
```

## Preview Deployments

Every PR automatically gets a preview deployment. The preview URL is posted as a PR comment.

```bash
# Test preview
curl https://<preview-url>/health
```

## Documentation

- [Usage](docs/usage.md) — API reference, examples, configuration
- [Architecture](docs/architecture.md) — System design, components, Cloudflare resources
- [CLI Reference](docs/cli.md) — Available scripts and commands

## Available Tools

| Tool                   | Description                           |
| ---------------------- | ------------------------------------- |
| `search_markdown`      | Full-text search using ripgrep        |
| `semantic_search`      | Vector similarity search              |
| `list_markdown_files`  | List all markdown files               |
| `read_markdown_file`   | Read file content                     |
| `index_file_to_vector` | Index single file for semantic search |
| `index_all_to_vector`  | Index all files for semantic search   |

## Scripts

| Script                   | Description                     |
| ------------------------ | ------------------------------- |
| `bun run dev`            | Start Cloudflare Worker dev     |
| `bun run dev:test`       | Start Worker with MCP_SECRET    |
| `bun run dev:mcp`        | Start MCP server (stdio)        |
| `bun run deploy`         | Deploy to Cloudflare            |
| `bun run test`           | Run all tests                   |
| `bun run test:mcp`       | Run MCP worker HTTP tests       |
| `bun run test:mcp:local` | Run MCP tests locally (no auth) |
| `bun run test:mcp:auth`  | Run MCP tests with auth         |
| `bun run lint`           | Lint with oxlint                |
| `bun run format`         | Format with oxfmt               |
| `bun run typecheck`      | TypeScript check                |
| `bun run fallow`         | Code analysis                   |

## Tech Stack

- **Runtime**: Bun + Cloudflare Workers
- **MCP SDK**: @modelcontextprotocol/sdk
- **Search**: ripgrep (full-text) + Cloudflare Vectorize (semantic)
- **Framework**: Hono
- **Linter**: oxlint
- **Formatter**: oxfmt
- **Testing**: bun test
