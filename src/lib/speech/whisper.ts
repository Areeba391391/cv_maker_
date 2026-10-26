/**
 * Local Whisper transcription via @xenova/transformers.
 * Loads on first use; subsequent calls reuse the pipeline.
 * Kept tiny + serialized so generate requests don't OOM Node.
 */

type Transcriber = (audio: Float32Array | string, options?: Record<string, unknown>) => Promise<{
  text: string;
}>;

let transcriberPromise: Promise<Transcriber> | null = null;
let chain: Promise<unknown> = Promise.resolve();

const MAX_VOICE_BYTES = Number(process.env.MAX_VOICE_BYTES || 3_000_000); // ~3MB

async function getTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      // Tiny model = far less RAM; override with WHISPER_MODEL if needed
      const model = process.env.WHISPER_MODEL || "Xenova/whisper-tiny";
      const pipe = await pipeline("automatic-speech-recognition", model);
      return pipe as unknown as Transcriber;
    })().catch((err) => {
      transcriberPromise = null;
      throw err;
    });
  }
  return transcriberPromise;
}

/** Run voice jobs one-at-a-time to avoid parallel model loads. */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function transcribeAudio(buffer: Buffer, mimeType?: string): Promise<string> {
  if (buffer.length > MAX_VOICE_BYTES) {
    throw new Error(
      `Voice file is too large (max ${Math.round(MAX_VOICE_BYTES / 1_000_000)}MB). Use a shorter clip or type notes instead.`,
    );
  }

  return enqueue(async () => {
    try {
      const transcriber = await getTranscriber();
      const base64 = buffer.toString("base64");
      const mime = mimeType || "audio/wav";
      const dataUri = `data:${mime};base64,${base64}`;

      const result = await transcriber(dataUri, {
        chunk_length_s: 20,
        stride_length_s: 4,
        language: null,
        task: "transcribe",
      });

      const text = (result?.text || "").trim();
      if (!text) {
        throw new Error("No speech detected in the audio");
      }
      return text;
    } catch (error) {
      throw new Error(
        `Voice transcription failed: ${error instanceof Error ? error.message : "unknown error"}. Type notes instead, or retry with a shorter clip.`,
      );
    }
  });
}
