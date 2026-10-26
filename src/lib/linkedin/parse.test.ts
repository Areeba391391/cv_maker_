import { describe, expect, it } from "vitest";
import { parseLinkedInText } from "@/lib/linkedin/parse";

const SAMPLE = `
Ali Hassan
Software Engineer
Lahore, Punjab, Pakistan
ali.hassan@email.com
+92 300 1234567

About
Results-driven software engineer with 5 years building web apps.

Experience
Software Engineer at Acme Corp
Jan 2020 - Present
Lahore, Pakistan
• Built React dashboards for sales teams
• Improved API latency by 40%

Junior Developer at Startup Labs
Jun 2018 - Dec 2019
• Maintained PHP backends

Education
Bachelor of Science Computer Science
University of Punjab
2014 - 2018

Skills
JavaScript · TypeScript · React · Node.js · SQL
`;

describe("parseLinkedInText", () => {
  it("extracts name, contact, experience, education, and skills", () => {
    const { seed, targetHint, notes } = parseLinkedInText(SAMPLE);

    expect(seed.fullName).toBe("Ali Hassan");
    expect(seed.email).toMatch(/ali\.hassan@email\.com/i);
    expect(seed.phone).toBeTruthy();
    expect(seed.city).toMatch(/Lahore/i);
    expect(seed.about).toMatch(/software engineer/i);
    expect(targetHint).toMatch(/Software Engineer/i);

    expect(seed.experienceEntries.length).toBeGreaterThanOrEqual(1);
    expect(seed.experienceEntries[0].title).toMatch(/Software Engineer/i);
    expect(seed.experienceEntries[0].company).toMatch(/Acme/i);
    expect(seed.experienceEntries[0].duties).toMatch(/React/i);

    expect(seed.educationEntries.length).toBeGreaterThanOrEqual(1);
    expect(
      `${seed.educationEntries[0].degree} ${seed.educationEntries[0].institution}`,
    ).toMatch(/Bachelor|Punjab/i);

    expect(seed.skills).toEqual(
      expect.arrayContaining(["JavaScript", "TypeScript", "React"]),
    );
    expect(notes.some((n) => /ATS/i.test(n))).toBe(true);
  });

  it("returns a helpful note for empty input", () => {
    const { seed, notes } = parseLinkedInText("   ");
    expect(seed.experienceEntries).toEqual([]);
    expect(notes[0]).toMatch(/No text/i);
  });

  it("parses experience-only paste without crashing", () => {
    const { seed } = parseLinkedInText(`
Experience
Cashier at City Mart
Mar 2021 - Present
• Handled daily cash and customers
`);
    expect(seed.experienceEntries.length).toBe(1);
    expect(seed.experienceEntries[0].title).toMatch(/Cashier/i);
    expect(seed.experienceEntries[0].company).toMatch(/City Mart/i);
  });
});
