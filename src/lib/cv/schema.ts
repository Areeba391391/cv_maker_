import { z } from "zod";

export const EmailSchema = z
  .string()
  .trim()
  .email("Invalid email format")
  .or(z.literal(""))
  .optional();

export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  age: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
});

export const EducationItemSchema = z.object({
  id: z.string(),
  institution: z.string().trim().optional(),
  degree: z.string().trim().optional(),
  field: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  details: z.string().trim().optional(),
});

export const ExperienceItemSchema = z.object({
  id: z.string(),
  company: z.string().trim().optional(),
  title: z.string().trim().optional(),
  location: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  responsibilities: z.array(z.string().trim()).default([]),
});

export const SimpleItemSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  details: z.string().trim().optional(),
  date: z.string().trim().optional(),
});

export const LanguageItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  proficiency: z.string().trim().optional(),
});

export const ReferenceItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  relationship: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  organization: z.string().trim().optional(),
});

export const WarningSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]).default("warning"),
});

export const CvSourceSchema = z.object({
  type: z.enum(["text", "voice", "image", "pdf", "doc", "docx", "cv_image", "photo"]),
  label: z.string().optional(),
  excerpt: z.string().optional(),
});

export const CvDataSchema = z.object({
  targetPosition: z.string().trim().min(1),
  personal: PersonalInfoSchema.default({}),
  professionalSummary: z.string().trim().optional(),
  education: z.array(EducationItemSchema).default([]),
  experience: z.array(ExperienceItemSchema).default([]),
  skills: z.array(z.string().trim().min(1)).default([]),
  languages: z.array(LanguageItemSchema).default([]),
  certifications: z.array(SimpleItemSchema).default([]),
  courses: z.array(SimpleItemSchema).default([]),
  projects: z.array(SimpleItemSchema).default([]),
  achievements: z.array(SimpleItemSchema).default([]),
  awards: z.array(SimpleItemSchema).default([]),
  references: z.array(ReferenceItemSchema).default([]),
  volunteerExperience: z.array(ExperienceItemSchema).default([]),
  interests: z.array(z.string().trim().min(1)).default([]),
  additionalInformation: z.string().trim().optional(),
  photoUrl: z.string().url().or(z.literal("")).optional().nullable(),
  sectionOrder: z
    .array(
      z.enum([
        "summary",
        "experience",
        "education",
        "skills",
        "languages",
        "certifications",
        "courses",
        "projects",
        "achievements",
        "awards",
        "volunteer",
        "interests",
        "references",
        "additional",
      ]),
    )
    .default([
      "summary",
      "experience",
      "education",
      "skills",
      "languages",
      "certifications",
      "courses",
      "projects",
      "achievements",
      "awards",
      "volunteer",
      "interests",
      "references",
      "additional",
    ]),
  warnings: z.array(WarningSchema).default([]),
  sources: z.array(CvSourceSchema).default([]),
  metadata: z
    .object({
      generatedAt: z.string().optional(),
      model: z.string().optional(),
      provider: z.string().optional(),
      templateId: z
        .enum(["professional", "modern", "classic", "executive", "minimal", "sidebar", "ats"])
        .default("professional"),
      /** Paper size for preview + print + PDF. */
      pageSize: z.enum(["a4", "letter", "legal"]).default("a4"),
      /** Manual font scale for print/preview (0.8–1.45). */
      fontScale: z.number().min(0.8).max(1.45).default(1),
      /** When true, Auto density must not override fontScale (A+/A− locked in). */
      fontLocked: z.boolean().optional(),
      /** Page density. auto = fill one page when short, tighten when long. */
      density: z.enum(["auto", "compact", "comfortable", "spacious"]).default("auto"),
      /**
       * Page budget: 1 = keep one A4, 2 = allow overflow to page 2,
       * auto = decide from content weight.
       */
      maxPages: z.union([z.literal(1), z.literal(2), z.literal("auto")]).default("auto"),
      /** Page margins in millimetres (A4). */
      margins: z
        .object({
          top: z.number().min(4).max(30).default(12),
          right: z.number().min(4).max(30).default(14),
          bottom: z.number().min(4).max(30).default(14),
          left: z.number().min(4).max(30).default(14),
        })
        .default({ top: 12, right: 14, bottom: 14, left: 14 }),
      /** When true, density presets do not override custom margins. */
      marginsLocked: z.boolean().optional(),
      /** Extra space after paragraphs / summary (0–18). */
      paragraphSpacing: z.number().min(0).max(18).default(6),
      /** Gap between major sections (0–24). */
      sectionGap: z.number().min(0).max(24).default(11),
      /** Body line-height multiplier (1.15–1.9). */
      lineHeight: z.number().min(1.15).max(1.9).default(1.5),
    })
    .default({
      templateId: "professional",
      pageSize: "a4",
      fontScale: 1,
      density: "auto",
      maxPages: "auto",
      margins: { top: 12, right: 14, bottom: 14, left: 14 },
      paragraphSpacing: 6,
      sectionGap: 11,
      lineHeight: 1.5,
    }),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type SimpleItem = z.infer<typeof SimpleItemSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type ReferenceItem = z.infer<typeof ReferenceItemSchema>;
export type CvWarning = z.infer<typeof WarningSchema>;
export type CvData = z.infer<typeof CvDataSchema>;
export type TemplateId = NonNullable<CvData["metadata"]["templateId"]>;
export type PageSizeId = NonNullable<CvData["metadata"]["pageSize"]>;
export type SectionId = CvData["sectionOrder"][number];

export const SECTION_LABELS: Record<SectionId, string> = {
  summary: "Career objective",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  certifications: "Certifications",
  courses: "Courses",
  projects: "Projects",
  achievements: "Achievements",
  awards: "Awards",
  volunteer: "Volunteer",
  interests: "Interests",
  references: "References",
  additional: "Additional",
};

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certifications",
  "courses",
  "projects",
  "achievements",
  "awards",
  "volunteer",
  "interests",
  "references",
  "additional",
];

export function emptyCvData(targetPosition = ""): CvData {
  return CvDataSchema.parse({
    targetPosition,
    personal: {},
    education: [],
    experience: [],
    skills: [],
    languages: [],
    certifications: [],
    courses: [],
    projects: [],
    achievements: [],
    awards: [],
    references: [],
    volunteerExperience: [],
    interests: [],
    warnings: [],
    sources: [],
    metadata: { templateId: "professional" },
  });
}
