import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Config } from "./types.js";

const CONFIG_DIR = join(homedir(), ".review-bridge");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
  default_model: "claude-sonnet",
  models: {
    "claude-sonnet": {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      api_key_env: "ANTHROPIC_API_KEY",
      max_tokens: 64000,
    },
  },
  review_prompt_template: "default",
  auto_review_on_stop: false,
  diff_default_range: "HEAD~1..HEAD",
};

export function getConfigDir(): string {
  return process.env.REVIEW_BRIDGE_CONFIG || CONFIG_DIR;
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    const dir = getConfigDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    return DEFAULT_CONFIG;
  }
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as Config;
}

export function resolveModelConfig(config: Config, modelOverride?: string) {
  const modelName = modelOverride || config.default_model;
  const modelConfig = config.models[modelName];
  if (!modelConfig) {
    throw new Error(
      `模型 "${modelName}" 未在配置中定义。可用模型: ${Object.keys(config.models).join(", ")}`
    );
  }
  const apiKey = process.env[modelConfig.api_key_env];
  if (!apiKey) {
    throw new Error(
      `环境变量 ${modelConfig.api_key_env} 未设置，无法调用 ${modelName}`
    );
  }
  return { modelName, modelConfig, apiKey };
}
