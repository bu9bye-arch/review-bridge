import Anthropic from "@anthropic-ai/sdk";
import type { ModelConfig, LLMProvider, LLMResponse, ReviewPrompt } from "../types.js";

export class AnthropicProvider implements LLMProvider {
  readonly name: string;
  private client: Anthropic;
  private model: string;

  constructor(name: string, config: ModelConfig, apiKey: string) {
    this.name = name;
    this.client = new Anthropic({ apiKey });
    this.model = config.model;
  }

  async generate(prompt: ReviewPrompt, maxTokens: number): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: prompt.instructions,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: prompt.context }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return {
      content: textBlock?.type === "text" ? textBlock.text : "",
      tokens_used: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
      cached_tokens: response.usage?.cache_read_input_tokens ?? 0,
      cache_creation_tokens: response.usage?.cache_creation_input_tokens ?? 0,
    };
  }
}
