import { describe, expect, it } from "vitest";
import { defaultSkillsForPosition, ensurePositionSkills } from "@/lib/cv/default-skills";

describe("default skills for position", () => {
  it("returns driver basics", () => {
    const skills = defaultSkillsForPosition("Driver");
    expect(skills.some((s) => /driv/i.test(s))).toBe(true);
  });

  it("fuzzy matches junior accountant", () => {
    const skills = defaultSkillsForPosition("Junior Accountant");
    expect(skills.some((s) => /account|excel|cash/i.test(s))).toBe(true);
  });

  it("does not overwrite existing skills", () => {
    const result = ensurePositionSkills({
      targetPosition: "Driver",
      skills: ["Forklift Operation"],
    });
    expect(result.filledFromPosition).toBe(false);
    expect(result.skills).toEqual(["Forklift Operation"]);
  });

  it("fills when empty", () => {
    const result = ensurePositionSkills({
      targetPosition: "Cashier",
      skills: [],
    });
    expect(result.filledFromPosition).toBe(true);
    expect(result.skills.length).toBeGreaterThan(0);
  });
});
