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

| Variable        | Required     | Default | Description           |
| --------------- | ------------ | ------- | --------------------- |
| `MARKDOWN_DIR`  | Yes          | `.`     | Directory to search   |
| `WORKER_URL`    | For semantic | -       | Cloudflare Worker URL |
| `WORKER_SECRET` | For semantic | -       | Auth secret           |

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
