import type { ReviewRequest, GitDiffResult } from "./types.js";

export function formatReviewPrompt(
  request: ReviewRequest,
  gitData: GitDiffResult
): string {
  const changedFilesTable = gitData.changed_files
    .map((f) => `| ${f.status} | ${f.path} |`)
    .join("\n");

  const focusMap: Record<string, string> = {
    security: "安全漏洞",
    performance: "性能问题",
    style: "代码风格和可维护性",
    correctness: "正确性和逻辑错误",
  };

  const focusList =
    request.review_focus.length > 0
      ? request.review_focus.map((f) => focusMap[f] || f).join("、")
      : "正确性和逻辑错误、安全漏洞、性能问题、代码风格和可维护性、遗漏的边界情况";

  return `# Code Review Request

## 原始任务
${request.user_prompt || "(未提供原始任务描述)"}

## 项目信息
- 项目路径：${request.cwd}
- 变更来源：${request.source_tool}
- 审查时间：${new Date().toISOString()}

## 近期提交
${gitData.log || "(无提交记录)"}

## 代码变更 (git diff)
\`\`\`diff
${gitData.diff}
\`\`\`

## 变更文件列表
| 状态 | 文件路径 |
|------|----------|
${changedFilesTable || "| - | (无变更文件) |"}

---

请对以上代码变更进行审查，重点关注：${focusList}

请用中文回复，按严重级别分类：🔴 Critical / 🟡 Important / 🟢 Minor
对每个问题提供具体文件、行号和修改建议。`;
}
