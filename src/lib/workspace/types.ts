export const WORKSPACE_TYPES = [
  "general",
  "computer_shop",
  "typing_center",
  "career_coach",
  "education",
  "hr_desk",
  "freelancer",
  "other",
] as const;

export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export type WorkspaceLabels = {
  id: WorkspaceType;
  title: string;
  description: string;
  orgNoun: string; // "Workspace", "Shop", "Center"
  clientNoun: string; // "Client", "Customer", "Applicant"
  clientNounPlural: string;
  staffNoun: string; // "Team member", "Operator"
  helperHint: string; // short bilingual tip if useful
};

const LABELS: Record<WorkspaceType, WorkspaceLabels> = {
  general: {
    id: "general",
    title: "General / Any business",
    description: "Works for any desk that makes CVs for people.",
    orgNoun: "Workspace",
    clientNoun: "Client",
    clientNounPlural: "Clients",
    staffNoun: "Team member",
    helperHint: "Fill what you know. Leave the rest blank.",
  },
  computer_shop: {
    id: "computer_shop",
    title: "Computer / print shop",
    description: "Walk-in customers at a computer or photocopy shop.",
    orgNoun: "Shop",
    clientNoun: "Customer",
    clientNounPlural: "Customers",
    staffNoun: "Operator",
    helperHint: "Job name pehle · naam / phone baad mein.",
  },
  typing_center: {
    id: "typing_center",
    title: "Typing / document center",
    description: "Document and CV typing services.",
    orgNoun: "Center",
    clientNoun: "Customer",
    clientNounPlural: "Customers",
    staffNoun: "Operator",
    helperHint: "Type what the customer said. Empty is OK.",
  },
  career_coach: {
    id: "career_coach",
    title: "Career coach / consultant",
    description: "Coaching, placement, and career guidance.",
    orgNoun: "Practice",
    clientNoun: "Client",
    clientNounPlural: "Clients",
    staffNoun: "Assistant",
    helperHint: "Capture goals and confirmed facts only.",
  },
  education: {
    id: "education",
    title: "School / college / academy",
    description: "Students and fresh graduates.",
    orgNoun: "Institution",
    clientNoun: "Student",
    clientNounPlural: "Students",
    staffNoun: "Staff",
    helperHint: "Education first. Work history optional.",
  },
  hr_desk: {
    id: "hr_desk",
    title: "HR / recruitment desk",
    description: "Internal HR or small recruitment teams.",
    orgNoun: "Desk",
    clientNoun: "Candidate",
    clientNounPlural: "Candidates",
    staffNoun: "Recruiter",
    helperHint: "Use only verified candidate information.",
  },
  freelancer: {
    id: "freelancer",
    title: "Freelancer / solo",
    description: "You make CVs for clients on your own.",
    orgNoun: "Studio",
    clientNoun: "Client",
    clientNounPlural: "Clients",
    staffNoun: "Collaborator",
    helperHint: "Keep it fast — name, role, then generate.",
  },
  other: {
    id: "other",
    title: "Other",
    description: "Any other professional CV workflow.",
    orgNoun: "Workspace",
    clientNoun: "Client",
    clientNounPlural: "Clients",
    staffNoun: "Team member",
    helperHint: "Simple steps. Honest details only.",
  },
};

export function isWorkspaceType(value: unknown): value is WorkspaceType {
  return typeof value === "string" && (WORKSPACE_TYPES as readonly string[]).includes(value);
}

export function parseWorkspaceType(value: unknown): WorkspaceType {
  return isWorkspaceType(value) ? value : "general";
}

export function getWorkspaceLabels(type?: string | null): WorkspaceLabels {
  return LABELS[parseWorkspaceType(type)];
}

export function workspaceTypeOptions() {
  return WORKSPACE_TYPES.map((id) => ({
    id,
    title: LABELS[id].title,
    description: LABELS[id].description,
  }));
}
