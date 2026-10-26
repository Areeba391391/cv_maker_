import { CvData, CvDataSchema, CvWarning } from "./schema";

const SUSPICIOUS_EMAIL_TLDS = [".con", ".cmo", ".gamil.com", ".gmial.com", ".hotmal.com"];

export function looksLikeSuspiciousEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (!lower.includes("@")) return true;
  if (SUSPICIOUS_EMAIL_TLDS.some((t) => lower.endsWith(t) || lower.includes(t))) return true;
  try {
    // Zod-like basic check without throwing for empty
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);
  } catch {
    return true;
  }
}

export function pruneEmptySections(data: CvData): CvData {
  const pruned: CvData = {
    ...data,
    professionalSummary: data.professionalSummary?.trim() || undefined,
    additionalInformation: data.additionalInformation?.trim() || undefined,
    education: data.education.filter(
      (e) => e.institution || e.degree || e.field || e.details,
    ),
    experience: data.experience.filter(
      (e) => e.company || e.title || (e.responsibilities?.length ?? 0) > 0,
    ),
    volunteerExperience: data.volunteerExperience.filter(
      (e) => e.company || e.title || (e.responsibilities?.length ?? 0) > 0,
    ),
    skills: data.skills.map((s) => s.trim()).filter(Boolean),
    languages: data.languages.filter((l) => l.name?.trim()),
    certifications: data.certifications.filter((c) => c.title?.trim()),
    courses: data.courses.filter((c) => c.title?.trim()),
    projects: data.projects.filter((p) => p.title?.trim()),
    achievements: data.achievements.filter((a) => a.title?.trim()),
    awards: data.awards.filter((a) => a.title?.trim()),
    references: data.references.filter((r) => r.name?.trim()),
    interests: data.interests.map((i) => i.trim()).filter(Boolean),
    photoUrl: data.photoUrl || null,
  };

  return CvDataSchema.parse(pruned);
}

export function hasSectionContent(data: CvData, section: CvData["sectionOrder"][number]): boolean {
  switch (section) {
    case "summary":
      return Boolean(data.professionalSummary?.trim());
    case "experience":
      return data.experience.length > 0;
    case "education":
      return data.education.length > 0;
    case "skills":
      return data.skills.length > 0;
    case "languages":
      return data.languages.length > 0;
    case "certifications":
      return data.certifications.length > 0;
    case "courses":
      return data.courses.length > 0;
    case "projects":
      return data.projects.length > 0;
    case "achievements":
      return data.achievements.length > 0;
    case "awards":
      return data.awards.length > 0;
    case "volunteer":
      return data.volunteerExperience.length > 0;
    case "interests":
      return data.interests.length > 0;
    case "references":
      return data.references.length > 0;
    case "additional":
      return Boolean(data.additionalInformation?.trim());
    default:
      return false;
  }
}

export function visibleSections(data: CvData): CvData["sectionOrder"] {
  return data.sectionOrder.filter((s) => hasSectionContent(data, s));
}

export function validateCvFacts(data: CvData): CvWarning[] {
  const warnings: CvWarning[] = [...(data.warnings ?? [])];

  if (!data.personal.fullName?.trim()) {
    warnings.push({
      field: "personal.fullName",
      message: "Full name is missing. Please verify with the customer.",
      severity: "warning",
    });
  }

  if (data.personal.email && looksLikeSuspiciousEmail(data.personal.email)) {
    warnings.push({
      field: "personal.email",
      message: "Email may contain a typo. Please verify.",
      severity: "warning",
    });
  }

  if (!data.targetPosition?.trim()) {
    warnings.push({
      field: "targetPosition",
      message: "Target position is required.",
      severity: "error",
    });
  }

  // Deduplicate by field+message
  const seen = new Set<string>();
  return warnings.filter((w) => {
    const key = `${w.field}:${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectFieldConflicts(
  sources: Array<{ source: string; phone?: string; email?: string; name?: string }>,
): CvWarning[] {
  const warnings: CvWarning[] = [];
  const phones = sources.map((s) => s.phone?.trim()).filter(Boolean) as string[];
  const emails = sources.map((s) => s.email?.trim().toLowerCase()).filter(Boolean) as string[];
  const names = sources.map((s) => s.name?.trim().toLowerCase()).filter(Boolean) as string[];

  if (new Set(phones.map(normalizePhone)).size > 1) {
    warnings.push({
      field: "personal.phone",
      message: "Phone number differs between sources. Please verify.",
      severity: "warning",
    });
  }
  if (new Set(emails).size > 1) {
    warnings.push({
      field: "personal.email",
      message: "Email differs between sources. Please verify.",
      severity: "warning",
    });
  }
  if (new Set(names).size > 1) {
    warnings.push({
      field: "personal.fullName",
      message: "Name differs between sources. Please verify.",
      severity: "info",
    });
  }
  return warnings;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function safeParseCvData(input: unknown): { success: true; data: CvData } | { success: false; error: string } {
  const result = CvDataSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  const pruned = pruneEmptySections(result.data);
  return { success: true, data: { ...pruned, warnings: validateCvFacts(pruned) } };
}
