/**
 * Basic skills for common shop CV positions.
 * Used when the customer gave little/no experience or skills
 * (typical for first-time / less-educated applicants).
 * Employee should still review before print.
 */
const POSITION_SKILLS: Record<string, string[]> = {
  accountant: [
    "Basic Accounting",
    "MS Excel",
    "Record Keeping",
    "Attention to Detail",
    "Cash Handling",
  ],
  salesman: [
    "Customer Service",
    "Sales & Persuasion",
    "Communication",
    "Cash Handling",
    "Product Knowledge",
    "Billing Support",
    "Teamwork",
    "Punctuality",
  ],
  sales: [
    "Customer Service",
    "Sales & Persuasion",
    "Communication",
    "Cash Handling",
    "Product Knowledge",
    "Teamwork",
  ],
  teacher: [
    "Classroom Management",
    "Communication",
    "Lesson Planning",
    "Student Guidance",
  ],
  electrician: [
    "Electrical Wiring",
    "Troubleshooting",
    "Safety Awareness",
    "Equipment Maintenance",
  ],
  driver: [
    "Safe Driving",
    "Route Knowledge",
    "Vehicle Maintenance Awareness",
    "Punctuality",
  ],
  cashier: [
    "Cash Handling",
    "Customer Service",
    "POS Operation",
    "Accuracy",
  ],
  "office assistant": [
    "MS Office",
    "Filing",
    "Communication",
    "Data Entry",
    "Phone Handling",
  ],
  "software engineer": [
    "Problem Solving",
    "Programming Fundamentals",
    "Teamwork",
    "Debugging",
  ],
  "graphic designer": [
    "Creativity",
    "Adobe Photoshop",
    "Layout Design",
    "Attention to Detail",
  ],
  nurse: [
    "Patient Care",
    "First Aid Awareness",
    "Communication",
    "Teamwork",
  ],
  receptionist: [
    "Front Desk Handling",
    "Communication",
    "Phone Handling",
    "Customer Service",
    "MS Office",
  ],
  "computer operator": [
    "MS Office",
    "Typing",
    "Data Entry",
    "Internet Browsing",
  ],
  "data entry operator": [
    "Data Entry",
    "MS Excel",
    "Typing Speed",
    "Accuracy",
  ],
  "store keeper": [
    "Inventory Management",
    "Stock Record Keeping",
    "Organization",
    "Attention to Detail",
  ],
  manager: [
    "Team Coordination",
    "Communication",
    "Problem Solving",
    "Planning",
  ],
  "marketing executive": [
    "Communication",
    "Sales Support",
    "Social Media Awareness",
    "Customer Relations",
  ],
  "customer service representative": [
    "Customer Service",
    "Communication",
    "Problem Solving",
    "Patience",
  ],
  technician: [
    "Troubleshooting",
    "Equipment Repair",
    "Technical Support",
    "Safety Awareness",
  ],
  pharmacist: [
    "Medicine Knowledge",
    "Customer Service",
    "Accuracy",
    "Record Keeping",
  ],
  "security guard": [
    "Security Awareness",
    "Surveillance",
    "Discipline",
    "Emergency Response Awareness",
  ],
};

const GENERIC_WORK_SKILLS = [
  "Communication",
  "Teamwork",
  "Punctuality",
  "Hardworking",
  "Willingness to Learn",
];

function normalizePosition(position: string): string {
  return position.trim().toLowerCase().replace(/\s+/g, " ");
}

export function defaultSkillsForPosition(targetPosition: string): string[] {
  const key = normalizePosition(targetPosition);
  if (!key) return [...GENERIC_WORK_SKILLS];

  if (POSITION_SKILLS[key]) return [...POSITION_SKILLS[key]];

  // Fuzzy contains match (e.g. "Shop Salesman", "Junior Accountant")
  for (const [name, skills] of Object.entries(POSITION_SKILLS)) {
    if (key.includes(name) || name.includes(key)) {
      return [...skills];
    }
  }

  return [...GENERIC_WORK_SKILLS];
}

/**
 * If the CV has no skills yet, fill practical basics for the target job.
 * Does NOT invent education, companies, or dates.
 */
export function ensurePositionSkills(params: {
  targetPosition: string;
  skills: string[];
}): { skills: string[]; filledFromPosition: boolean } {
  const existing = params.skills.map((s) => s.trim()).filter(Boolean);
  if (existing.length > 0) {
    return { skills: existing, filledFromPosition: false };
  }

  return {
    skills: defaultSkillsForPosition(params.targetPosition),
    filledFromPosition: true,
  };
}
