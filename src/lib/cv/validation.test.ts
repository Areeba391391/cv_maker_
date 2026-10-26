import { describe, expect, it } from "vitest";
import { emptyCvData } from "@/lib/cv/schema";
import {
  detectFieldConflicts,
  hasSectionContent,
  looksLikeSuspiciousEmail,
  pruneEmptySections,
  validateCvFacts,
} from "@/lib/cv/validation";
import { heuristicExtract } from "@/lib/ai/pipeline";
import { renderTemplate } from "@/lib/cv/templates";

describe("email validation", () => {
  it("flags suspicious tlds", () => {
    expect(looksLikeSuspiciousEmail("example@gmail.con")).toBe(true);
    expect(looksLikeSuspiciousEmail("ali@gmail.com")).toBe(false);
  });
});

describe("missing sections", () => {
  it("omits empty languages and certifications", () => {
    const cv = pruneEmptySections(emptyCvData("Accountant"));
    expect(hasSectionContent(cv, "languages")).toBe(false);
    expect(hasSectionContent(cv, "certifications")).toBe(false);
    expect(hasSectionContent(cv, "experience")).toBe(false);
  });
});

describe("conflict detection", () => {
  it("flags differing phones", () => {
    const warnings = detectFieldConflicts([
      { source: "pdf", phone: "03001234567" },
      { source: "voice", phone: "03111234567" },
    ]);
    expect(warnings.some((w) => w.field === "personal.phone")).toBe(true);
  });
});

describe("roman urdu heuristic extraction", () => {
  it("extracts name and electrician work", () => {
    const text =
      "mera naam Ali hy aur maine 2 saal electrician ka kam kia hai solar installation bhi krta hun";
    const cv = heuristicExtract("Electrician", text);
    expect(cv.personal.fullName?.toLowerCase()).toContain("ali");
    expect(cv.experience.some((e) => e.title?.toLowerCase().includes("electrician"))).toBe(true);
    expect(cv.skills.some((s) => /solar/i.test(s))).toBe(true);
  });

  it("extracts autocad certificate when provided", () => {
    const cv = heuristicExtract("Designer", "Mere paas AutoCAD ka certificate bhi hai.");
    expect(cv.certifications.some((c) => /autocad/i.test(c.title))).toBe(true);
  });

  it("does not invent excel from text alone when experience already yields no tool list — but may keep derived experience skills only", () => {
    const cv = heuristicExtract(
      "Accountant",
      "mera naam Ali hy main Sargodha ka rehne wala hun B.Com kiya hai aur 3 saal accountant ka kam kia",
    );
    // Has B.Com education from text — never invent extra schooling
    expect(cv.education.some((e) => /b\.?com/i.test(e.degree || ""))).toBe(true);
    expect(cv.education.every((e) => !/matric|intermediate/i.test(e.degree || ""))).toBe(true);
  });

  it("does not invent schooling when not provided", () => {
    const cv = heuristicExtract(
      "Salesman",
      "My name is Ali. I worked as a salesman for three years. I deal with customers and handle cash.",
    );
    expect(cv.education.length).toBe(0);
    expect(cv.skills).toContain("Customer Service");
    expect(cv.skills).toContain("Cash Handling");
  });

  it("adds position-based skills when no experience or skills given", () => {
    const cv = heuristicExtract("Driver", "mera naam Ahmed hy phone 03001234567 Sargodha");
    expect(cv.experience.length).toBe(0);
    expect(cv.education.length).toBe(0);
    expect(cv.skills.length).toBeGreaterThan(0);
    expect(cv.skills.some((s) => /driv/i.test(s))).toBe(true);
    expect(cv.warnings.some((w) => w.field === "skills")).toBe(true);
  });
});

describe("english salesman skills derivation", () => {
  it("derives cash and customer service from evidence", () => {
    const text =
      "My name is Ali Khan. I worked as a salesman for three years in a garments shop. I deal with customers and handle cash.";
    const cv = heuristicExtract("Salesman", text);
    expect(cv.skills).toContain("Customer Service");
    expect(cv.skills).toContain("Cash Handling");
  });
});

describe("template rendering", () => {
  it("does not render empty certifications heading", () => {
    const cv = emptyCvData("Nurse");
    cv.personal.fullName = "Sara Ahmed";
    const html = renderTemplate(cv, { templateId: "professional" });
    expect(html).toContain("Sara Ahmed");
    expect(html.toLowerCase()).not.toContain("certifications");
  });

  it("omits photo placeholder when no photo", () => {
    const cv = emptyCvData("Driver");
    cv.personal.fullName = "Bilal";
    const html = renderTemplate(cv);
    expect(html).not.toContain('class="cv-photo"');
    expect(html).not.toContain("<img");
  });
});

describe("validateCvFacts", () => {
  it("requires target position", () => {
    const cv = emptyCvData("Temp");
    cv.targetPosition = "";
    const warnings = validateCvFacts(cv);
    expect(warnings.some((w) => w.field === "targetPosition")).toBe(true);
  });
});
