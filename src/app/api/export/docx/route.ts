import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDocx } from "@/lib/export/docx";
import { CvDataSchema } from "@/lib/cv/schema";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CvDataSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid CV data" }, { status: 400 });
    }

    const buffer = await buildDocx(parsed.data);
    const name = (parsed.data.personal.fullName || "cv").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "DOCX export failed" },
      { status: 500 },
    );
  }
}
