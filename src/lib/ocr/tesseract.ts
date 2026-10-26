import Tesseract from "tesseract.js";

let workerPromise: Promise<Tesseract.Worker> | null = null;
let chain: Promise<unknown> = Promise.resolve();

async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    const language = process.env.OCR_LANGUAGE || "eng";
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker(language, 1, {
        logger: () => undefined,
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function extractTextFromImage(
  input: Buffer | string,
  _language = process.env.OCR_LANGUAGE || "eng",
): Promise<{ text: string; confidence: number }> {
  return enqueue(async () => {
    try {
      const worker = await getWorker();
      const result = await worker.recognize(input);
      const text = (result.data.text || "").trim();
      const confidence = result.data.confidence ?? 0;
      if (!text) {
        throw new Error("No readable text found in the image");
      }
      return { text, confidence };
    } catch (error) {
      throw new Error(
        `Image OCR failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  });
}
