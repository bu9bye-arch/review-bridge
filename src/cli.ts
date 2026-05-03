import { readFileSync } from "fs";
import { z } from "zod";
import { loadConfig, resolveModelConfig } from "./lib/config.js";
import { collectGitData } from "./lib/git.js";
import { formatReviewPrompt } from "./lib/review-prompt.js";
import { createProvider } from "./lib/llm/provider.js";
import type { SourceTool, ReviewFocus } from "./lib/types.js";

const cliInputSchema = z.object({
  cwd: z.string().optional(),
  user_prompt: z.string().optional(),
  source_tool: z.enum(["claude-code", "cline", "copilot", "other"]).optional(),
  review_focus: z.array(z.enum(["security", "performance", "style", "correctness"])).optional(),
  diff_range: z.string().optional().describe("diff 范围，如 HEAD~1..HEAD 或留空获取工作区变更"),
  model_override: z.string().optional().describe("临时覆盖审查模型"),
});

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "package-review") {
    const stdinData = readFileSync(0, "utf-8");
    const rawInput = JSON.parse(stdinData);
    const input = cliInputSchema.parse(rawInput);

    const cwd = input.cwd || process.cwd();
    const config = loadConfig();
    const { modelName, modelConfig, apiKey } = resolveModelConfig(config, input.model_override);

    const gitData = await collectGitData(cwd, input.diff_range);

    const prompt = formatReviewPrompt(
      {
        cwd,
        user_prompt: input.user_prompt,
        source_tool: (input.source_tool || "other") as SourceTool,
        review_focus: (input.review_focus || []) as ReviewFocus[],
      },
      gitData
    );

    const provider = createProvider(modelName, modelConfig, apiKey);
    const result = await provider.generate(prompt, modelConfig.max_tokens);

    process.stdout.write(
      JSON.stringify({
        review_content: result.content,
        model_used: modelName,
        tokens_used: result.tokens_used,
        cached_tokens: result.cached_tokens,
        cache_creation_tokens: result.cache_creation_tokens,
      })
    );
  } else {
    console.error("用法: review-bridge package-review < stdin_json");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI 执行失败:", err instanceof Error ? err.message : "未知错误");
  process.exit(1);
});
