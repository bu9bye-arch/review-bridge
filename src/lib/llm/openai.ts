import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { ModelConfig, LLMProvider, LLMResponse, ReviewPrompt } from "../types.js";

function getMaxContinuations(): number {
  const parsed = Number(process.env.REVIEW_BRIDGE_MAX_CONTINUATIONS ?? 1);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 1;
}

export class OpenAIProvider implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;
  private provider: ModelConfig["provider"];

  constructor(name: string, config: ModelConfig, apiKey: string) {
    this.name = name;
    this.client = new OpenAI({
      apiKey,
      ...(config.base_url ? { baseURL: config.base_url } : {}),
    });
    this.model = config.model;
    this.provider = config.provider;
  }

  async generate(prompt: ReviewPrompt, maxTokens: number): Promise<LLMResponse> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: prompt.instructions },
      { role: "user", content: prompt.context },
    ];
    const parts: string[] = [];
    let tokensUsed = 0;
    let cachedTokens = 0;
    let finishReason: string | null | undefined;
    let continuationCount = 0;

    const maxContinuations = getMaxContinuations();

    for (let attempt = 0; attempt <= maxContinuations; attempt += 1) {
      const request: ChatCompletionCreateParamsNonStreaming & {
        prompt_cache_key?: string;
        prompt_cache_retention?: "in_memory" | "24h";
      } = {
        model: this.model,
        max_tokens: maxTokens,
        messages,
      };

      if (this.provider === "openai") {
        request.prompt_cache_key = prompt.cache_key;
        request.prompt_cache_retention = "in_memory";
      }

      const response = await this.client.chat.completions.create(request);

      const choice = response.choices[0];
      const content = choice?.message?.content ?? "";
      finishReason = choice?.finish_reason;
      tokensUsed += response.usage?.total_tokens ?? 0;
      cachedTokens += response.usage?.prompt_tokens_details?.cached_tokens ?? 0;

      if (content) {
        parts.push(content);
        messages.push({ role: "assistant", content });
      }

      if (finishReason !== "length") {
        break;
      }

      if (attempt === maxContinuations) {
        break;
      }

      continuationCount += 1;
      messages.push({
        role: "user",
        content:
          "Continue the previous answer exactly where it stopped. Do not repeat completed text.",
      });
    }

    return {
      content: parts.join(""),
      tokens_used: tokensUsed,
      finish_reason: finishReason ?? undefined,
      continuation_count: continuationCount,
      cached_tokens: cachedTokens,
    };
  }
}
