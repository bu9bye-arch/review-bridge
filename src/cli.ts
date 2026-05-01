import { readFileSync } from "fs";
import { loadConfig, resolveModelConfig } from "./lib/config.js";
import { collectGitData } from "./lib/git.js";
import { formatReviewPrompt } from "./lib/review-prompt.js";
import { createProvider } from "./lib/llm/provider.js";
import type { SourceTool, ReviewFocus } from "./lib/types.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "package-review") {
    const stdinData = readFileSync(0, "utf-8");
    const input = JSON.parse(stdinData);

    const cwd = input.cwd || process.cwd();
    const config = loadConfig();
    const { modelName, modelConfig, apiKey } = resolveModelConfig(config);

    const gitData = await collectGitData(cwd, config.diff_default_range);

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
      })
    );
  } else {
    console.error("用法: review-bridge package-review < stdin_json");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI 执行失败:", err);
  process.exit(1);
});
