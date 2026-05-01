# Review Bridge

[English](./README.en.md) | 中文

Review Bridge 是一个 MCP 服务器，用于收集 Git 变更上下文并请求配置的 LLM 审查当前代码变更。

它适用于支持 MCP 的 AI 编码客户端，如 Codex、Claude Code、Cline 或编辑器集成。

## 要求

- Node.js 20 或更高版本
- Git
- 至少一个支持的 LLM 提供商的 API 密钥

## 安装

```powershell
npm install
npm run build
```

MCP 服务器入口点生成在：

```text
dist/index.cjs
```

可选的 CLI 入口点生成在：

```text
dist/cli.cjs
```

### 可选：安装技能文档

为了增强与 Codex 的集成，建议同时安装技能文档：

```powershell
# 将 SKILL.md 复制到 Codex 技能目录
$skillDir = "$env:USERPROFILE\.codex\skills\review-bridge-auto-review"
New-Item -ItemType Directory -Path $skillDir -Force
Copy-Item .\SKILL.md "$skillDir\SKILL.md"
```

这将启用代码变更后的自动代码审查。详情请参阅 [可选 Codex 技能](#可选-codex-技能) 部分。

## 配置模型

Review Bridge 从以下位置读取运行时配置：

```text
~/.review-bridge/config.json
```

您可以复制并编辑示例配置：

```powershell
mkdir $env:USERPROFILE\.review-bridge
Copy-Item examples\config.json $env:USERPROFILE\.review-bridge\config.json
```

配置应引用环境变量名称，而不是原始 API 密钥：

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

通过 shell 或操作系统环境设置 API 密钥：

```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'your-api-key', 'User')
```

更改用户级环境变量后，重启 MCP 客户端。

## MCP 客户端示例

在本地检出中使用 `dist/index.cjs` 的绝对路径。

### Codex

在 Codex MCP 配置中添加服务器条目：

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

## 可选 Codex 技能

此仓库包含 [SKILL.md](./SKILL.md)，这是一个可选的 Codex 技能，告诉 Codex 在代码变更后何时以及如何调用 Review Bridge。

要为 Codex 全局安装，将其复制到 Codex 技能目录：

```powershell
$skillDir = "$env:USERPROFILE\.codex\skills\review-bridge-auto-review"
New-Item -ItemType Directory -Path $skillDir -Force
Copy-Item .\SKILL.md "$skillDir\SKILL.md"
```

然后在全局或项目 `AGENTS.md` 中添加简短的触发规则，例如：

```markdown
当任务修改代码时，使用 `review-bridge-auto-review` 技能调用配置的 `review-bridge` MCP 服务器，并在最终确定前审查当前 diff。
```

仅在您愿意将仓库 diff 上下文发送到配置的模型提供商时才启用自动审查。

## 工具

### `review_changes`

审查仓库 diff 并返回 LLM 生成的代码审查。

常用参数：

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

便捷工具，审查当前或指定工作目录的最近变更。

```json
{
  "cwd": "C:\\path\\to\\your\\project"
}
```

### `list_review_models`

列出配置的审查模型，不暴露 API 密钥值。

## 安全说明

- 不要提交真实的 API 密钥。
- 将 API 密钥保存在环境变量中。
- Review Bridge 会将选定的 Git diff 和仓库上下文发送到配置的模型提供商。
- 对于私有仓库，仅使用您信任的提供商和端点。
- 将本地输出、日志和 `.env` 文件添加到 `.gitignore`。

## 开发

构建：

```powershell
npm run build
```

运行 MCP 检查器：

```powershell
npm run inspect
```

运行测试：

```powershell
npm test
```

目前，此项目可能不包含测试文件；在这种情况下，Vitest 会显示 "No test files found" 消息。

## 备注

纯 vibe coding 产物 from Codex.