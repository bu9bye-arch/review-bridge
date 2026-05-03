import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, resolveModelConfig } from "../lib/config.js";
import { collectGitData } from "../lib/git.js";
import { formatReviewPrompt } from "../lib/review-prompt.js";
import { createProvider } from "../lib/llm/provider.js";
import type { ReviewFocus, SourceTool } from "../lib/types.js";

const MIN_REVIEW_OUTPUT_TOKENS = 8000;

const reviewChangesSchema = {
  cwd: z.string().describe("项目工作目录"),
  user_prompt: z.string().optional().describe("用户原始提示词"),
  source_tool: z
    .enum(["claude-code", "cline", "copilot", "other"])
    .optional()
    .describe("来源工具"),
  review_focus: z
    .array(z.enum(["security", "performance", "style", "correctness"]))
    .optional()
    .describe("审查重点"),
  model_override: z.string().optional().describe("临时覆盖审查模型"),
  diff_range: z.string().optional().describe("diff 范围，默认 HEAD~1..HEAD"),
  max_tokens: z.number().optional().describe("审查结果最大 token 数，默认 64000"),
};

const reviewLastChangeSchema = {
  cwd: z.string().optional().describe("项目工作目录，默认使用当前目录"),
  model_override: z.string().optional().describe("临时覆盖审查模型"),
};

const listModelsSchema = {};

export function registerTools(server: McpServer): void {
  server.tool(
    "review_changes",
    "收集 git diff 和上下文，调用另一个模型进行代码审查，返回审查结果",
    reviewChangesSchema,
    async (params) => {
      const config = loadConfig();
      const { modelName, modelConfig, apiKey } = resolveModelConfig(
        config,
        params.model_override
      );

      const gitData = await collectGitData(
        params.cwd,
        params.diff_range
      );

      const prompt = formatReviewPrompt(
        {
          cwd: params.cwd,
          user_prompt: params.user_prompt,
          source_tool: (params.source_tool || "other") as SourceTool,
          review_focus: (params.review_focus || []) as ReviewFocus[],
          model_override: params.model_override,
          diff_range: params.diff_range,
          max_tokens: params.max_tokens,
        },
        gitData
      );

      try {
        const provider = createProvider(modelName, modelConfig, apiKey);
        const requestedMaxTokens = params.max_tokens;
        const effectiveMaxTokens = Math.max(
          requestedMaxTokens || modelConfig.max_tokens,
          MIN_REVIEW_OUTPUT_TOKENS
        );
        const result = await provider.generate(
          prompt,
          effectiveMaxTokens
        );

        return {
          content: [
            {
              type: "text" as const,
              text: result.content,
            },
          ],
          _meta: {
            model_used: modelName,
            tokens_used: result.tokens_used,
            cached_tokens: result.cached_tokens,
            cache_creation_tokens: result.cache_creation_tokens,
            finish_reason: result.finish_reason,
            continuation_count: result.continuation_count,
            requested_max_tokens: requestedMaxTokens,
            effective_max_tokens: effectiveMaxTokens,
          },
        };
      } catch (err) {
        console.error("[review-bridge] review_changes 失败:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: "代码审查请求失败，请检查模型配置或网络连接。",
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "review_last_change",
    "便捷工具：自动使用当前目录和最近 git diff 进行代码审查",
    reviewLastChangeSchema,
    async (params) => {
      const cwd = params.cwd || process.cwd();
      const config = loadConfig();
      const { modelName, modelConfig, apiKey } = resolveModelConfig(
        config,
        params.model_override
      );

      const gitData = await collectGitData(cwd);

      const prompt = formatReviewPrompt(
        {
          cwd,
          source_tool: "other" as SourceTool,
          review_focus: [],
        },
        gitData
      );

      try {
        const provider = createProvider(modelName, modelConfig, apiKey);
        const effectiveMaxTokens = Math.max(
          modelConfig.max_tokens,
          MIN_REVIEW_OUTPUT_TOKENS
        );
        const result = await provider.generate(prompt, effectiveMaxTokens);

        return {
          content: [
            {
              type: "text" as const,
              text: result.content,
            },
          ],
          _meta: {
            model_used: modelName,
            tokens_used: result.tokens_used,
            cached_tokens: result.cached_tokens,
            cache_creation_tokens: result.cache_creation_tokens,
            finish_reason: result.finish_reason,
            continuation_count: result.continuation_count,
            effective_max_tokens: effectiveMaxTokens,
          },
        };
      } catch (err) {
        console.error("[review-bridge] review_last_change 失败:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: "代码审查请求失败，请检查模型配置或网络连接。",
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "list_review_models",
    "列出已配置的审查模型",
    listModelsSchema,
    async () => {
      const config = loadConfig();
      const models = Object.entries(config.models).map(([name, m]) => ({
        name,
        provider: m.provider,
        model: m.model,
        is_default: name === config.default_model,
        max_tokens: m.max_tokens,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(models, null, 2),
          },
        ],
      };
    }
  );
}
