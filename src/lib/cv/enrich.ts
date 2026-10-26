import type { CvData, CvWarning } from "@/lib/cv/schema";
import { createId } from "@/lib/utils";
import { defaultSkillsForPosition, ensurePositionSkills } from "@/lib/cv/default-skills";
import { ensureProfessionalSummary } from "@/lib/cv/summary";

/** Common duty bullets when customer named a role but gave no responsibilities. */
const ROLE_DUTIES: Array<{ match: RegExp; duties: string[] }> = [
  {
    match: /sales|salesman|sales\s*person/,
    duties: [
      "Greet customers and understand their requirements",
      "Present products clearly and support purchase decisions",
      "Assist with billing, packing, and counter support",
      "Maintain product display and shop cleanliness",
      "Follow supervisor instructions and daily sales targets",
    ],
  },
  {
    match: /account/,
    duties: [
      "Maintain basic accounts and daily transaction records",
      "Prepare simple summaries in Excel or registers",
      "Support vouchers, receipts, and filing",
      "Assist month-end checks as instructed",
    ],
  },
  {
    match: /driver/,
    duties: [
      "Drive assigned routes safely and on time",
      "Handle delivery or pickup duties carefully",
      "Keep the vehicle clean and report maintenance needs",
      "Follow traffic rules and company instructions",
    ],
  },
  {
    match: /cashier/,
    duties: [
      "Process customer payments accurately",
      "Maintain cash drawer balance during shifts",
      "Provide polite counter service",
      "Report shortages or issues immediately",
    ],
  },
  {
    match: /electric/,
    duties: [
      "Assist wiring and installation tasks under guidance",
      "Follow safety procedures on site",
      "Help diagnose basic electrical faults",
      "Keep tools and materials organized",
    ],
  },
  {
    match: /reception|office\s*assistant|front\s*desk/,
    duties: [
      "Receive visitors and answer phone calls politely",
      "Maintain basic office records and schedules",
      "Support photocopying, filing, and message handling",
      "Coordinate with staff for day-to-day office needs",
    ],
  },
  {
    match: /computer\s*operator|data\s*entry/,
    duties: [
      "Enter and update records accurately on computer",
      "Prepare simple documents in MS Office",
      "Organize digital and paper files",
      "Complete assigned typing and reporting tasks on time",
    ],
  },
];

const KEY_STRENGTHS: Array<{ match: RegExp; strengths: string[] }> = [
  {
    match: /sales|salesman|sales\s*person|cashier|customer/,
    strengths: [
      "Polite and confident customer dealing",
      "Quick learner with product and price knowledge",
      "Honest cash and stock handling",
      "Team player with a positive shop-floor attitude",
    ],
  },
  {
    match: /account|data\s*entry|computer\s*operator|office/,
    strengths: [
      "Careful and accurate record keeping",
      "Organized working style",
      "Comfortable with MS Office basics",
      "Reliable and deadline-focused",
    ],
  },
  {
    match: /driver|security|electric|technician/,
    strengths: [
      "Responsible and disciplined on duty",
      "Safety-first approach",
      "Punctual and dependable",
      "Ready to take instructions and improve skills",
    ],
  },
];

function matchRole<T extends { match: RegExp }>(role: string, rows: T[]): T | undefined {
  const r = role.trim().toLowerCase();
  return rows.find((row) => row.match.test(r));
}

/** Reject AI prompt leakage / instruction text masquerading as skills. */
export function isJunkSkill(skill: string): boolean {
  const t = skill.trim().toLowerCase();
  if (!t) return true;
  if (t.length > 60) return true;
  return (
    t.includes("suitable for the target") ||
    t.includes("basic practical skills") ||
    t.includes("please review") ||
    t.includes("suggested for") ||
    t.includes("target position") ||
    /^skills?\s*:/i.test(t) ||
    t.startsWith("include a short") ||
    t.startsWith("prefer skills")
  );
}

