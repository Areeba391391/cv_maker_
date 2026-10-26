export type AiProviderName = "ollama";

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGenerateOptions {
  messages: AiChatMessage[];
  temperature?: number;
  format?: "json" | "text";
  timeoutMs?: number;
  /** Cap tokens for faster local models (default 700). */
  numPredict?: number;
}

export interface AiProvider {
  name: AiProviderName;
  model: string;
  generate(options: AiGenerateOptions): Promise<string>;
  isAvailable(): Promise<boolean>;
}

export function getAiConfig() {
  return {
    provider: (process.env.AI_PROVIDER || "ollama") as AiProviderName,
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: process.env.OLLAMA_MODEL || "llama3.2:3b",
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 90000),
  };
}
