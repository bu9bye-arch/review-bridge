# Review Bridge

English | [中文](./README.md)

Review Bridge is an MCP server that collects Git change context and asks a configured LLM to review the current code changes.

It is intended for AI coding clients that support MCP, such as Codex, Claude Code, Cline, or editor integrations.

## Requirements

- Node.js 20 or newer
- Git
- An API key for at least one supported LLM provider

## Install

```powershell
npm install
npm run build
```

The MCP server entrypoint is generated at:

```text
dist/index.cjs
```

The optional CLI entrypoint is generated at:

```text
dist/cli.cjs
```

### Optional: Install Skill Document

For enhanced integration with Codex, it is recommended to also install the skill document:

```powershell
# Copy SKILL.md to your Codex skills directory
$skillDir = "$env:USERPROFILE\.codex\skills\review-bridge-auto-review"
New-Item -ItemType Directory -Path $skillDir -Force
Copy-Item .\SKILL.md "$skillDir\SKILL.md"
```

This enables automatic code review after code changes. See the [Optional Codex Skill](#optional-codex-skill) section for details.

## Configure Models

Review Bridge reads its runtime configuration from:

```text
~/.review-bridge/config.json
```

You can copy and edit the example config:

```powershell
mkdir $env:USERPROFILE\.review-bridge
Copy-Item examples\config.json $env:USERPROFILE\.review-bridge\config.json
```

The config should reference environment variable names, not raw API keys:

```json
{
  "default_model": "gpt-4o",
  "models": {
    "gpt-4o": {
      "provider": "openai",
      "model": "gpt-4o",
      "api_key_env": "OPENAI_API_KEY",
      "max_tokens": 64000
    },
    "openai-compatible-example": {
      "provider": "openai-compatible",
      "model": "your-model-id",
      "api_key_env": "YOUR_PROVIDER_API_KEY",
      "base_url": "https://your-provider.example/v1",
      "max_tokens": 64000
    }
  },
  "review_prompt_template": "default",
  "auto_review_on_stop": false,
  "diff_default_range": "HEAD~1..HEAD"
}
```

Set API keys through your shell or operating-system environment settings:

```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'your-api-key', 'User')
```

Restart your MCP client after changing user-level environment variables.

## MCP Client Examples

Use the absolute path to `dist/index.cjs` in your local checkout.

### Codex

Add a server entry to your Codex MCP configuration:

```toml
[mcp_servers.review-bridge]
command = "node"
args = ["C:\\path\\to\\review-bridge\\dist\\index.cjs"]
```

### Claude Code

```json
{
  "mcpServers": {
    "review-bridge": {
      "command": "node",
      "args": ["C:\\path\\to\\review-bridge\\dist\\index.cjs"]
    }
  }
}
```

### Cline

```json
{
  "mcpServers": {
    "review-bridge": {
      "command": "node",
      "args": ["C:\\path\\to\\review-bridge\\dist\\index.cjs"],
      "autoApprove": [
        "review_changes",
        "review_last_change",
        "list_review_models"
      ]
    }
  }
}
```

## Optional Codex Skill

This repository includes [SKILL.md](./SKILL.md), an optional Codex skill that tells Codex when and how to call Review Bridge after code changes.

To install it globally for Codex, copy it into your Codex skills directory:

```powershell
$skillDir = "$env:USERPROFILE\.codex\skills\review-bridge-auto-review"
New-Item -ItemType Directory -Path $skillDir -Force
Copy-Item .\SKILL.md "$skillDir\SKILL.md"
```

Then add a short trigger rule to your global or project `AGENTS.md`, for example:

```markdown
When a task modifies code, use the `review-bridge-auto-review` skill to call the configured `review-bridge` MCP server and review the current diff before finalizing.
```

Only enable automatic review when you are comfortable sending repository diff context to your configured model provider.

## Tools

### `review_changes`

Reviews a repository diff and returns an LLM-generated code review.

Common arguments:

```json
{
  "cwd": "C:\\path\\to\\your\\project",
  "source_tool": "other",
  "review_focus": ["correctness"],
  "diff_range": "HEAD~1..HEAD",
  "max_tokens": 12000
}
```

### `review_last_change`

Convenience tool that reviews recent changes for the current or provided working directory.

```json
{
  "cwd": "C:\\path\\to\\your\\project"
}
```

### `list_review_models`

Lists configured review models without exposing API key values.

## Security Notes

- Do not commit real API keys.
- Keep API keys in environment variables.
- Review Bridge sends selected Git diff and repository context to the configured model provider.
- For private repositories, use only providers and endpoints you trust.
- Add local outputs, logs, and `.env` files to `.gitignore`.

## Development

Build:

```powershell
npm run build
```

Run the MCP inspector:

```powershell
npm run inspect
```

Run tests:

```powershell
npm test
```

At the moment, this project may not include test files; in that case Vitest exits with a "No test files found" message.

## Note

纯 vibe coding 产物 from Codex.
