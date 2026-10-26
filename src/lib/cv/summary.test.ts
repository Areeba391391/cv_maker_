import { describe, expect, it } from "vitest";
import { emptyCvData } from "@/lib/cv/schema";
import { buildProfessionalSummary, ensureProfessionalSummary } from "@/lib/cv/summary";
import { heuristicExtract } from "@/lib/ai/pipeline";
import { enrichShopCv, isJunkSkill, sanitizeSkills } from "@/lib/cv/enrich";
import { hasSectionContent } from "@/lib/cv/validation";
import { renderTemplate } from "@/lib/cv/templates";

describe("professional summary", () => {
  it("builds a strong salesman objective for minimal details", () => {
    const cv = emptyCvData("Salesman");
    cv.personal.fullName = "AA";
    cv.personal.phone = "000";
    cv.personal.city = "Islamabad";
    cv.personal.email = "a@gmail.com";
    const summary = buildProfessionalSummary(cv);
    expect(summary.toLowerCase()).toContain("salesman");
    expect(summary.toLowerCase()).toContain("islamabad");
    expect(summary.toLowerCase()).toContain("aa");
    expect(summary.toLowerCase()).toContain("customer");
    expect(summary.length).toBeGreaterThan(120);
    expect(summary.toLowerCase()).not.toContain("years of experience at");
  });

  it("builds a complete shop CV from thin salesman input without references", () => {
    const cv = heuristicExtract(
      "Salesman",
      "name: aa, phone number: 000, city: islamabad, gmail: a@gmail.com",
    );
    expect(cv.personal.fullName?.toLowerCase()).toBe("aa");
    expect(cv.personal.phone).toBe("000");
    expect(cv.personal.city?.toLowerCase()).toBe("islamabad");
    expect(cv.personal.email).toBe("a@gmail.com");
    expect(cv.experience.length).toBe(0);
    expect(cv.professionalSummary?.length).toBeGreaterThan(100);
    expect(cv.professionalSummary?.toLowerCase()).toContain("salesman");
    expect(hasSectionContent(cv, "summary")).toBe(true);
    expect(cv.skills.length).toBeGreaterThanOrEqual(5);
    expect(cv.languages.some((l) => /urdu/i.test(l.name))).toBe(true);
    expect(cv.languages.some((l) => /english/i.test(l.name))).toBe(true);
    expect(cv.achievements.length).toBeGreaterThan(0);
    expect(cv.references.length).toBe(0);

    const html = renderTemplate(cv, { templateId: "professional" });
    expect(html).toContain("Career Objective");
    expect(html).toContain("Key Strengths");
    expect(html).toContain("Personal Information");
    expect(html).toContain("cv-skills");
    expect(html).not.toContain("cv-skill\"");
    expect(html.toLowerCase()).not.toContain("references");
    expect(html.toLowerCase()).toContain("islamabad");
  });

  it("does not invent experience from target job wording alone", () => {
    const cv = heuristicExtract(
      "Salesman",
      "cv for salesman, name: aa, phone: 000, city: islamabad, gmail: a@gmail.com",
    );
    expect(cv.experience.length).toBe(0);
    expect(cv.professionalSummary?.toLowerCase()).toContain("salesman");
    expect(cv.professionalSummary?.toLowerCase()).not.toContain("with practical experience as");
  });

  it("does not invent employer names in summary", () => {
    const cv = emptyCvData("Driver");
    cv.personal.fullName = "Ahmed";
    const summary = buildProfessionalSummary(ensureProfessionalSummary(cv));
    expect(summary.toLowerCase()).not.toContain("worked at");
    expect(summary.toLowerCase()).toContain("driver");
    expect(summary.toLowerCase()).toContain("ahmed");
  });
});

describe("skill sanitization", () => {
  it("rejects prompt-leak junk skills", () => {
    expect(
      isJunkSkill(
        "BASIC practical skills suitable for the target position: communication, customer service",
      ),
    ).toBe(true);
    const cleaned = sanitizeSkills(
      [
        "BASIC practical skills suitable for the target position: communication, customer service, teamwork",
      ],
      "Salesman",
    );
    expect(cleaned.replaced).toBe(true);
    expect(cleaned.skills.some((s) => /customer/i.test(s))).toBe(true);
  });

  it("applies seed personal fields", () => {
    const base = emptyCvData("Salesman");
    const cv = enrichShopCv(base, {
      fullName: "AA",
      phone: "000",
      city: "Islamabad",
      email: "a@gmail.com",
    });
    expect(cv.personal.fullName).toBe("AA");
    expect(cv.personal.phone).toBe("000");
    expect(cv.references.length).toBe(0);
  });
});
