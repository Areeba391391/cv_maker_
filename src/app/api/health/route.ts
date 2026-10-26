import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ai-cv-maker",
    time: new Date().toISOString(),
  });
}
