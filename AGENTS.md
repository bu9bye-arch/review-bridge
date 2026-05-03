# Project AGENTS.md

## Scope

These instructions apply to this repository only.

## Development

- Prefer small, focused changes that match the existing TypeScript style.
- Keep generated artifacts such as `dist/`, local review outputs, logs, and environment files out of Git.
- Do not commit real API keys, tokens, personal configuration paths, or user-specific MCP client settings.
- Keep public documentation generic. Use placeholders such as `C:\path\to\review-bridge` and `YOUR_PROVIDER_API_KEY`.

## Validation

Build with:

```powershell
npm.cmd run build
```

Test with:

```powershell
npm.cmd test
```

If there are no test files, Vitest may exit with a "No test files found" message; report that separately from real assertion failures.

## MCP Review

- This repository can be reviewed with the `review-bridge` MCP server.
- Before sending repository diffs or source context to an external model provider, ensure the user or project owner has authorized that data transfer.
- Treat MCP review results as advisory: fix confirmed Critical and Important issues first, and explain any recommendations that are ignored as false positives or out of scope.
