---
name: review-bridge-auto-review
description: 代码变更后调用配置的 review-bridge MCP 服务器，审查当前 diff，并使用审查结果指导后续修复。
---

# Review Bridge 自动审查

## 何时使用

在以下情况下使用此技能：

- 任务更改代码、修复错误、重构逻辑或实现功能。
- 当前 Codex 会话可以访问配置的 `review-bridge` MCP 服务器。
- 用户或项目所有者已授权将当前仓库 diff 和必要的上下文发送到配置的模型提供商。

当 diff 包含真实密钥、私有业务数据或用户标记为不可导出的内容时，不要自动调用外部审查。应先询问。

## 工作流程

1. 在一组连贯的代码变更后，从 `review-bridge` MCP 服务器调用 `review_changes` 工具。

默认参数：

```json
{
  "cwd": "当前项目的绝对路径",
  "source_tool": "other",
  "review_focus": ["correctness"]
}
```

如果变更涉及身份验证、密钥、网络请求、文件系统写入、命令执行、权限边界或外部 API，还应在 `review_focus` 中包含 `security`。

2. 读取审查输出，优先处理确认的严重和重要发现。

3. 不要盲目应用：

- 与当前源代码不匹配的发现。
- 基于过时代码的发现。
- 纯样式偏好。
- 需要产品或 API 契约决策的更改。

4. 修复审查发现后，运行适合该任务的本地验证。如果后续更改是实质性的，再次调用 `review_changes`。

默认最多进行两轮审查/修复：

```text
MCP 审查 -> 修复
```

如果两轮后问题仍然存在，停止并总结剩余发现和您的判断。

## 最终响应

在最终响应中包含：

- 是否调用了 `review_changes`。
- 关键审查发现。
- 基于审查修复了什么。
- 哪些发现被忽略或推迟，以及原因。
- 任何构建或测试结果（如果运行了验证）。

## 故障处理

- 如果当前 Codex 会话无法看到 `review-bridge`，请用户重启 Codex 或检查 MCP 配置。
- 如果 MCP 调用失败，报告错误并在可能的情况下继续进行本地验证。
- 如果模型输出被截断，检查 `_meta.finish_reason`、`_meta.effective_max_tokens` 和 `_meta.continuation_count`。