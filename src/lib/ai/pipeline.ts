import { z } from "zod";
import { getAiProvider } from "./provider";
import { getAiConfig } from "./types";
import { CvData, CvDataSchema, emptyCvData } from "@/lib/cv/schema";
import {
  detectFieldConflicts,
  pruneEmptySections,
  safeParseCvData,
  validateCvFacts,
} from "@/lib/cv/validation";
import { createId } from "@/lib/utils";
import { enrichShopCv, type SeedPersonal } from "@/lib/cv/enrich";

export type PipelineStage =
  | "reading"
  | "voice"
  | "image"
  | "documents"
  | "extracting"
  | "combining"
  | "checking"
  | "rewriting"
  | "building"
  | "preparing";

export interface SourceInput {
  type: "text" | "voice" | "image" | "pdf" | "doc" | "docx" | "cv_image";
  text: string;
  label?: string;
}

export interface PipelineResult {
  cv: CvData;
  stages: PipelineStage[];
  rawModelOutput?: string;
  /** instant = no Ollama (typed/seed path). */
  mode?: "instant" | "ai" | "offline" | "fallback";
  elapsedMs?: number;
}

const ExtractionSchema = z.object({
  personal: z
    .object({
      fullName: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      age: z.string().optional().nullable(),
      dateOfBirth: z.string().optional().nullable(),
      nationality: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  professionalSummary: z.string().optional().nullable(),
  education: z
    .array(
      z.object({
        institution: z.string().optional().nullable(),
        degree: z.string().optional().nullable(),
        field: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        grade: z.string().optional().nullable(),
        details: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  experience: z
    .array(
      z.object({
        company: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        responsibilities: z.array(z.string()).optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  skills: z.array(z.string()).optional().nullable(),
  languages: z
    .array(
      z.object({
        name: z.string(),
        proficiency: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  certifications: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  courses: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  projects: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  achievements: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  awards: z
    .array(
      z.object({
        title: z.string(),
        details: z.string().optional().nullable(),
        date: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  references: z
    .array(
      z.object({
        name: z.string(),
        relationship: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        organization: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  interests: z.array(z.string()).optional().nullable(),
  additionalInformation: z.string().optional().nullable(),
  warnings: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
        severity: z.enum(["info", "warning", "error"]).optional(),
      }),
    )
    .optional()
    .nullable(),
});

const SYSTEM_PROMPT = `Extract CV facts for a professional CV desk (any industry). Return STRICT JSON only.
Rules: use only client-supported facts; never invent schools/employers/dates/contacts/references; translate Urdu/Roman Urdu/mixed language to professional English; omit empty sections; short skill names only; 2-sentence career objective for the target role; if languages missing you MAY add local + English conversational; English output only.`;

function stripNullable<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function asString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t || undefined;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function asStringArray(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (typeof v === "string") {
    return v
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(v)) {
    return v
      .flatMap((item) => {
        if (typeof item === "string" || typeof item === "number") return [String(item).trim()];
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const name = asString(o.name ?? o.title ?? o.skill ?? o.value);
          return name ? [name] : [];
        }
        return [];
      })
      .filter(Boolean);
  }
  return [];
}

function asObjectArray(v: unknown): Array<Record<string, unknown>> {
  if (!v) return [];
  if (typeof v === "string") {
    const title = v.trim();
    return title ? [{ title, name: title }] : [];
  }
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const title = String(item).trim();
        return title ? { title, name: title } : null;
      }
      if (item && typeof item === "object") return item as Record<string, unknown>;
      return null;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

/**
 * Small local models often return numbers, flat strings, or odd shapes.
 * Normalize before Zod so generation does not hard-fail.
 */
export function normalizeAiExtraction(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    raw = {};
  }
  const src = raw as Record<string, unknown>;
  const personalIn =
    src.personal && typeof src.personal === "object" && !Array.isArray(src.personal)
      ? (src.personal as Record<string, unknown>)
      : {};

  const languages = asObjectArray(src.languages).map((l) => {
    const name =
      asString(l.name) ||
      asString(l.title) ||
      asString(l.language) ||
      (typeof l === "string" ? l : undefined);
    if (!name) return null;
    // Support "Urdu: Native" packed into name
    if (name.includes(":") && !asString(l.proficiency)) {
      const [n, ...rest] = name.split(":");
      return { name: n.trim(), proficiency: rest.join(":").trim() || undefined };
    }
    return {
      name,
      proficiency: asString(l.proficiency ?? l.level),
    };
  }).filter(Boolean);

  const titled = (key: string) =>
    asObjectArray(src[key])
      .map((item) => {
        const title = asString(item.title) || asString(item.name);
        if (!title) return null;
        return {
          title,
          details: asString(item.details ?? item.description),
          date: asString(item.date ?? item.year),
        };
      })
      .filter(Boolean);

  const city = asString(personalIn.city ?? src.city);
  let address = asString(personalIn.address ?? src.address);
  // Don't keep the same place string twice (city + address)
  if (city && address && city.toLowerCase() === address.toLowerCase()) {
    address = undefined;
  }

  const education = asObjectArray(src.education)
    .map((e) => {
      const degree = asString(e.degree ?? e.title ?? e.qualification);
      let field = asString(e.field ?? e.major ?? e.subject);
      let institution = asString(e.institution ?? e.school ?? e.college ?? e.university);
      if (degree && field && degree.toLowerCase() === field.toLowerCase()) field = undefined;
      if (
        institution &&
        [degree, field].some((x) => x && x.toLowerCase() === institution!.toLowerCase())
      ) {
        institution = undefined;
      }
      if (!degree && !field && !institution) return null;
      return {
        institution,
        degree,
        field,
        startDate: asString(e.startDate ?? e.from),
        endDate: asString(e.endDate ?? e.to ?? e.year),
        grade: asString(e.grade ?? e.marks ?? e.gpa),
        details: asString(e.details),
      };
    })
    .filter(Boolean);

  return {
    personal: {
      fullName: asString(personalIn.fullName ?? personalIn.name ?? src.fullName ?? src.name),
      phone: asString(personalIn.phone ?? personalIn.mobile ?? src.phone),
      email: asString(personalIn.email ?? src.email),
      city,
      address,
      age: asString(personalIn.age ?? src.age),
      dateOfBirth: asString(personalIn.dateOfBirth ?? personalIn.dob ?? src.dateOfBirth),
      nationality: asString(personalIn.nationality ?? src.nationality),
    },
    professionalSummary: asString(
      src.professionalSummary ?? src.careerObjective ?? src.summary ?? src.objective,
    ),
    education,
    experience: asObjectArray(src.experience ?? src.workExperience ?? src.jobs).map((e) => ({
      company: asString(e.company ?? e.organization ?? e.employer),
      title: asString(e.title ?? e.role ?? e.position),
      location: asString(e.location ?? e.city),
      startDate: asString(e.startDate ?? e.from),
      endDate: asString(e.endDate ?? e.to),
      responsibilities: asStringArray(e.responsibilities ?? e.duties ?? e.description),
    })),
    skills: asStringArray(src.skills),
    languages,
    certifications: titled("certifications"),
    courses: titled("courses"),
    projects: titled("projects"),
    achievements: titled("achievements"),
    awards: titled("awards"),
    references: asObjectArray(src.references)
      .map((r) => {
        const name = asString(r.name) || asString(r.title);
        if (!name) return null;
        return {
          name,
          relationship: asString(r.relationship ?? r.relation),
          phone: asString(r.phone ?? r.mobile),
          email: asString(r.email),
          organization: asString(r.organization ?? r.company),
        };
      })
      .filter(Boolean),
    interests: asStringArray(src.interests),
    additionalInformation: asString(src.additionalInformation ?? src.additional),
    warnings: Array.isArray(src.warnings)
      ? src.warnings
          .map((w) => {
            if (!w || typeof w !== "object") return null;
            const o = w as Record<string, unknown>;
            const field = asString(o.field) || "general";
            const message = asString(o.message);
            if (!message) return null;
            const severity = asString(o.severity);
            return {
              field,
              message,
              severity:
                severity === "info" || severity === "warning" || severity === "error"
                  ? severity
                  : "warning",
            };
          })
          .filter(Boolean)
      : [],
  };
}

function mapExtractionToCv(
  targetPosition: string,
  extracted: z.infer<typeof ExtractionSchema>,
  sources: SourceInput[],
): CvData {
  const base = emptyCvData(targetPosition);
  const personal = stripNullable(extracted.personal ?? {});

  const cv: CvData = {
    ...base,
    targetPosition,
    personal: {
      fullName: (personal.fullName as string) || undefined,
      phone: (personal.phone as string) || undefined,
      email: (personal.email as string) || undefined,
      city: (personal.city as string) || undefined,
      address: (personal.address as string) || undefined,
      age: (personal.age as string) || undefined,
      dateOfBirth: (personal.dateOfBirth as string) || undefined,
      nationality: (personal.nationality as string) || undefined,
    },
    professionalSummary: extracted.professionalSummary || undefined,
    education: (extracted.education ?? []).map((e) => ({
      id: createId("edu"),
      institution: e.institution || undefined,
      degree: e.degree || undefined,
      field: e.field || undefined,
      startDate: e.startDate || undefined,
      endDate: e.endDate || undefined,
      grade: e.grade || undefined,
      details: e.details || undefined,
    })),
    experience: (extracted.experience ?? []).map((e) => ({
      id: createId("exp"),
      company: e.company || undefined,
      title: e.title || undefined,
      location: e.location || undefined,
      startDate: e.startDate || undefined,
      endDate: e.endDate || undefined,
      responsibilities: (e.responsibilities ?? []).filter(Boolean),
    })),
    skills: (extracted.skills ?? []).filter(Boolean),
    languages: (extracted.languages ?? []).map((l) => ({
      id: createId("lang"),
      name: l.name,
      proficiency: l.proficiency || undefined,
    })),
    certifications: (extracted.certifications ?? []).map((c) => ({
      id: createId("cert"),
      title: c.title,
      details: c.details || undefined,
      date: c.date || undefined,
    })),
    courses: (extracted.courses ?? []).map((c) => ({
      id: createId("course"),
      title: c.title,
      details: c.details || undefined,
      date: c.date || undefined,
    })),
    projects: (extracted.projects ?? []).map((p) => ({
      id: createId("proj"),
      title: p.title,
      details: p.details || undefined,
      date: p.date || undefined,
    })),
    achievements: (extracted.achievements ?? []).map((a) => ({
      id: createId("ach"),
      title: a.title,
      details: a.details || undefined,
      date: a.date || undefined,
    })),
    awards: (extracted.awards ?? []).map((a) => ({
      id: createId("award"),
      title: a.title,
      details: a.details || undefined,
      date: a.date || undefined,
    })),
    references: (extracted.references ?? []).map((r) => ({
      id: createId("ref"),
      name: r.name,
      relationship: r.relationship || undefined,
      phone: r.phone || undefined,
      email: r.email || undefined,
      organization: r.organization || undefined,
    })),
    interests: (extracted.interests ?? []).filter(Boolean),
    additionalInformation: extracted.additionalInformation || undefined,
    warnings: (extracted.warnings ?? []).map((w) => ({
      field: w.field,
      message: w.message,
      severity: w.severity ?? "warning",
    })),
    sources: sources.map((s) => ({
      type: s.type,
      label: s.label,
      excerpt: s.text.slice(0, 200),
    })),
    metadata: {
      ...base.metadata,
      generatedAt: new Date().toISOString(),
      model: getAiConfig().model,
      provider: getAiConfig().provider,
    },
  };

  return CvDataSchema.parse(cv);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI returned malformed JSON");
  }
}

export async function runCvPipeline(params: {
  targetPosition: string;
  sources: SourceInput[];
  photoUrl?: string | null;
  seed?: SeedPersonal | null;
}): Promise<PipelineResult> {
  const started = Date.now();
  const stages: PipelineStage[] = ["reading"];
  const { targetPosition, sources, photoUrl, seed } = params;

  if (!targetPosition.trim()) {
    throw new Error("Target position is required");
  }

  if (!sources.length || sources.every((s) => !s.text.trim())) {
    throw new Error("Provide at least some customer information (text, voice, image, or CV file)");
  }

  const combined = sources
    .map((s, i) => `SOURCE ${i + 1} (${s.type}${s.label ? `: ${s.label}` : ""}):\n${s.text.trim()}`)
    .join("\n\n---\n\n");

  const hasAttachments = sources.some((s) => s.type !== "text");
  const textOnly = !hasAttachments;
  const seedReady = Boolean(
    seed &&
      (seed.fullName?.trim() ||
        seed.phone?.trim() ||
        seed.email?.trim() ||
        seed.city?.trim() ||
        seed.education?.trim() ||
        seed.experience?.trim() ||
        (seed.educationEntries && seed.educationEntries.length > 0) ||
        (seed.experienceEntries && seed.experienceEntries.length > 0) ||
        (seed.certificationEntries && seed.certificationEntries.length > 0) ||
        (seed.projectEntries && seed.projectEntries.length > 0) ||
        (seed.referenceEntries && seed.referenceEntries.length > 0)),
  );

  // Instant path: ANY typed form (seed or notes) — skip Ollama entirely.
  // Voice/OCR attachments still use this path when seed is present (heuristic + seed).
  if (seedReady || textOnly) {
    stages.push("combining", "building", "preparing");
    let cv = enrichShopCv(heuristicExtract(targetPosition, combined), seed);
    cv = pruneEmptySections(CvDataSchema.parse(cv));
    if (photoUrl) cv.photoUrl = photoUrl;
    if (hasAttachments) {
      cv.warnings = [
        ...cv.warnings,
        {
          field: "ai",
          message:
            "Built instantly from typed fields plus attachment text. Review voice/OCR lines carefully.",
          severity: "info",
        },
      ];
    }
    cv.warnings = [...cv.warnings, ...validateCvFacts(cv)];
    const validated = safeParseCvData(cv);
    const elapsedMs = Date.now() - started;
    if (!validated.success) {
      const fallback = enrichShopCv(emptyCvData(targetPosition), seed);
      const again = safeParseCvData(fallback);
      if (!again.success) throw new Error(again.error);
      return { cv: again.data, stages, mode: "instant", elapsedMs };
    }
    return { cv: validated.data, stages, mode: "instant", elapsedMs };
  }

  stages.push("combining", "extracting");

  const provider = getAiProvider();
  const available = await provider.isAvailable();
  if (!available) {
    // Offline fallback so shops are never blocked
    stages.push("building", "preparing");
    let cv = enrichShopCv(heuristicExtract(targetPosition, combined), seed);
    cv = pruneEmptySections(CvDataSchema.parse(cv));
    if (photoUrl) cv.photoUrl = photoUrl;
    cv.warnings = [
      ...cv.warnings,
      {
        field: "ai",
        message: "AI was offline, so the CV was built from typed fields and notes. Please review.",
        severity: "info",
      },
      ...validateCvFacts(cv),
    ];
    const validated = safeParseCvData(cv);
    if (!validated.success) {
      const fallback = enrichShopCv(emptyCvData(targetPosition), seed);
      const again = safeParseCvData(fallback);
      if (!again.success) throw new Error(again.error);
      return { cv: again.data, stages, mode: "offline", elapsedMs: Date.now() - started };
    }
    return { cv: validated.data, stages, mode: "offline", elapsedMs: Date.now() - started };
  }

  stages.push("checking", "rewriting");

  // Keep prompt lean so local models respond before the soft timeout
  const combinedForAi =
    combined.length > 1800 ? `${combined.slice(0, 1800)}\n\n[Truncated for speed]` : combined;

  // Soft timeout: prefer finishing under ~8s with heuristic fallback
  const softTimeoutMs = Number(process.env.OLLAMA_SOFT_TIMEOUT_MS || 8000);

  let raw = "";
  let extracted: ReturnType<typeof ExtractionSchema.safeParse> = {
    success: false,
    error: new z.ZodError([]),
  } as ReturnType<typeof ExtractionSchema.safeParse>;
  let aiTimedOut = false;

  try {
    // Rely on provider AbortSignal only — no Promise.race (avoids unhandled rejections)
    raw = await provider.generate({
      format: "json",
      temperature: 0.1,
      timeoutMs: softTimeoutMs,
      numPredict: 360,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Target position: ${targetPosition}

Customer information (Urdu / Roman Urdu / English OK). Return JSON only from supported facts:

${combinedForAi}`,
        },
      ],
    });

    let parsedUnknown: unknown;
    try {
      parsedUnknown = extractJsonObject(raw);
    } catch {
      parsedUnknown = null;
    }

    const normalized = normalizeAiExtraction(parsedUnknown ?? {});
    extracted = ExtractionSchema.safeParse(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timed out|timeout|AbortError|aborted/i.test(message)) {
      aiTimedOut = true;
    } else {
      raw = "";
    }
  }

  stages.push("building");
  let cv: CvData;
  if (extracted.success) {
    cv = mapExtractionToCv(targetPosition, extracted.data, sources);
  } else {
    cv = heuristicExtract(targetPosition, combined);
    cv.warnings = [
      ...cv.warnings,
      {
        field: "ai",
        message: aiTimedOut
          ? "AI was slow/timed out, so the CV was built from your typed fields and notes. Please review."
          : "AI output was incomplete, so the CV was built from your typed fields and notes. Please review.",
        severity: "info",
      },
    ];
  }

  // Re-apply shop enrich with seed so typed form fields always win
  cv = enrichShopCv(cv, seed);
  cv = pruneEmptySections(CvDataSchema.parse(cv));
  if (photoUrl) cv.photoUrl = photoUrl;

  const conflictWarnings = detectFieldConflicts(
    sources.map((s) => {
      const phoneMatch = s.text.match(/(?:\+?92|0)?3\d{9}/);
      const emailMatch = s.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const nameHint = s.text.match(/(?:name is|mera naam|my name is)\s+([A-Za-z\u0600-\u06FF ]{2,40})/i);
      return {
        source: s.type,
        phone: phoneMatch?.[0],
        email: emailMatch?.[0],
        name: nameHint?.[1],
      };
    }),
  );

  cv.warnings = [...cv.warnings, ...conflictWarnings, ...validateCvFacts(cv)];
  const validated = safeParseCvData(cv);
  if (!validated.success) {
    // Last resort: seed-only CV
    const fallback = enrichShopCv(emptyCvData(targetPosition), seed);
    const again = safeParseCvData(fallback);
    if (!again.success) throw new Error(again.error);
    stages.push("preparing");
    return {
      cv: again.data,
      stages,
      rawModelOutput: raw,
      mode: "fallback",
      elapsedMs: Date.now() - started,
    };
  }

  stages.push("preparing");
  return {
    cv: validated.data,
    stages,
    rawModelOutput: raw,
    mode: extracted.success ? "ai" : "fallback",
    elapsedMs: Date.now() - started,
  };
}

/** Deterministic offline fallback extractor for tests / AI outages with simple English/Roman Urdu patterns */
export function heuristicExtract(targetPosition: string, text: string): CvData {
  const cv = emptyCvData(targetPosition);
  const nameMatch =
    text.match(/my name is\s+([A-Za-z ]+)/i) ||
    text.match(/mera naam\s+([A-Za-z ]+?)(?:\s+hy|\s+hai|$)/i) ||
    text.match(/(?:^|\n|,)\s*name\s*:\s*([A-Za-z][A-Za-z .]{0,40})/i);
  if (nameMatch) cv.personal.fullName = nameMatch[1].trim().replace(/\s+/g, " ");

  const phone =
    text.match(/(?:\+?92|0)?3\d{9}/) ||
    text.match(/(?:phone\s*(?:number|no\.?)?|mobile|contact)\s*:?\s*([0-9+\-\s]{3,20})/i);
  if (phone) cv.personal.phone = (phone[1] || phone[0]).trim();

  const email =
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) ||
    text.match(/(?:gmail|email)\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (email) cv.personal.email = (email[1] || email[0]).trim();

  const city =
    text.match(/(?:city|address)\s*:?\s*([A-Za-z ]{2,40})/i) ||
    text.match(/(?:from|in|of|ka rehne wala|rehne wala)\s+([A-Za-z]+)/i) ||
    text.match(/([A-Za-z]+)\s+ka rehne/i);
  if (city) cv.personal.city = city[1].trim();

  if (/B\.?Com/i.test(text)) {
    cv.education.push({
      id: createId("edu"),
      degree: "B.Com",
    });
  }

  // Only add experience when the text clearly describes work history —
  // not merely because the target job title appears (e.g. "cv for salesman").
  const workedAs = (role: RegExp) => {
    const r = `(?:${role.source})`;
    return (
      new RegExp(
        `(?:worked\\s+as|work\\s+as|experience\\s+as|job\\s+as|i\\s+(?:am|was)|maine|main)\\s+(?:an?\\s+)?${r}`,
        "i",
      ).test(text) ||
      new RegExp(`(\\d+)\\s*(?:saal|years?)\\s+(?:as\\s+)?(?:an?\\s+)?${r}`, "i").test(
        text,
      ) ||
      new RegExp(`${r}\\s+(?:for\\s+)?(\\d+)\\s*(?:saal|years?)`, "i").test(text)
    );
  };

  if (workedAs(/accountant/)) {
    const years = text.match(/(\d+)\s*(?:saal|years?)/i);
    cv.experience.push({
      id: createId("exp"),
      title: "Accountant",
      startDate: years ? `${years[1]} years` : undefined,
      responsibilities: [],
    });
  }

  if (workedAs(/sales(?:man|person|girl)?/)) {
    const years = text.match(/(\d+)\s*(?:saal|years?)/i);
    cv.experience.push({
      id: createId("exp"),
      title: "Salesman",
      startDate: years ? `${years[1]} years` : undefined,
      responsibilities: [],
    });
  }
  if (/customers/i.test(text)) cv.skills.push("Customer Service");
  if (/cash/i.test(text)) cv.skills.push("Cash Handling");

  if (workedAs(/electrician/)) {
    cv.experience.push({
      id: createId("exp"),
      title: "Electrician",
      responsibilities: [],
    });
  }

  if (/solar/i.test(text)) cv.skills.push("Solar Installation");
  if (/AutoCAD/i.test(text)) {
    cv.certifications.push({ id: createId("cert"), title: "AutoCAD Certificate" });
  }

  cv.sources = [{ type: "text", excerpt: text.slice(0, 200) }];
  return pruneEmptySections(enrichShopCv(cv));
}
