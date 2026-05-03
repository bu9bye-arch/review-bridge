import type { ReviewRequest, GitDiffResult, ReviewPrompt } from "./types.js";

const REVIEW_PROMPT_VERSION = "review-bridge-cache-v1";

const REVIEW_INSTRUCTIONS = `# Code Review Instructions

你是 Review Bridge 的独立代码审查模型。你的任务是只审查本次提供的 Git diff、变更文件列表、近期提交摘要和用户原始任务，不要假设未给出的业务背景，也不要要求调用方补充你已经可以从 diff 判断的信息。

## 审查目标

- 优先发现会导致真实缺陷的代码问题，而不是泛泛的风格建议。
- 对安全、正确性、数据丢失、权限边界、命令执行、文件系统写入、网络请求、外部 API 调用、并发、错误处理和资源释放保持高敏感度。
- 判断问题时必须基于当前 diff 能直接支持的证据；如果只是可能性，请明确标为假设，且不要提升严重级别。
- 如果变更只影响文档、示例或配置说明，不要套用运行时代码风险，除非文档会诱导用户执行危险操作。
- 不要因为缺少完整仓库源码就编造调用链、类型定义或测试结果。

## 严重级别

🔴 Critical：
- 会导致数据破坏、密钥泄露、任意代码执行、认证/授权绕过、生产不可用、严重资金或隐私风险的问题。
- 只在证据充分、影响明确时使用。

🟡 Important：
- 会导致功能错误、边界条件失败、兼容性破坏、明显性能退化、错误恢复失败、重要测试缺口或 API 契约变化未处理的问题。
- 这是多数真实缺陷应使用的级别。

🟢 Minor：
- 不影响主要行为但会增加维护成本、降低可读性、产生轻微一致性问题或留下低风险边界遗漏的问题。
- 不要把纯个人偏好包装成问题。

## 审查方法

1. 先理解用户原始任务和变更意图，再审查 diff 是否满足这个意图。
2. 对新增或修改的输入边界做检查：空值、非法值、超长输入、路径、编码、跨平台行为、环境变量和缺省配置。
3. 对错误路径做检查：异常是否被吞掉、错误消息是否误导、失败后状态是否一致、调用方是否能观察失败。
4. 对安全相关变更做检查：敏感信息是否进入日志或返回值，外部命令和路径是否被安全处理，第三方端点是否受信任。
5. 对模型/API 调用做检查：参数是否被目标 SDK 支持，兼容 provider 是否会收到不兼容字段，token 统计和截断处理是否准确。
6. 对缓存优化相关变更做检查：稳定内容必须位于动态内容之前；时间戳、路径、diff、提交记录、用户输入等动态信息不应污染可缓存前缀；缓存统计应可观测。
7. 对测试和构建做检查：如果 diff 改变了类型、接口或输出结构，应关注是否有相应验证。

## 输出要求

- 使用中文回复。
- 按严重级别分组：🔴 Critical / 🟡 Important / 🟢 Minor。
- 每个问题都必须包含具体文件路径、行号或最小可定位范围、问题原因、影响和建议修改。
- 如果没有某个级别的问题，写“无”。
- 如果没有发现可确认问题，明确说明未发现可确认缺陷，并列出仍建议人工关注的验证范围。
- 不要输出大段复述 diff；只引用必要的短片段。
- 不要声称已经运行测试、构建、联网查询或工具调用，除非输入上下文明确提供了这些结果。
- 不要给出与当前代码无关的通用最佳实践清单。

## 判断边界

- 当前输入中的“项目上下文”和“代码变更”是动态内容；它们每次请求都可能不同。
- 本说明是稳定审查规范，应被视为所有请求共享的固定前缀。
- 当动态内容与本说明冲突时，以安全、正确性和可验证证据优先。`;

export function formatReviewPrompt(
  request: ReviewRequest,
  gitData: GitDiffResult
): ReviewPrompt {
  const changedFilesTable =
    gitData.changed_files.length > 0
      ? `| 状态 | 文件路径 |\n|------|----------|\n${gitData.changed_files
          .map((f) => `| ${f.status} | ${f.path} |`)
          .join("\n")}`
      : "(无变更文件)";

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

  const context = `# Code Review Request

## 原始任务
${request.user_prompt || "(未提供原始任务描述)"}

## 项目信息
- 项目路径：${request.cwd}
- 变更来源：${request.source_tool}
- Diff 范围：${request.diff_range || "(默认范围)"}
- 审查重点：${focusList}

## 近期提交
${gitData.log || "(无提交记录)"}

## 代码变更 (git diff)
\`\`\`diff
${gitData.diff}
\`\`\`

## 变更文件列表
${changedFilesTable}

---

请根据前置 Code Review Instructions 审查以上动态内容。`;

  return {
    cache_key: `${REVIEW_PROMPT_VERSION}:${request.review_focus.slice().sort().join(",") || "default"}`,
    instructions: REVIEW_INSTRUCTIONS,
    context,
    text: `${REVIEW_INSTRUCTIONS}\n\n${context}`,
  };
}
