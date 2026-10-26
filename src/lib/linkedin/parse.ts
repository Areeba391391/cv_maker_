/**
 * Heuristic parser for LinkedIn profile text (paste) or LinkedIn “Save to PDF” extract.
 * Does not scrape live LinkedIn URLs.
 */

export type LinkedInSeed = {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  headline?: string;
  about?: string;
  experienceEntries: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    duties: string;
  }>;
  educationEntries: Array<{
    degree: string;
    field: string;
    institution: string;
    startDate: string;
    endDate: string;
    grade: string;
  }>;
  skills: string[];
};

export type LinkedInParseResult = {
  seed: LinkedInSeed;
  notes: string[];
  targetHint?: string;
};

const SECTION_HEADERS: Array<{ key: string; patterns: RegExp[] }> = [
  {
    key: "about",
    patterns: [/^about$/i, /^summary$/i, /^about\s+me$/i],
  },
  {
    key: "experience",
    patterns: [/^experience$/i, /^work\s+experience$/i, /^employment$/i],
  },
  {
    key: "education",
    patterns: [/^education$/i],
  },
  {
    key: "skills",
    patterns: [/^skills$/i, /^top\s+skills$/i, /^skills\s+&\s+endorsements$/i],
  },
  {
    key: "licenses",
    patterns: [/^licenses?\s*(&|and)?\s*certifications?$/i, /^certifications?$/i],
  },
  {
    key: "languages",
    patterns: [/^languages?$/i],
  },
  {
    key: "contact",
    patterns: [/^contact\s+info$/i, /^contact$/i],
  },
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const DATE_RANGE_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current|Now)/i;

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function matchSection(line: string): string | null {
  for (const s of SECTION_HEADERS) {
    if (s.patterns.some((p) => p.test(line))) return s.key;
  }
  return null;
}

function splitSections(lines: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let current = "header";
  map.set(current, []);

  for (const line of lines) {
    const key = matchSection(line);
    if (key) {
      current = key;
      if (!map.has(current)) map.set(current, []);
      continue;
    }
    map.get(current)!.push(line);
  }
  return map;
}

function extractContact(text: string): { email?: string; phone?: string } {
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, " ").trim();
  return { email, phone };
}

function guessName(headerLines: string[]): string | undefined {
  for (const line of headerLines.slice(0, 8)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/linkedin|page\s+\d|https?:\/\//i.test(line)) continue;
    if (line.length < 3 || line.length > 60) continue;
    // Prefer "First Last" style
    if (/^[A-Za-z][A-Za-z'’\-]+(?:\s+[A-Za-z][A-Za-z'’\-]+){0,3}$/.test(line)) {
      return line;
    }
  }
  return undefined;
}

function guessHeadline(headerLines: string[], name?: string): string | undefined {
  for (const line of headerLines.slice(0, 12)) {
    if (name && line === name) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/linkedin|page\s+\d|https?:\/\//i.test(line)) continue;
    if (line.length < 4 || line.length > 120) continue;
    if (/^[A-Za-z0-9].+/.test(line)) return line;
  }
  return undefined;
}

