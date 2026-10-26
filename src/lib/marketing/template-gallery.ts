import type { TemplateId } from "@/lib/cv/schema";
import { TEMPLATES } from "@/lib/cv/templates";

/** Marketing preview images for every studio template. */
export const TEMPLATE_GALLERY: Array<{
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  accent2: string;
  src: string;
  badge?: string;
}> = TEMPLATES.map((t) => ({
  ...t,
  src: `/marketing/cv-sample-${t.id}.jpg`,
  badge: t.id === "ats" ? "ATS-safe" : undefined,
}));
