import { CvData, CvDataSchema, TemplateId, emptyCvData } from "@/lib/cv/schema";
import { enrichShopCv, type SeedPersonal } from "@/lib/cv/enrich";
import { pruneEmptySections, validateCvFacts } from "@/lib/cv/validation";

/**
 * Build a print-ready CV in the browser — no Ollama, no Whisper, no OCR.
 * Used for typed shop forms so Generate feels instant.
 */
export function buildInstantCv(options: {
  targetPosition: string;
  seed?: SeedPersonal | null;
  notes?: string;
  photoUrl?: string | null;
  templateId?: TemplateId;
}): CvData {
  const target = options.targetPosition.trim();
  if (!target) throw new Error("Target position is required");

  let cv = enrichShopCv(emptyCvData(target), options.seed);

  const notes = options.notes?.trim();
  if (notes) {
    cv = {
      ...cv,
      additionalInformation: [cv.additionalInformation, notes].filter(Boolean).join("\n\n"),
    };
  }

  if (options.photoUrl) {
    cv = { ...cv, photoUrl: options.photoUrl };
  }

  if (options.templateId) {
    cv = {
      ...cv,
      metadata: { ...cv.metadata, templateId: options.templateId },
    };
  }

  cv = pruneEmptySections(CvDataSchema.parse(cv));
  cv = { ...cv, warnings: [...cv.warnings, ...validateCvFacts(cv)] };
  return cv;
}

export function canUseInstantPath(options: {
  hasVoice?: boolean;
  hasImages?: boolean;
  hasCvFiles?: boolean;
}): boolean {
  return !options.hasVoice && !options.hasImages && !options.hasCvFiles;
}
