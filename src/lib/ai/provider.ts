import { AiGenerateOptions, AiProvider, getAiConfig } from "./types";

let availabilityCache: { ok: boolean; at: number } | null = null;
const AVAILABILITY_TTL_MS = 60_000;

export class OllamaProvider implements AiProvider {
  name = "ollama" as const;
  model: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    const cfg = getAiConfig();
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.model = cfg.model;
    this.timeoutMs = cfg.timeoutMs;
  }

  async isAvailable(): Promise<boolean> {
    if (availabilityCache && Date.now() - availabilityCache.at < AVAILABILITY_TTL_MS) {
      return availabilityCache.ok;
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2500),
      });
      availabilityCache = { ok: res.ok, at: Date.now() };
      return res.ok;
    } catch {
      availabilityCache = { ok: false, at: Date.now() };
      return false;
    }
  }

  async generate(options: AiGenerateOptions): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? this.timeoutMs,
    );

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: options.messages,
          stream: false,
          keep_alive: "60m",
          format: options.format === "json" ? "json" : undefined,
          options: {
            temperature: options.temperature ?? 0.2,
            // Smaller cap = much faster local CPU responses
            num_predict: options.numPredict ?? 480,
            num_ctx: 1536,
          },
        }),
      });

      if (res.ok) {
        availabilityCache = { ok: true, at: Date.now() };
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`);
      }

      const data = (await res.json()) as {
        message?: { content?: string };
        response?: string;
      };

      const content = data.message?.content ?? data.response ?? "";
      if (!content.trim()) {
        throw new Error("Ollama returned an empty response");
      }
      return content;
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const msg = error instanceof Error ? error.message : String(error);
      if (name === "AbortError" || name === "TimeoutError" || /aborted|timeout/i.test(msg)) {
        throw new Error("AI request timed out. Check Ollama and try again.");
      }
      if (error instanceof TypeError) {
        throw new Error(
          "Ollama is unavailable. Start Ollama locally or set OLLAMA_BASE_URL.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

let providerSingleton: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!providerSingleton) {
    const cfg = getAiConfig();
    if (cfg.provider === "ollama") {
      providerSingleton = new OllamaProvider();
    } else {
      providerSingleton = new OllamaProvider();
    }
  }
  return providerSingleton;
}
