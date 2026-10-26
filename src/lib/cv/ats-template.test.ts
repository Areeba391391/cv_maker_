import { describe, expect, it } from "vitest";
import { emptyCvData } from "@/lib/cv/schema";
import { renderTemplate, TEMPLATES } from "@/lib/cv/templates";

describe("ATS template", () => {
  it("is registered with ATS-safe description", () => {
    const ats = TEMPLATES.find((t) => t.id === "ats");
    expect(ats).toBeTruthy();
    expect(ats?.description).toMatch(/ATS/i);
  });

  it("renders data-template=ats with linear section titles", () => {
    const cv = emptyCvData("Sales Associate");
    cv.personal.fullName = "Sara Khan";
    cv.personal.email = "sara@example.com";
    cv.personal.phone = "+92 300 0000000";
    cv.professionalSummary = "Retail professional seeking a sales associate role.";
    cv.experience = [
      {
        id: "exp-1",
        title: "Sales Associate",
        company: "Retail Co",
        startDate: "2022",
        endDate: "Present",
        responsibilities: ["Helped customers", "Managed inventory"],
      },
    ];
    cv.education = [
      {
        id: "edu-1",
        degree: "Intermediate",
        institution: "City College",
      },
    ];
    cv.skills = ["Sales", "Communication", "POS"];
    cv.metadata.templateId = "ats";

    const html = renderTemplate(cv, { templateId: "ats" });

    expect(html).toContain('data-template="ats"');
    expect(html).toContain("cv-page ats");
    expect(html).toContain(">Summary<");
    expect(html).toContain(">Experience<");
    expect(html).toContain(">Education<");
    expect(html).toContain(">Skills<");
    expect(html).toContain("Sara Khan");
    expect(html).toContain("ats-header");
    expect(html).not.toContain("Career Objective");
    expect(html).not.toContain('class="cv-sidebar-shell"');
  });
});
