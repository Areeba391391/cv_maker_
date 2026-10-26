import { describe, expect, it } from "vitest";
import { buildInstantCv, canUseInstantPath } from "@/lib/cv/instant";

describe("instant CV build", () => {
  it("builds a CV from typed seed without AI", () => {
    const cv = buildInstantCv({
      targetPosition: "Salesman",
      seed: {
        fullName: "Ali Khan",
        phone: "03001234567",
        city: "Lahore",
        educationEntries: [{ degree: "Matric", institution: "Govt High School" }],
        experienceEntries: [
          {
            title: "Sales Associate",
            company: "ABC Mart",
            responsibilities: ["Handled customers", "Cash counter"],
          },
        ],
      },
    });
    expect(cv.personal.fullName).toBe("Ali Khan");
    expect(cv.targetPosition).toBe("Salesman");
    expect(cv.education[0]?.degree).toBe("Matric");
    expect(cv.experience[0]?.company).toBe("ABC Mart");
    expect(cv.professionalSummary).toBeTruthy();
    expect(cv.skills.length).toBeGreaterThan(0);
  });

  it("only allows instant path without heavy attachments", () => {
    expect(canUseInstantPath({})).toBe(true);
    expect(canUseInstantPath({ hasVoice: true })).toBe(false);
    expect(canUseInstantPath({ hasImages: true })).toBe(false);
    expect(canUseInstantPath({ hasCvFiles: true })).toBe(false);
  });

  it("applies LinkedIn skills and ATS template on instant build", () => {
    const cv = buildInstantCv({
      targetPosition: "Software Engineer",
      seed: {
        fullName: "Sara",
        skills: ["React", "TypeScript", "Node.js"],
      },
      templateId: "ats",
    });
    expect(cv.metadata.templateId).toBe("ats");
    expect(cv.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js"]));
  });
});
