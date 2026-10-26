import type { CvData, PageSizeId } from "@/lib/cv/schema";

export type DensityMode = "compact" | "comfortable" | "spacious";

export type PageMargins = { top: number; right: number; bottom: number; left: number };

/** Physical paper sizes used for preview, print, and PDF. */
export const PAGE_SIZES: Record<
  PageSizeId,
  { id: PageSizeId; label: string; widthMm: number; heightMm: number; cssSize: string; jsPdfFormat: "a4" | "letter" | "legal" }
> = {
  a4: {
    id: "a4",
    label: "A4",
    widthMm: 210,
    heightMm: 297,
    cssSize: "A4",
    jsPdfFormat: "a4",
  },
  letter: {
    id: "letter",
    label: "Letter",
    widthMm: 215.9,
    heightMm: 279.4,
    cssSize: "letter",
    jsPdfFormat: "letter",
  },
  legal: {
    id: "legal",
    label: "Legal",
    widthMm: 215.9,
    heightMm: 355.6,
    cssSize: "legal",
    jsPdfFormat: "legal",
  },
};

export function resolvePageSize(cv: CvData) {
  const id = (cv.metadata.pageSize || "a4") as PageSizeId;
  return PAGE_SIZES[id] || PAGE_SIZES.a4;
}

const DENSITY_MARGINS: Record<DensityMode, PageMargins> = {
  spacious: { top: 14, right: 15, bottom: 16, left: 15 },
  comfortable: { top: 12, right: 14, bottom: 14, left: 14 },
  compact: { top: 9, right: 11, bottom: 10, left: 11 },
};

const DENSITY_SPACING: Record<
  DensityMode,
  { paragraphSpacing: number; sectionGap: number; lineHeight: number }
> = {
  spacious: { paragraphSpacing: 8, sectionGap: 14, lineHeight: 1.72 },
  comfortable: { paragraphSpacing: 6, sectionGap: 12, lineHeight: 1.58 },
  compact: { paragraphSpacing: 4, sectionGap: 6, lineHeight: 1.32 },
};

/** Effective page margins in mm — custom when locked, else density preset. */
export function resolveMargins(cv: CvData): PageMargins {
  if (cv.metadata.marginsLocked && cv.metadata.margins) {
    return { ...cv.metadata.margins };
  }
  const density = resolveDensity(cv);
  return { ...DENSITY_MARGINS[density] };
}

/** Effective paragraph/section/line spacing — custom when locked, else density preset. */
export function resolveSpacing(cv: CvData): {
  paragraphSpacing: number;
  sectionGap: number;
  lineHeight: number;
} {
  if (cv.metadata.marginsLocked) {
    return {
      paragraphSpacing: cv.metadata.paragraphSpacing ?? 6,
      sectionGap: cv.metadata.sectionGap ?? 11,
      lineHeight: cv.metadata.lineHeight ?? 1.5,
    };
  }
  return { ...DENSITY_SPACING[resolveDensity(cv)] };
}

/** Rough content weight used to auto-fit short vs long CVs on A4. */
export function estimateContentWeight(cv: CvData): number {
  let w = 2; // header + contact baseline
  if (cv.professionalSummary?.trim()) {
    w += Math.min(4, cv.professionalSummary.trim().length / 100);
  }
  w += cv.experience.reduce((sum, e) => {
    return sum + 1.8 + (e.responsibilities?.length ?? 0) * 0.45;
  }, 0);
  w += cv.education.length * 1.3;
  w += Math.min(3, cv.skills.length * 0.2);
  w += cv.languages.length * 0.35;
  w += cv.achievements.length * 0.45;
  w += cv.certifications.length * 0.4;
  w += cv.courses.length * 0.35;
  w += cv.projects.length * 0.55;
  w += cv.awards.length * 0.35;
  w += cv.references.length * 0.45;
  w += cv.volunteerExperience.reduce(
    (sum, e) => sum + 1.2 + (e.responsibilities?.length ?? 0) * 0.3,
    0,
  );
  if (cv.additionalInformation?.trim()) w += 1.2;
  if (cv.photoUrl) w += 0.4;
  return w;
}

function pageBudget(cv: CvData): 1 | 2 | "auto" {
  return cv.metadata.maxPages ?? "auto";
}

/**
 * Auto density prefers ONE A4 page unless user allows 2 pages:
 * - little content → spacious (fill the page)
 * - lots of content → compact (stay on one page)
 * - maxPages=2 → never crush to compact
 */
export function resolveDensity(cv: CvData): DensityMode {
  const mode = cv.metadata.density || "auto";
  if (mode !== "auto") return mode;

  const weight = estimateContentWeight(cv);
  const pages = pageBudget(cv);

  if (pages === 2) {
    if (weight < 8) return "spacious";
    return "comfortable";
  }

  if (weight < 5.5) return "spacious";
  if (weight < 11) return "comfortable";
  return "compact";
}

export function resolveFontScale(cv: CvData): number {
  const scale = cv.metadata.fontScale ?? 1;
  return Math.min(1.45, Math.max(0.8, Number(scale) || 1));
}

export function resolveMaxPages(cv: CvData, fontScale = resolveFontScale(cv)): number {
  const setting = pageBudget(cv);
  if (setting === 1) return 1;
  if (setting === 2) return 2;

  const density = resolveDensity(cv);
  const weight = estimateContentWeight(cv);
  const threshold = density === "compact" ? 26 : density === "comfortable" ? 22 : 18;
  return weight * fontScale > threshold ? 2 : 1;
}

/**
 * Effective layout for print/preview.
 * Auto density may bump/shrink font — but never when fontLocked (user used A+/A−).
 */
export function resolveLayout(cv: CvData): {
  density: DensityMode;
  fontScale: number;
  maxPages: number;
} {
  const density = resolveDensity(cv);
  let fontScale = resolveFontScale(cv);
  const weight = estimateContentWeight(cv);
  const densityMode = cv.metadata.density || "auto";
  const fontLocked = Boolean(cv.metadata.fontLocked);
  const pages = pageBudget(cv);

  if (densityMode === "auto" && !fontLocked) {
    if (pages === 2) {
      // On 2-page mode, slight fill bump only — don't crush
      if (weight < 6) fontScale = Math.min(1.28, Math.max(fontScale, 1.08));
    } else {
      if (weight < 5) fontScale = Math.min(1.38, Math.max(fontScale, 1.18));
      else if (weight < 7) fontScale = Math.min(1.28, Math.max(fontScale, 1.1));
      else if (weight < 9) fontScale = Math.min(1.2, Math.max(fontScale, 1.04));
      else if (weight > 20) fontScale = Math.min(fontScale, 0.88);
      else if (weight > 15) fontScale = Math.min(fontScale, 0.94);
    }
  }

  return { density, fontScale, maxPages: resolveMaxPages(cv, fontScale) };
}

/** True when content may still need a 2nd page even after compact fit. */
export function likelyMultiPage(cv: CvData): boolean {
  return resolveLayout(cv).maxPages > 1;
}
