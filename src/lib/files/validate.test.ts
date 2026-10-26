import { describe, expect, it } from "vitest";
import { getExtension, validateUpload } from "@/lib/files/validate";

describe("file validation", () => {
  it("reads extensions", () => {
    expect(getExtension("cv.PDF")).toBe(".pdf");
    expect(getExtension("note.docx")).toBe(".docx");
  });

  it("rejects unsupported types", async () => {
    const blob = new Blob(["hello"], { type: "application/x-msdownload" });
    const result = await validateUpload(blob, "malware.exe");
    expect(result.ok).toBe(false);
  });

  it("accepts pdf by extension when mime empty", async () => {
    const blob = new Blob(["%PDF"], { type: "" });
    const result = await validateUpload(blob, "old-cv.pdf", "cv_file");
    expect(result.ok).toBe(true);
    expect(result.kind).toBe("pdf");
  });
});
