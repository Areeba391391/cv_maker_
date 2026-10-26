import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/documents/parse";
import { parseLinkedInText } from "@/lib/linkedin/parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") || "";
    let text = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const pasted = String(form.get("text") || "").trim();
      const file = form.get("file");

      const chunks: string[] = [];
      if (pasted) chunks.push(pasted);

      if (file && file instanceof File && file.size > 0) {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".pdf") && file.type !== "application/pdf") {
          return NextResponse.json(
            { error: "Upload a LinkedIn Save-to-PDF export (.pdf)" },
            { status: 400 },
          );
        }
        if (file.size > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "PDF must be under 8MB" }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const extracted = await extractTextFromPdf(buffer);
        if (extracted) chunks.push(extracted);
      }

      text = chunks.join("\n\n");
    } else {
      const body = (await request.json().catch(() => ({}))) as { text?: string };
      text = String(body.text || "").trim();
    }

    if (!text) {
      return NextResponse.json(
        { error: "Paste LinkedIn profile text or upload a Save-to-PDF export" },
        { status: 400 },
      );
    }

    const result = parseLinkedInText(text);
    return NextResponse.json({
      seed: result.seed,
      notes: result.notes,
      targetHint: result.targetHint,
      preferTemplate: "ats" as const,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LinkedIn import failed" },
      { status: 500 },
    );
  }
}
