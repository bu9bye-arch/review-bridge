import OpenAI from "openai";
import type { ModelConfig, LLMProvider, LLMResponse } from "../types.js";

export class OpenAIProvider implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor(name: string, config: ModelConfig, apiKey: string) {
    this.name = name;
    this.client = new OpenAI({
      apiKey,
      ...(config.base_url ? { baseURL: config.base_url } : {}),
    });
    this.model = config.model;
  }

  async generate(prompt: string, maxTokens: number): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    return {
      content: response.choices[0]?.message?.content ?? "",
      tokens_used: response.usage?.total_tokens ?? 0,
    };
  }
}
