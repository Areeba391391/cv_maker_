import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiConfig } from "@/lib/ai/types";

/** Keep the local model warm so the first CV generate is not cold-start slow. */
async function warmModel() {
  const provider = getAiProvider();
  try {
    await provider.generate({
      messages: [{ role: "user", content: 'Reply with JSON: {"ok":true}' }],
      format: "json",
      temperature: 0,
      timeoutMs: 12000,
      numPredict: 16,
    });
  } catch {
    // Warm-up is best-effort
  }
}

export async function GET(request: Request) {
  const config = getAiConfig();
  const provider = getAiProvider();
  const available = await provider.isAvailable();

  const url = new URL(request.url);
  const shouldWarm = url.searchParams.get("warm") === "1" || url.searchParams.get("warm") === "true";
  if (available && shouldWarm) {
    // Fire-and-forget so status returns immediately
    void warmModel();
  }

  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    available,
  });
}
