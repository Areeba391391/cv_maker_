import { describe, expect, it } from "vitest";
import { buildDocx } from "@/lib/export/docx";
import { emptyCvData } from "@/lib/cv/schema";

describe("docx export", () => {
  it("produces a real docx buffer", async () => {
    const cv = emptyCvData("Accountant");
    cv.personal.fullName = "Ali Khan";
    cv.personal.phone = "03001234567";
    cv.experience = [
      {
        id: "1",
        title: "Accountant",
        company: "Local Shop",
        responsibilities: ["Managed daily accounts"],
      },
    ];
    cv.skills = ["Cash Handling"];
    const buffer = await buildDocx(cv);
    expect(buffer.length).toBeGreaterThan(1000);
    // DOCX files are ZIP archives starting with PK
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});
