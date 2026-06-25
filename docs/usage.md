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

### MCP Worker Tests

Tests the deployed Cloudflare Worker endpoints via HTTP:

| Test suite | Command                                                 | Requires        |
| ---------- | ------------------------------------------------------- | --------------- |
| Endpoints  | `WORKER_URL=http://... bun run test:mcp`                | Worker running  |
| Auth       | `WORKER_URL=http://... MCP_SECRET=... bun run test:mcp` | Worker + secret |

```sh
# Local: start worker in one terminal
bun run dev

# Local: run functional tests in another
bun run test:mcp:local

# Local: run full test suite with auth
bun run dev:test    # terminal 1 (worker with MCP_SECRET)
bun run test:mcp:auth  # terminal 2
```

### CI / Preview

On every PR, after preview deploy, the workflow automatically runs:

1. **MCP Health Check** — verifies `/health` endpoint
2. **MCP Integration Test** — runs all tests with the preview URL and secret
3. **PR Comment** — posts pass/fail results
4. **Commit Status** — visible status check in PR

### Auth Behavior

- When `MCP_SECRET` is **not set** on the Worker, authentication is bypassed (local dev default)
- When `MCP_SECRET` is **set**, all `/search` and `/index` requests require `X-MCP-Secret` header
- Auth tests pass both when auth is enforced (`401`) and when bypassed (`500` from missing AI/Vectorize)
