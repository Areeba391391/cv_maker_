import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployeeForUser } from "@/lib/auth/ensure-employee";
import { CvDataSchema, emptyCvData } from "@/lib/cv/schema";
import { CvWorkspace } from "@/components/cv/cv-workspace";
import { Button } from "@/components/ui/button";

export default async function CvDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    await ensureEmployeeForUser(user);
  } catch {
    redirect("/login");
  }

  let cvId = id;
  let customerId = "";
  let rawData: unknown = null;

  const { data: rpcCv } = await supabase.rpc("get_my_cv", { p_cv_id: id });
  if (rpcCv && typeof rpcCv === "object") {
    const row = rpcCv as Record<string, unknown>;
    cvId = String(row.id || id);
    customerId = String(row.customer_id || "");
    rawData = row.current_data;
  } else {
    const { data: cv } = await supabase
      .from("cvs")
      .select("id, customer_id, current_data")
      .eq("id", id)
      .maybeSingle();

    if (!cv) {
      return (
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-[var(--ink)]">CV not found</h1>
          <p className="text-stone-600">
            This document is unavailable. Return to the dashboard and open it from recent activity.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      );
    }
    cvId = cv.id;
    customerId = cv.customer_id;
    rawData = cv.current_data;
  }

  const parsed = CvDataSchema.safeParse(rawData);
  let initialData = parsed.success
    ? parsed.data
    : emptyCvData(
        typeof rawData === "object" &&
          rawData &&
          "targetPosition" in rawData &&
          typeof (rawData as { targetPosition?: unknown }).targetPosition === "string"
          ? String((rawData as { targetPosition: string }).targetPosition)
          : "Position",
      );

  if (!parsed.success && rawData && typeof rawData === "object") {
    // Best-effort merge so the employee can still edit/export
    initialData = {
      ...initialData,
      ...(rawData as object),
      targetPosition:
        (rawData as { targetPosition?: string }).targetPosition || initialData.targetPosition,
      personal: {
        ...initialData.personal,
        ...((rawData as { personal?: object }).personal || {}),
      },
      warnings: [
        ...(initialData.warnings || []),
        {
          field: "data",
          message: "Some CV fields needed repair after load. Please review before printing.",
          severity: "warning" as const,
        },
      ],
    };
    const repaired = CvDataSchema.safeParse(initialData);
    if (repaired.success) initialData = repaired.data;
  }

  if (!parsed.success && !initialData.personal.fullName && !initialData.experience.length) {
    notFound();
  }

  const { data: versions } = await supabase
    .from("cv_versions")
    .select("id, version_number, created_at, notes")
    .eq("cv_id", cvId)
    .order("version_number", { ascending: false });

  return (
    <CvWorkspace
      cvId={cvId}
      customerId={customerId}
      initialData={initialData}
      versions={versions || []}
    />
  );
}
