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
    default:
      throw new Error(`不支持的 provider: ${modelConfig.provider}`);
  }
}
