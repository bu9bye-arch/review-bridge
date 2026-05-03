export type Provider = "anthropic" | "openai" | "google" | "openai-compatible";
export type SourceTool = "claude-code" | "cline" | "copilot" | "other";
export type ReviewFocus = "security" | "performance" | "style" | "correctness";

export interface ModelConfig {
  provider: Provider;
  model: string;
  api_key_env: string;
  max_tokens: number;
  base_url?: string;
}

export interface Config {
  default_model: string;
  models: Record<string, ModelConfig>;
  review_prompt_template: string;
  auto_review_on_stop: boolean;
  diff_default_range: string;
}

export interface ReviewRequest {
  cwd: string;
  user_prompt?: string;
  source_tool: SourceTool;
  review_focus: ReviewFocus[];
  model_override?: string;
  diff_range?: string;
  max_tokens?: number;
}

export interface ReviewResult {
  review_content: string;
  severity_summary: string;
  model_used: string;
  tokens_used: number;
}

export interface GitDiffResult {
  diff: string;
  changed_files: Array<{ status: string; path: string }>;
  log: string;
}

export interface LLMResponse {
  content: string;
  tokens_used: number;
  finish_reason?: string;
  continuation_count?: number;
  cached_tokens?: number;
  cache_creation_tokens?: number;
}

export interface ReviewPrompt {
  cache_key: string;
  instructions: string;
  context: string;
  text: string;
}

export interface LLMProvider {
  name: string;
  generate(prompt: ReviewPrompt, maxTokens: number): Promise<LLMResponse>;
}