function guessCity(headerLines: string[]): string | undefined {
  for (const line of headerLines) {
    // "City, Country" or "Lahore, Punjab, Pakistan"
    if (/^[A-Za-z][A-Za-z\s.'-]*,\s*[A-Za-z]/.test(line) && line.length < 80) {
      if (/experience|education|skills|about/i.test(line)) continue;
      return line.split(",")[0]?.trim() || line;
    }
  }
  return undefined;
}

function parseDateRange(line: string): { startDate: string; endDate: string } | null {
  const m = line.match(DATE_RANGE_RE);
  if (!m) return null;
  return { startDate: m[1].trim(), endDate: m[2].trim() };
}

function parseExperience(lines: string[]): LinkedInSeed["experienceEntries"] {
  const entries: LinkedInSeed["experienceEntries"] = [];
  let current: LinkedInSeed["experienceEntries"][0] | null = null;

  const flush = () => {
    if (current && (current.title || current.company || current.duties)) {
      entries.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const dates = parseDateRange(line);
    if (dates) {
      if (!current) {
        current = {
          title: "",
          company: "",
          location: "",
          startDate: dates.startDate,
          endDate: dates.endDate,
          duties: "",
        };
      } else {
        current.startDate = current.startDate || dates.startDate;
        current.endDate = current.endDate || dates.endDate;
      }
      // Remaining text after dates may be duration — ignore
      continue;
    }

    // Bullet / duty line
    if (/^[•·●▪◦\-\*]/.test(line) || (current && current.title && line.length > 40)) {
      if (!current) continue;
      const duty = line.replace(/^[•·●▪◦\-\*]+\s*/, "").trim();
      if (duty) {
        current.duties = current.duties ? `${current.duties}\n${duty}` : duty;
      }
      continue;
    }

    // New role: Title at Company OR Title / Company on consecutive lines
    const atMatch = line.match(/^(.+?)\s+(?:at|@|—|-|–)\s+(.+)$/i);
    if (atMatch && !dates) {
      flush();
      current = {
        title: atMatch[1].trim(),
        company: atMatch[2].trim(),
        location: "",
        startDate: "",
        endDate: "",
        duties: "",
      };
      continue;
    }

    if (!current) {
      current = {
        title: line,
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        duties: "",
      };
      continue;
    }

    if (!current.company && line.length < 80) {
      current.company = line;
      continue;
    }

    if (!current.location && /^[A-Za-z].*,/.test(line) && line.length < 80) {
      current.location = line;
      continue;
    }

    // Extra narrative → duties
    const duty = line.replace(/^[•·●▪◦\-\*]+\s*/, "").trim();
    if (duty) {
      current.duties = current.duties ? `${current.duties}\n${duty}` : duty;
    }
  }

  flush();
  return entries.slice(0, 12);
}

function parseEducation(lines: string[]): LinkedInSeed["educationEntries"] {
  const entries: LinkedInSeed["educationEntries"] = [];
  let current: LinkedInSeed["educationEntries"][0] | null = null;

  const flush = () => {
    if (current && (current.institution || current.degree)) {
      entries.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const dates = parseDateRange(line);
    if (dates) {
      if (!current) {
        current = {
          degree: "",
          field: "",
          institution: "",
          startDate: dates.startDate,
          endDate: dates.endDate,
          grade: "",
        };
      } else {
        current.startDate = current.startDate || dates.startDate;
        current.endDate = current.endDate || dates.endDate;
      }
      continue;
    }

    const degreeMatch = line.match(
      /^(Bachelor|Master|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|MBA|Ph\.?D\.?|Diploma|Matric|Intermediate|Associate)(.*)$/i,
    );

    if (!current) {
      current = {
        degree: degreeMatch ? degreeMatch[1] : "",
        field: degreeMatch ? degreeMatch[2].replace(/^[,:\-\s]+/, "").trim() : "",
        institution: degreeMatch ? "" : line,
        startDate: "",
        endDate: "",
        grade: "",
      };
      continue;
    }

    if (degreeMatch && !current.degree) {
      current.degree = degreeMatch[1];
      current.field = degreeMatch[2].replace(/^[,:\-\s]+/, "").trim();
      continue;
    }

    if (!current.institution && line.length < 100) {
      current.institution = line;
      continue;
    }

    if (!current.degree && line.length < 80) {
      current.degree = line;
      continue;
    }

    if (/gpa|grade|cgpa/i.test(line) && !current.grade) {
      current.grade = line;
    }
  }

  flush();
  return entries.slice(0, 8);
}

function parseSkills(lines: string[]): string[] {
  const skills: string[] = [];
  for (const line of lines) {
    // "Skill · Skill · Skill" or comma-separated
    const parts = line.split(/[·•|,;]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (p.length < 2 || p.length > 48) continue;
      if (/endorsement|show all|linkedin/i.test(p)) continue;
      if (!skills.some((s) => s.toLowerCase() === p.toLowerCase())) {
        skills.push(p);
      }
    }
  }
  return skills.slice(0, 30);
}

/**
 * Parse pasted LinkedIn text or PDF-extracted text into a seed for the New CV form.
 */
export function parseLinkedInText(raw: string): LinkedInParseResult {
  const notes: string[] = [];
  const text = (raw || "").trim();
  if (!text) {
    return {
      seed: {
        experienceEntries: [],
        educationEntries: [],
        skills: [],
      },
      notes: ["No text provided. Paste LinkedIn About/Experience or upload a Save-to-PDF export."],
    };
  }

  const lines = normalizeLines(text);
  const sections = splitSections(lines);
  const header = sections.get("header") || [];
  const contactBits = extractContact(text);

  const fullName = guessName(header);
  const headline = guessHeadline(header, fullName);
  const city = guessCity(header);

  const aboutLines = sections.get("about") || [];
  const about = aboutLines.join(" ").trim() || undefined;

  const experienceEntries = parseExperience(sections.get("experience") || []);
  const educationEntries = parseEducation(sections.get("education") || []);
  const skills = parseSkills(sections.get("skills") || []);

  if (!fullName) notes.push("Could not detect a name — fill it manually.");
  if (!experienceEntries.length) notes.push("No Experience section found — paste that block if available.");
  if (!educationEntries.length) notes.push("No Education section found.");
  if (!skills.length) notes.push("No Skills list detected.");
  if (experienceEntries.length || educationEntries.length || skills.length) {
    notes.push("Review imported fields, then tap Generate. Prefer the ATS template for job portals.");
  }

  return {
    seed: {
      fullName,
      phone: contactBits.phone,
      email: contactBits.email,
      city,
      headline,
      about,
      experienceEntries,
      educationEntries,
      skills,
    },
    notes,
    targetHint: headline,
  };
}
