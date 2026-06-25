# CLI Reference

## Quick CLI Usage

```sh
# Search markdown files
bun run cli --search "authentication" --dir ./docs

# List all markdown files
bun run cli --list --dir ./docs

# Read a file
bun run cli --read ./docs/usage.md
```

## Available Scripts

```sh
bun run dev              # Start Cloudflare Worker dev server
bun run dev:test         # Start Worker with MCP_SECRET for auth testing
bun run dev:mcp          # Start MCP server in watch mode
bun run cli              # Run CLI tool
bun run deploy           # Deploy Worker to Cloudflare
bun run deploy:preview   # Deploy to preview environment
bun run test             # Run all tests
bun run test:mcp         # Run MCP worker HTTP tests (requires WORKER_URL)
bun run test:mcp:local   # Run MCP tests against localhost:8787
bun run test:mcp:auth    # Run MCP tests with auth against localhost:8787
bun run lint             # Lint with oxlint
bun run lint:fix         # Lint fix + format
bun run format           # Format with oxfmt
bun run format:check     # Check formatting
bun run typecheck        # TypeScript type check
bun run build            # Build standalone binary
bun run build:cli        # Build CLI binary
bun run build:all        # Build both binaries
bun run publish:preview  # Publish to pkg.pr.new
bun run fallow           # Run fallow analysis
bun run fallow:dead      # Find dead code
bun run fallow:dupes     # Find duplicated code
bun run fallow:health    # Check file health
```

## CLI Commands

### search

Search for text in markdown files using ripgrep.

```sh
bun run cli --search <query> [options]
```

**Options:**

- `--search, -s <query>` - Search query (required)
- `--case, -c` - Case-sensitive search
- `--dir, -d <path>` - Directory to search (default: . or MARKDOWN_DIR)

**Example:**

```sh
bun run cli --search "authentication" --dir ./docs
bun run cli -s "Hello World" -c --dir ./docs
```

### list

List all markdown files in a directory.

```sh
bun run cli --list [options]
```

**Options:**

- `--dir, -d <path>` - Directory to search (default: . or MARKDOWN_DIR)

**Example:**

```sh
bun run cli --list --dir ./docs
```

### read

Read and print file contents.

```sh
bun run cli --read <path>
```

**Options:**

- `--read, -r <path>` - File path to read (required)

**Example:**

```sh
bun run cli --read ./docs/usage.md
```

## MCP Server Mode

Start the MCP server for use with coding agents:

```sh
MARKDOWN_DIR=./docs bun run dev:mcp
```

Required environment variables:

| Variable       | Required | Description                               |
| -------------- | -------- | ----------------------------------------- |
| `MARKDOWN_DIR` | Yes      | Directory to search                       |
| `WORKER_URL`   | No       | Cloudflare Worker URL for semantic search |
| `MCP_SECRET`   | No       | Auth secret for Worker                    |

## Cloudflare Worker Mode

Start local Worker dev server:

```sh
bun run dev
```

Deploy to production:

```sh
bun run deploy
```

Deploy to preview environment:

```sh
bun run deploy:preview
```

### Worker Routes

| Method | Endpoint  | Description      |
| ------ | --------- | ---------------- |
| GET    | `/health` | Health check     |
| POST   | `/search` | Semantic search  |
| POST   | `/index`  | Index a document |

### Worker Environment Variables

Set via `wrangler secret put`:

| Variable        | Default | Description            |
| --------------- | ------- | ---------------------- |
| `MCP_SECRET`    | -       | Auth secret (required) |
| `CHUNK_SIZE`    | `1000`  | Max chunk size         |
| `CHUNK_OVERLAP` | `100`   | Chunk overlap          |

## pkg.pr.new Publishing

Publish preview packages for testing:

```sh
bun run publish:preview
```

This builds the binaries and publishes to pkg.pr.new. The URL will be posted in the PR comment.

**Usage:**

```sh
# Install from preview
npm install https://pkg.pr.new/rjoydip/mcp-markdown-search/mcp-markdown-search@{sha}

# Or using npx
npx https://pkg.pr.new/rjoydip/mcp-markdown-search/mcp-markdown-search@{sha}
```
