import type { CvData } from "@/lib/cv/schema";

function normalizeRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Role-specific career objective lines (honest; no fake employers/years/degrees). */
function roleObjectiveLines(role: string): { focus: string; strengths: string } {
  const r = normalizeRole(role);

  const table: Array<{ match: RegExp; focus: string; strengths: string }> = [
    {
      match: /sales|salesman|sales\s*person|shop\s*keeper/,
      focus:
        "contribute to daily sales targets, assist customers with product selection, and support counter and floor operations",
      strengths:
        "clear communication, polite customer handling, cash awareness, and a willingness to learn product knowledge quickly",
    },
    {
      match: /account/,
      focus:
        "support bookkeeping, maintain accurate records, and assist with day-to-day accounts work",
      strengths:
        "careful number handling, MS Excel familiarity, organization, and honesty with financial records",
    },
    {
      match: /driver/,
      focus:
        "provide safe and punctual driving support for deliveries or staff transport as required",
      strengths:
        "road sense, punctuality, responsibility, and care for vehicle and passenger safety",
    },
    {
      match: /electric/,
      focus:
        "assist with electrical installation, basic troubleshooting, and safe on-site work under supervision",
      strengths:
        "practical problem-solving, safety awareness, and readiness to learn from senior technicians",
    },
    {
      match: /cashier|cash\s*counter/,
      focus:
        "handle customer payments accurately, manage the cash counter, and provide friendly service",
      strengths:
        "accuracy, polite communication, and reliable cash handling habits",
    },
    {
      match: /reception|front\s*desk|office\s*assistant/,
      focus:
        "manage front-desk communication, greet visitors, and support basic office tasks",
      strengths:
        "clear spoken communication, organization, phone handling, and a professional manner",
    },
    {
      match: /computer\s*operator|data\s*entry/,
      focus:
        "perform accurate computer-based office work including typing, filing, and data entry",
      strengths:
        "MS Office basics, attention to detail, and steady typing accuracy",
    },
    {
      match: /teacher|tutor/,
      focus:
        "support student learning with clear explanation, patience, and disciplined classroom habits",
      strengths:
        "communication, responsibility, and a genuine interest in helping learners improve",
    },
    {
      match: /security/,
      focus:
        "maintain premises security, follow duty instructions, and report incidents promptly",
      strengths:
        "discipline, alertness, honesty, and a calm approach under pressure",
    },
    {
      match: /technician|repair/,
      focus:
        "diagnose basic faults, assist repairs, and provide practical technical support",
      strengths:
        "hands-on troubleshooting, careful work habits, and willingness to learn tools and procedures",
    },
  ];

  for (const row of table) {
    if (row.match.test(r)) return { focus: row.focus, strengths: row.strengths };
  }

  return {
    focus: "support daily workplace tasks, follow instructions carefully, and grow with the team",
    strengths: "punctuality, honesty, teamwork, and a strong willingness to learn",
  };
}

/**
 * Builds a shop-ready Career Objective (2–3 sentences).
 * Uses only known facts + target position. Never invents employers, years, or degrees.
 */
export function buildProfessionalSummary(cv: CvData): string {
  const name = cv.personal.fullName?.trim();
  const city = (cv.personal.city || cv.personal.address || "").trim();
  const role = cv.targetPosition.trim() || "the applied position";
  const hasExperience = cv.experience.some(
    (e) => e.company || e.title || (e.responsibilities?.length ?? 0) > 0,
  );
  const hasEducation = cv.education.some(
    (e) => e.institution || e.degree || e.field || e.details,
  );

  const who = name || "A motivated candidate";
  const where = city ? ` based in ${city}` : "";
  const { focus, strengths } = roleObjectiveLines(role);

  if (hasExperience) {
    const titles = cv.experience
      .map((e) => e.title)
      .filter(Boolean)
      .slice(0, 2) as string[];
    const roleBit = titles.length
      ? ` with practical experience as ${titles.join(" and ")}`
      : " with practical work experience";
    const eduBit = hasEducation
      ? ` Educational background includes ${cv.education
          .map((e) => e.degree || e.field || e.institution)
          .filter(Boolean)
          .slice(0, 2)
          .join(" and ")}.`
      : "";
    return (
      `${who}${where} is seeking a ${role} role${roleBit}. ` +
      `Ready to ${focus}. Known for ${strengths}.${eduBit}`
    ).trim();
  }

  if (hasEducation) {
    const edu = cv.education
      .map((e) => e.degree || e.field || e.institution)
      .filter(Boolean)
      .slice(0, 2)
      .join(" and ");
    return (
      `${who}${where} is applying for a ${role} position after completing ${edu}. ` +
      `Eager to ${focus}. Strengths include ${strengths}.`
    ).trim();
  }

  return (
    `Career Objective: ${who}${where} seeks a ${role} position to ${focus}. ` +
    `I am hardworking, honest, and punctual, with ${strengths}. ` +
    `I am ready to start immediately and grow through practical, on-the-job learning.`
  ).trim();
}

export function ensureProfessionalSummary(cv: CvData): CvData {
  // Always refresh weak/placeholder summaries for thin shop CVs
  const existing = cv.professionalSummary?.trim() || "";
  const weak =
    !existing ||
    existing.length < 80 ||
    /seeking an opportunity as a/i.test(existing) ||
    /motivated candidate/i.test(existing);

  if (!weak) return cv;
  return {
    ...cv,
    professionalSummary: buildProfessionalSummary(cv),
  };
}
