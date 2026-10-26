import { describe, expect, it } from "vitest";
import { normalizeAiExtraction } from "@/lib/ai/pipeline";
import { z } from "zod";

describe("normalizeAiExtraction", () => {
  it("coerces phone numbers and string skills", () => {
    const normalized = normalizeAiExtraction({
      personal: { fullName: "Ali", phone: 3001234567, age: 22 },
      skills: "Customer Service, Cash Handling",
      languages: ["Urdu: Native", { name: "English", proficiency: "Basic" }],
      experience: [
        {
          title: "Salesman",
          company: "Shop",
          responsibilities: "Dealt with customers\nHandled cash",
        },
      ],
      projects: "College website",
    });

    const personal = (normalized as { personal: Record<string, string> }).personal;
    expect(personal.phone).toBe("3001234567");
    expect(personal.age).toBe("22");
    expect((normalized as { skills: string[] }).skills).toEqual([
      "Customer Service",
      "Cash Handling",
    ]);
    expect((normalized as { languages: Array<{ name: string }> }).languages[0].name).toBe("Urdu");
    expect(
      (normalized as { experience: Array<{ responsibilities: string[] }> }).experience[0]
        .responsibilities,
    ).toEqual(["Dealt with customers", "Handled cash"]);
    expect((normalized as { projects: Array<{ title: string }> }).projects[0].title).toBe(
      "College website",
    );
  });

  it("returns empty-safe object for garbage input", () => {
    const normalized = normalizeAiExtraction("not-json");
    expect(normalized).toMatchObject({ skills: [], education: [], experience: [] });
  });
});
