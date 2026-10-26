import { describe, expect, it } from "vitest";
import { emptyCvData } from "@/lib/cv/schema";
import {
  estimateContentWeight,
  resolveDensity,
  resolveLayout,
  likelyMultiPage,
} from "@/lib/cv/layout";
import { renderTemplate } from "@/lib/cv/templates";

describe("cv layout density", () => {
  it("uses spacious density and bumps font for thin CVs to fill one page", () => {
    const cv = emptyCvData("Salesman");
    cv.personal.fullName = "AA";
    cv.personal.city = "Islamabad";
    cv.professionalSummary = "Short objective for salesman role in Islamabad.";
    cv.skills = ["Sales", "Cash Handling"];
    cv.metadata.density = "auto";
    cv.metadata.fontScale = 1;
    expect(estimateContentWeight(cv)).toBeLessThan(7);
    expect(resolveDensity(cv)).toBe("spacious");
    const layout = resolveLayout(cv);
    expect(layout.density).toBe("spacious");
    expect(layout.fontScale).toBeGreaterThan(1);
    const html = renderTemplate(cv);
    expect(html).toContain("cv-spacious");
    expect(html).toContain("cv-body");
  });

  it("uses compact density for heavy CVs and prefers one page", () => {
    const cv = emptyCvData("Accountant");
    cv.personal.fullName = "Ali";
    cv.professionalSummary =
      "Experienced accountant seeking a new role with strong bookkeeping skills.";
    cv.experience = Array.from({ length: 6 }, (_, i) => ({
      id: `exp-${i}`,
      title: "Accountant",
      company: `Company ${i + 1}`,
      responsibilities: ["Books", "Excel", "Filing", "Vouchers"],
    }));
    cv.education = [
      { id: "e1", degree: "Matric" },
      { id: "e2", degree: "Intermediate" },
      { id: "e3", degree: "B.Com" },
    ];
    cv.skills = ["Excel", "Accounting", "Tax", "Communication", "MS Office"];
    cv.metadata.density = "auto";
    expect(resolveDensity(cv)).toBe("compact");
    const layout = resolveLayout(cv);
    expect(layout.density).toBe("compact");
    expect(layout.fontScale).toBeLessThanOrEqual(1);
  });

  it("respects manual fontScale floor when already larger", () => {
    const cv = emptyCvData("Driver");
    cv.personal.fullName = "Ahmed";
    cv.metadata.fontScale = 1.2;
    cv.metadata.density = "comfortable";
    const html = renderTemplate(cv);
    expect(html).toContain("--cv-font-scale: 1.2");
  });

  it("does not override fontScale when fontLocked (A+/A−)", () => {
    const cv = emptyCvData("Salesman");
    cv.personal.fullName = "AA";
    cv.professionalSummary = "Short.";
    cv.skills = ["Sales"];
    cv.metadata.density = "auto";
    cv.metadata.fontScale = 0.95;
    cv.metadata.fontLocked = true;
    expect(resolveLayout(cv).fontScale).toBe(0.95);
  });

  it("allows 2 pages when maxPages is 2", () => {
    const cv = emptyCvData("Maid");
    cv.personal.fullName = "Ali";
    cv.metadata.maxPages = 2;
    cv.metadata.density = "auto";
    expect(resolveLayout(cv).maxPages).toBe(2);
    const html = renderTemplate(cv);
    expect(html).toContain("cv-allow-pages");
  });

  it("does not repeat header contact inside Personal Information", () => {
    const cv = emptyCvData("Maid");
    cv.personal.fullName = "ali";
    cv.personal.phone = "03001234567";
    cv.personal.email = "a@gmail.com";
    cv.personal.city = "Sargodha";
    cv.personal.nationality = "Pakistani";
    const html = renderTemplate(cv);
    expect(html).toContain("Personal Information");
    expect(html).toContain("Nationality");
    expect(html).not.toMatch(/Personal Information[\s\S]*Full Name/);
    expect(html).not.toMatch(/Personal Information[\s\S]*Phone/);
    expect(html).not.toMatch(/cv-info-label">Email/);
  });

  it("renders certifications in a two-column grid", () => {
    const cv = emptyCvData("Developer");
    cv.personal.fullName = "Ali";
    cv.certifications = [
      { id: "c1", title: "Responsive Web Design", details: "FreeCodeCamp" },
      { id: "c2", title: "JavaScript Algorithms", details: "FreeCodeCamp" },
    ];
    const html = renderTemplate(cv);
    expect(html).toContain("cv-two-col");
    expect(html).toContain("Responsive Web Design");
    expect(html).toContain("JavaScript Algorithms");
  });

  it("applies custom margins and spacing when marginsLocked", () => {
    const cv = emptyCvData("Designer");
    cv.personal.fullName = "Sara";
    cv.professionalSummary = "Creative designer.";
    cv.metadata.marginsLocked = true;
    cv.metadata.margins = { top: 8, right: 10, bottom: 9, left: 11 };
    cv.metadata.paragraphSpacing = 12;
    cv.metadata.sectionGap = 18;
    cv.metadata.lineHeight = 1.7;
    const html = renderTemplate(cv);
    expect(html).toContain("cv-margins-locked");
    expect(html).toContain("--cv-m-top: 8mm");
    expect(html).toContain("--cv-m-left: 11mm");
    expect(html).toContain("padding: 8mm 10mm 9mm 11mm");
    expect(html).toContain("--cv-para-gap: 12px");
    expect(html).toContain("--cv-section-gap: 18px");
    expect(html).toContain("--cv-line-height: 1.7");
  });

  it("applies density margins as inline padding when not locked", () => {
    const cv = emptyCvData("Clerk");
    cv.personal.fullName = "Ali";
    cv.metadata.density = "compact";
    cv.metadata.marginsLocked = false;
    const html = renderTemplate(cv);
    expect(html).toContain("padding: 9mm 11mm 10mm 11mm");
  });

  it("respects sectionOrder in rendered HTML", () => {
    const cv = emptyCvData("Developer");
    cv.personal.fullName = "Ali";
    cv.professionalSummary = "Summary text.";
    cv.skills = ["TypeScript"];
    cv.education = [{ id: "e1", degree: "BS CS" }];
    cv.sectionOrder = [
      "skills",
      "summary",
      "education",
      "experience",
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
    const html = renderTemplate(cv);
    const skillsAt = html.indexOf(">Skills<");
    const summaryAt = html.indexOf("Career Objective");
    const eduAt = html.indexOf(">Education<");
    expect(skillsAt).toBeGreaterThan(-1);
    expect(summaryAt).toBeGreaterThan(skillsAt);
    expect(eduAt).toBeGreaterThan(summaryAt);
  });

  it("renders all template variants", () => {
    const cv = emptyCvData("Manager");
    cv.personal.fullName = "Omar";
    cv.skills = ["Leadership"];
    for (const id of [
      "professional",
      "modern",
      "classic",
      "executive",
      "minimal",
      "sidebar",
      "ats",
    ] as const) {
      cv.metadata.templateId = id;
      const html = renderTemplate(cv, { templateId: id });
      expect(html).toContain(`data-template="${id}"`);
      expect(html).toContain("Omar");
    }
  });

  it("applies letter and legal page sizes", () => {
    const cv = emptyCvData("Designer");
    cv.personal.fullName = "Sara";
    cv.metadata.pageSize = "letter";
    let html = renderTemplate(cv);
    expect(html).toContain('data-page-size="letter"');
    expect(html).toContain("--cv-page-w: 215.9mm");
    expect(html).toContain("--cv-page-h: 279.4mm");
    expect(html).toContain("@page { size: letter");

    cv.metadata.pageSize = "legal";
    html = renderTemplate(cv);
    expect(html).toContain('data-page-size="legal"');
    expect(html).toContain("--cv-page-h: 355.6mm");
    expect(html).toContain("@page { size: legal");
  });
});
