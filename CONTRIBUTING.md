# Contributing to mcp-markdown-search

Thank you for your interest in contributing!

## Development Setup

```sh
bun install
bun run dev:mcp    # Run MCP server in watch mode
bun run dev        # Run Cloudflare Worker in dev mode
```

## Testing

```sh
bun test           # Run all tests
bun test:watch     # Run tests in watch mode
bun run test --coverage  # Run with coverage
```

## Code Quality

```sh
bun run lint          # Run oxlint
bun run format       # Run oxfmt
bun run typecheck    # Run TypeScript
bun run fallow        # Run fallow analysis
```

Pre-commit hooks run automatically via simple-git-hooks.

## Project Structure

```
src/
├── index.ts     # Cloudflare Worker (HTTP API)
├── mcp.ts       # MCP server (stdio transport)
└── lib/
    ├── chunker.ts      # Text chunking
    ├── walker.ts       # File discovery
    └── worker-client.ts # HTTP client

tests/
├── chunker.test.ts     # Unit tests
├── walker.test.ts      # Unit tests
└── integration.test.ts # Integration tests

docs/
├── architecture.md # System design
└── usage.md        # User documentation
```

## Adding a New Tool

1. Add tool definition in `src/mcp.ts` `tools` array
2. Create handler function (e.g., `handleNewTool`)
3. Add case in `CallToolRequestSchema` switch
4. Add tests in `tests/`

## Adding a New Worker Route

1. Add route in `src/index.ts`
2. Implement handler function
3. Add authentication check
4. Add tests

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `bun run lint && bun run typecheck && bun test`
5. Submit PR with description

## Code Style

- TypeScript strict mode
- No JSX (pure TS)
- Use Bun APIs where available
- JSDoc comments for functions
- Named exports only (no default exports from lib modules)