export function sanitizeSkills(skills: string[], targetPosition: string): {
  skills: string[];
  replaced: boolean;
} {
  const cleaned: string[] = [];
  for (const raw of skills) {
    if (isJunkSkill(raw)) continue;
    // Split accidental comma-joined blobs that are still short enough
    if (raw.includes(",") && raw.length > 40) {
      for (const part of raw.split(",")) {
        const p = part.trim();
        if (p && !isJunkSkill(p)) cleaned.push(p);
      }
    } else {
      cleaned.push(raw.trim());
    }
  }
  const unique = [...new Set(cleaned.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { skills: defaultSkillsForPosition(targetPosition), replaced: true };
  }
  return { skills: unique, replaced: false };
}

export function ensureDefaultLanguages(cv: CvData): CvData {
  if (cv.languages.length > 0) return cv;
  return {
    ...cv,
    languages: [
      { id: createId("lang"), name: "Urdu", proficiency: "Native" },
      { id: createId("lang"), name: "English", proficiency: "Conversational" },
    ],
    warnings: [
      ...cv.warnings,
      {
        field: "languages",
        message:
          "Default languages (Urdu / English) were added for a complete shop CV. Adjust if needed.",
        severity: "info",
      } satisfies CvWarning,
    ],
  };
}

export function ensureNationality(cv: CvData): CvData {
  if (cv.personal.nationality?.trim()) return cv;
  return {
    ...cv,
    personal: { ...cv.personal, nationality: "Pakistani" },
  };
}

/** Fill empty responsibility lists for known job titles (does not invent employers). */
export function ensureExperienceDuties(cv: CvData): CvData {
  const experience = cv.experience.map((job) => {
    if ((job.responsibilities?.length ?? 0) > 0) return job;
    const title = job.title || cv.targetPosition;
    const row = matchRole(title, ROLE_DUTIES) || matchRole(cv.targetPosition, ROLE_DUTIES);
    if (!row) return job;
    return { ...job, responsibilities: [...row.duties] };
  });
  return { ...cv, experience };
}

/** Key strengths when there is little/no experience — shown as Achievements. */
export function ensureKeyStrengths(cv: CvData): CvData {
  if (cv.achievements.length > 0) return cv;
  if (cv.experience.some((e) => (e.responsibilities?.length ?? 0) > 0)) return cv;

  const row = matchRole(cv.targetPosition, KEY_STRENGTHS);
  const strengths =
    row?.strengths ??
    [
      "Hardworking and punctual",
      "Honest and responsible",
      "Willing to learn quickly",
      "Good teamwork and communication",
    ];

  return {
    ...cv,
    achievements: strengths.map((title) => ({
      id: createId("ach"),
      title,
    })),
    warnings: [
      ...cv.warnings,
      {
        field: "achievements",
        message:
          "Key strengths were suggested from the target job because detailed experience was not provided. Please review.",
        severity: "info",
      } satisfies CvWarning,
    ],
  };
}

export type SeedEducation = {
  degree?: string;
  institution?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
};

export type SeedExperience = {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  responsibilities?: string[];
};

export type SeedCertification = {
  title: string;
  details?: string;
  date?: string;
};

export type SeedProject = {
  title: string;
  details?: string;
  date?: string;
};

export type SeedReference = {
  name: string;
  relationship?: string;
  organization?: string;
  phone?: string;
  email?: string;
};

export type SeedPersonal = {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  /** @deprecated single-line — prefer educationEntries */
  education?: string;
  /** @deprecated single-line — prefer experienceEntries */
  experience?: string;
  educationEntries?: SeedEducation[];
  experienceEntries?: SeedExperience[];
  certificationEntries?: SeedCertification[];
  projectEntries?: SeedProject[];
  referenceEntries?: SeedReference[];
  /** LinkedIn / form skills — applied before default skill fill. */
  skills?: string[];
};

/** Apply employee-typed form fields so they never get lost to AI. */
export function applySeedPersonal(cv: CvData, seed?: SeedPersonal | null): CvData {
  if (!seed) return cv;
  let next: CvData = {
    ...cv,
    personal: {
      ...cv.personal,
      fullName: seed.fullName?.trim() || cv.personal.fullName,
      phone: seed.phone?.trim() || cv.personal.phone,
      email: seed.email?.trim() || cv.personal.email,
      city: seed.city?.trim() || cv.personal.city,
    },
  };

  const eduEntries = (seed.educationEntries || []).filter(
    (e) => e.degree?.trim() || e.institution?.trim() || e.field?.trim(),
  );
  if (eduEntries.length > 0) {
    next = {
      ...next,
      education: eduEntries.map((e) => ({
        id: createId("edu"),
        degree: e.degree?.trim() || undefined,
        institution: e.institution?.trim() || undefined,
        field: e.field?.trim() || undefined,
        startDate: e.startDate?.trim() || undefined,
        endDate: e.endDate?.trim() || undefined,
        grade: e.grade?.trim() || undefined,
      })),
    };
  } else if (seed.education?.trim() && next.education.length === 0) {
    next = {
      ...next,
      education: [{ id: createId("edu"), degree: seed.education.trim() }],
    };
  }

  const expEntries = (seed.experienceEntries || []).filter(
    (e) =>
      e.title?.trim() ||
      e.company?.trim() ||
      (e.responsibilities?.some((r) => r.trim()) ?? false),
  );
  if (expEntries.length > 0) {
    next = {
      ...next,
      experience: expEntries.map((e) => ({
        id: createId("exp"),
        title: e.title?.trim() || next.targetPosition || "Work experience",
        company: e.company?.trim() || undefined,
        location: e.location?.trim() || undefined,
        startDate: e.startDate?.trim() || undefined,
        endDate: e.endDate?.trim() || undefined,
        responsibilities: (e.responsibilities || []).map((r) => r.trim()).filter(Boolean),
      })),
    };
  } else if (seed.experience?.trim() && next.experience.length === 0) {
    next = {
      ...next,
      experience: [
        {
          id: createId("exp"),
          title: next.targetPosition || "Work experience",
          responsibilities: [seed.experience.trim()],
        },
      ],
    };
  }

  const seedSkills = (seed.skills || []).map((s) => s.trim()).filter(Boolean);
  if (seedSkills.length > 0) {
    const merged = [...seedSkills, ...next.skills];
    const seen = new Set<string>();
    next = {
      ...next,
      skills: merged.filter((s) => {
        const key = s.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    };
  }

  const certEntries = (seed.certificationEntries || []).filter((c) => c.title?.trim());
  if (certEntries.length > 0) {
    next = {
      ...next,
      certifications: certEntries.map((c) => ({
        id: createId("cert"),
        title: c.title.trim(),
        details: c.details?.trim() || undefined,
        date: c.date?.trim() || undefined,
      })),
    };
  }

  const projectEntries = (seed.projectEntries || []).filter((p) => p.title?.trim());
  if (projectEntries.length > 0) {
    next = {
      ...next,
      projects: projectEntries.map((p) => ({
        id: createId("proj"),
        title: p.title.trim(),
        details: p.details?.trim() || undefined,
        date: p.date?.trim() || undefined,
      })),
    };
  }

  const refEntries = (seed.referenceEntries || []).filter((r) => r.name?.trim());
  if (refEntries.length > 0) {
    next = {
      ...next,
      references: refEntries.map((r) => ({
        id: createId("ref"),
        name: r.name.trim(),
        relationship: r.relationship?.trim() || undefined,
        organization: r.organization?.trim() || undefined,
        phone: r.phone?.trim() || undefined,
        email: r.email?.trim() || undefined,
      })),
    };
  }

  return next;
}

/**
 * Final shop-CV polish.
 * Compulsory without asking: Career Objective, job skills, Urdu/English, Key Strengths (if no experience).
 * Never auto-adds References. Never invents schools, companies, degrees, or dates.
 */
export function enrichShopCv(cv: CvData, seed?: SeedPersonal | null): CvData {
  let next = applySeedPersonal(cv, seed);

  const sanitized = sanitizeSkills(next.skills, next.targetPosition);
  if (sanitized.replaced) {
    next.skills = sanitized.skills;
    next.warnings = [
      ...next.warnings,
      {
        field: "skills",
        message:
          "Basic skills were suggested for the target position because little/no skill or experience detail was provided. Please review.",
        severity: "info",
      },
    ];
  } else {
    const skillFill = ensurePositionSkills({
      targetPosition: next.targetPosition,
      skills: sanitized.skills,
    });
    next.skills = skillFill.skills;
    if (skillFill.filledFromPosition) {
      next.warnings = [
        ...next.warnings,
        {
          field: "skills",
          message:
            "Basic skills were suggested for the target position because little/no skill or experience detail was provided. Please review.",
          severity: "info",
        },
      ];
    }
  }

  // Drop invented "Available upon request" style refs if somehow present with no real contact
  next.references = next.references.filter((r) => {
    const name = r.name.trim().toLowerCase();
    return name !== "available upon request" && name !== "available on request";
  });

  next = ensureNationality(next);
  next = ensureProfessionalSummary(next);
  next = ensureExperienceDuties(next);
  next = ensureKeyStrengths(next);
  next = ensureDefaultLanguages(next);

  next.sectionOrder = [
    "summary",
    "experience",
    "education",
    "skills",
    "achievements",
    "languages",
    "certifications",
    "courses",
    "projects",
    "awards",
    "volunteer",
    "interests",
    "references",
    "additional",
  ];

  return next;
}
