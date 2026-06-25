# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please open an issue or contact the maintainer directly.

## Security Best Practices

### Environment Variables

Never commit secrets to version control:

- `.dev.vars` - Local development secrets (not committed)
- `.env` - Environment variables (not committed)
- `WORKER_SECRET` / `MCP_SECRET` - Shared secrets between MCP and Worker

### Authentication

The Cloudflare Worker uses `X-MCP-Secret` header authentication. Always use a strong, unique secret.

```bash
wrangler secret put MCP_SECRET
```

### Production Deployments

1. Use Cloudflare's built-in authentication
2. Enable observability in `wrangler.jsonc`
3. Use environment-specific secrets for staging vs production

### Data Handling

- Markdown files are read from disk - ensure file permissions are restricted
- No PII is stored in Vectorize metadata
- Content previews are truncated to 200 characters
