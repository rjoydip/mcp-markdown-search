# Usage

## Quick Start

```sh
bun install
bun run dev:mcp   # Start MCP server
```

## MCP Tools

### search_markdown

Full-text search using ripgrep (fast, local).

```json
{
  "name": "search_markdown",
  "arguments": {
    "query": "your search term",
    "caseSensitive": false
  }
}
```

**Arguments:**

- `query` (string, required) - Search query
- `caseSensitive` (boolean, optional) - Case-sensitive search

### semantic_search

Vector similarity search via Cloudflare Vectorize.

```json
{
  "name": "semantic_search",
  "arguments": {
    "query": "your search term",
    "topK": 5
  }
}
```

**Arguments:**

- `query` (string, required) - Search query
- `topK` (number, optional) - Max results (default: 5)

### list_markdown_files

List all markdown files in `MARKDOWN_DIR`.

```json
{
  "name": "list_markdown_files",
  "arguments": {}
}
```

### read_markdown_file

Read a file's content.

```json
{
  "name": "read_markdown_file",
  "arguments": {
    "filePath": "/absolute/path/to/file.md"
  }
}
```

**Arguments:**

- `filePath` (string, required) - Absolute path

### index_file_to_vector

Index a single file for semantic search.

```json
{
  "name": "index_file_to_vector",
  "arguments": {
    "filePath": "/absolute/path/to/file.md"
  }
}
```

**Arguments:**

- `filePath` (string, required) - Absolute path

### index_all_to_vector

Index all markdown files in `MARKDOWN_DIR`.

```json
{
  "name": "index_all_to_vector",
  "arguments": {}
}
```

## Environment Variables

### MCP Server

| Variable       | Required     | Default | Description           |
| -------------- | ------------ | ------- | --------------------- |
| `MARKDOWN_DIR` | Yes          | `.`     | Directory to search   |
| `WORKER_URL`   | For semantic | -       | Cloudflare Worker URL |
| `MCP_SECRET`   | For semantic | -       | Auth secret           |

### Cloudflare Worker

Set via `wrangler secret put`:

| Variable        | Default | Description            |
| --------------- | ------- | ---------------------- |
| `MCP_SECRET`    | -       | Auth secret (required) |
| `CHUNK_SIZE`    | `1000`  | Max chunk size         |
| `CHUNK_OVERLAP` | `100`   | Chunk overlap          |

## Examples

### Search local docs

```json
{
  "name": "search_markdown",
  "arguments": {
    "query": "authentication",
    "caseSensitive": false
  }
}
```

### Search with semantic understanding

```json
{
  "name": "semantic_search",
  "arguments": {
    "query": "how does auth work",
    "topK": 3
  }
}
```

### Index a new document

```json
{
  "name": "index_file_to_vector",
  "arguments": {
    "filePath": "/docs/api-reference.md"
  }
}
```

## Testing

### MCP Worker HTTP Tests

Tests the Cloudflare Worker endpoints via live HTTP. Test suites auto-select based on env vars:

| Suite                 | Env vars                    | What it tests                            |
| --------------------- | --------------------------- | ---------------------------------------- |
| `MCP Endpoints`       | `WORKER_URL`                | Routes, validation, handlers             |
| `MCP Auth (enforced)` | `WORKER_URL` + `MCP_SECRET` | `401` for missing/wrong `X-MCP-Secret`   |
| `MCP Auth (bypassed)` | `WORKER_URL` only           | `500` from missing AI/Vectorize bindings |

```sh
# Terminal 1: start worker (auth bypassed by default)
bun run dev

# Terminal 2: run endpoint + bypassed-auth tests
bun run test:mcp:local
```

```sh
# Terminal 1: start worker with auth enforced
bun run dev:auth

# Terminal 2: run all tests (endpoints + enforced auth, requires AI/Vectorize)
bun run test:mcp:auth
```

### CI Integration

The `ci.yml` workflow runs MCP integration tests in the `integration` job:

1. Starts `wrangler dev --remote` with Cloudflare credentials (AI/Vectorize available)
2. Runs all MCP tests with `WORKER_URL` and `MCP_SECRET`
3. Kills the dev server

### Auth Behavior

- Auth **bypassed** when `MCP_SECRET` is not set on the Worker (local dev default via `bun run dev`)
- Auth **enforced** when `MCP_SECRET` is set (via `dev:auth`, or deployed via `wrangler secret put`)
- Auth tests split into two suites: `MCP Auth (enforced)` expects `401`, `MCP Auth (bypassed)` expects `500` (from missing AI/Vectorize)
