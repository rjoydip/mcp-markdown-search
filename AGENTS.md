# AGENTS.md — MCP Markdown Search

> This file tells AI coding agents how this codebase is structured, how to contribute safely, and which tools to use.

---

## Project Overview

| Component         | Location       | Runtime | Purpose                        |
| ----------------- | -------------- | ------- | ------------------------------ |
| MCP Server        | `src/mcp.ts`   | Bun     | Exposes search tools via stdio |
| Cloudflare Worker | `src/index.ts` | Workers | Semantic search, indexing      |

The MCP server exposes **6 tools** for coding agents:

- `search_markdown` — ripgrep full-text search (local, fast)
- `semantic_search` — vector similarity via Cloudflare Vectorize
- `list_markdown_files` — file discovery
- `read_markdown_file` — full file content
- `index_file_to_vector` — embed + upsert one file
- `index_all_to_vector` — bulk re-index all docs

---

## Repository Layout

```bash
mcp-markdown-search/
├── src/
│   ├── index.ts              # Cloudflare Worker (HTTP routes)
│   ├── mcp.ts                # MCP server (stdio transport)
│   └── lib/
│       ├── chunker.ts        # Text chunking logic
│       ├── walker.ts         # Recursive markdown file discovery
│       └── worker-client.ts  # HTTP client for Worker
├── tests/
│   ├── chunker.test.ts       # Unit tests
│   ├── walker.test.ts        # Unit tests
│   └── integration.test.ts   # Integration tests
├── docs/
│   ├── usage.md              # User documentation
│   ├── architecture.md      # System design
│   └── cli.md                # CLI reference
├── .github/workflows/
│   ├── ci.yml                # Lint + test
│   ├── deploy.yml             # Production deploy
│   └── preview.yml           # Preview deployments
├── AGENTS.md                 # This file
├── README.md
└── package.json
```

---

## Development Commands

```bash
bun install              # install deps
bun run dev:mcp         # run MCP server (stdio) with --watch
bun run dev             # run Cloudflare Worker dev
bun run deploy          # deploy to production
bun test                # run all tests (Bun test runner)
bun run lint            # lint with oxlint
bun run format          # format with oxfmt
bun run typecheck       # type-check with tsc
bun run fallow           # run fallow analysis
```

---

## Preview Deployments

Each PR automatically gets a preview deployment:

1. PR is opened/updated
2. CI runs (lint, typecheck, test)
3. Preview deploys to Cloudflare Workers
4. PR comment posted with preview URL

Quick test:

```bash
# Test health
curl https://<worker>-<hash>.workers.dev/health

# Test search
curl -X POST https://<worker>-<hash>.workers.dev/search \
  -H "Content-Type: application/json" \
  -H "X-MCP-Secret: $MCP_SECRET" \
  -d '{"query":"test","topK":1}'
```

---

## Environment Variables

### MCP Server

| Variable       | Required      | Description                      |
| -------------- | ------------- | -------------------------------- |
| `MARKDOWN_DIR` | Yes           | Absolute path to the docs folder |
| `WORKER_URL`   | Semantic only | Deployed Worker HTTPS URL        |
| `MCP_SECRET`   | Semantic only | Shared secret matching Worker    |

### Cloudflare Worker (set via `wrangler secret put`)

| Variable        | Description                             |
| --------------- | --------------------------------------- |
| `MCP_SECRET`    | Shared secret for auth                  |
| `CHUNK_SIZE`    | Characters per chunk (default: `1000`)  |
| `CHUNK_OVERLAP` | Overlap between chunks (default: `100`) |

---

## Code Conventions

- **TypeScript everywhere** — no plain `.js` files
- **No default exports** from lib modules
- **Pure functions in `src/lib/`** — easily unit-tested
- **Error handling** — tool handlers return `{ isError: true }`
- **Bun APIs** — prefer `Bun.file()`, `Bun.spawn()`, `Bun.write()`

---

## Testing Strategy

- **`tests/*.test.ts`** — unit tests for lib modules
- **`tests/integration.test.ts`** — integration tests
- **`bun test`** — run all tests
- All tests must pass before merging

---

## CI/CD

| Workflow      | Trigger      | Purpose               |
| ------------- | ------------ | --------------------- |
| `ci.yml`      | PR/push      | lint, typecheck, test |
| `preview.yml` | PR/push      | Auto preview deploy   |
| `deploy.yml`  | push to main | Production deploy     |

---

## Do Not

- Do not commit `.dev.vars`, `.env`, or secrets
- Do not call `wrangler deploy` on production without review
- Do not change Vectorize index name without updating docs/tests
- Do not add runtime deps to Worker (>1MB limit)
