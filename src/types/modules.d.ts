declare module "word-extractor" {
  export default class WordExtractor {
    extract(input: Buffer | string): Promise<{
      getBody(): string;
      getText(): string;
    }>;
  }
}

declare module "pdf-parse" {
  interface PdfData {
    text: string;
    numpages?: number;
  }
  function pdfParse(data: Buffer): Promise<PdfData>;
  export default pdfParse;
}
