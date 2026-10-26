import mammoth from "mammoth";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import — pdf-parse has CJS quirks in Next.js
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as unknown as { default?: (b: Buffer) => Promise<{ text: string }> }).default
      || (pdfParseModule as unknown as (b: Buffer) => Promise<{ text: string }>);
    const result = await pdfParse(buffer);
    return (result.text || "").trim();
  } catch (error) {
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  } catch (error) {
    throw new Error(
      `DOCX extraction failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function extractTextFromDoc(buffer: Buffer): Promise<string> {
  try {
    const WordExtractor = (await import("word-extractor")).default;
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return (doc.getBody() || "").trim();
  } catch (error) {
    throw new Error(
      `DOC extraction failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function extractTextFromDocument(
  buffer: Buffer,
  kind: "pdf" | "doc" | "docx",
): Promise<string> {
  if (kind === "pdf") return extractTextFromPdf(buffer);
  if (kind === "docx") return extractTextFromDocx(buffer);
  return extractTextFromDoc(buffer);
}
