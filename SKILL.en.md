---
name: review-bridge-auto-review
description: Call the configured review-bridge MCP server after code changes, review the current diff, and use the review result to guide follow-up fixes.
---

English | [中文](./SKILL.md)

# Review Bridge Auto Review

## When To Use

Use this skill when:

- A task changes code, fixes bugs, refactors logic, or implements a feature.
- The current Codex session can access a configured `review-bridge` MCP server.
- The user or project owner has authorized sending the current repository diff and necessary context to the configured model provider.

Do not call external review automatically when the diff contains real secrets, private business data, or content the user has marked as non-exportable. Ask first.

## Workflow

1. After a coherent set of code changes, call the `review_changes` tool from the `review-bridge` MCP server.

Default arguments:

```json
{
  "cwd": "absolute path to the current project",
  "source_tool": "other",
  "review_focus": ["correctness"]
}
```

If the change touches authentication, secrets, network requests, file-system writes, command execution, permission boundaries, or external APIs, also include `security` in `review_focus`.

2. Read the review output and prioritize confirmed Critical and Important findings.

3. Do not blindly apply:

- Findings that do not match the current source.
- Findings based on stale code.
- Pure style preferences.
- Changes that require product or API-contract decisions.

4. After fixing review findings, run whatever local validation is appropriate for the task. If the follow-up change is substantial, call `review_changes` again.

Default to at most two review/fix rounds:

```text
MCP review -> fix
```

If issues remain after two rounds, stop and summarize the remaining findings and your judgment.

## Final Response

In the final response, include:

- Whether `review_changes` was called.
- The key review findings.
- What was fixed based on the review.
- Which findings were ignored or deferred, and why.
- Any build or test results, if validation was run.

## Failure Handling

- If the current Codex session cannot see `review-bridge`, ask the user to restart Codex or check the MCP configuration.
- If the MCP call fails, report the error and continue with local validation where possible.
- If the model output is truncated, inspect `_meta.finish_reason`, `_meta.effective_max_tokens`, and `_meta.continuation_count`.
