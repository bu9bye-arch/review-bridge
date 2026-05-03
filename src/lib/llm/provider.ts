import type { ModelConfig, LLMProvider, LLMResponse } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

export function createProvider(
  name: string,
  modelConfig: ModelConfig,
  apiKey: string
): LLMProvider {
  switch (modelConfig.provider) {
    case "anthropic":
      return new AnthropicProvider(name, modelConfig, apiKey);
    case "openai":
    case "openai-compatible":
      return new OpenAIProvider(name, modelConfig, apiKey);
    case "google":
      throw new Error(
        "Google Gemini provider 尚未实现，请使用 anthropic、openai 或 openai-compatible provider"
      );
    default:
      throw new Error(`不支持的 provider: ${modelConfig.provider}`);
  }
}
