import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/ensure-employee";
import { getWriteClient } from "@/lib/supabase/write";
import { CvDataSchema } from "@/lib/cv/schema";
import { pruneEmptySections, validateCvFacts } from "@/lib/cv/validation";

/** Instant create: client already built the CV — just persist (no AI). */
export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const auth = await requireEmployee();
    if ("error" in auth && auth.error) return auth.error;
    const { supabase, employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
      employee: { id: string; shop_id: string };
    };

    const body = await request.json();
    const parsed = CvDataSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid CV data" }, { status: 400 });
    }

    // Client already built + validated — light prune only (keep instant path fast)
    const data = pruneEmptySections(parsed.data);
    const customerIdIn = (body.customerId as string | undefined) || undefined;

    const fullName = data.personal.fullName || null;
    const phone = data.personal.phone || null;
    const email = data.personal.email || null;

    const { data: saved, error: saveError } = await supabase.rpc("save_generated_cv", {
      p_shop_id: employee.shop_id,
      p_target_position: data.targetPosition,
      p_template_id: data.metadata.templateId || "professional",
      p_cv_data: data,
      p_customer_id: customerIdIn || null,
      p_full_name: fullName,
      p_phone: phone,
      p_email: email,
      p_city: data.personal.city || null,
    });

    if (!saveError && saved) {
      const payload = saved as Record<string, unknown>;
      const savedCvId = String(payload.cvId || payload.cvid || "");
      const savedCustomerId = String(payload.customerId || payload.customerid || "");
      if (savedCvId) {
        return NextResponse.json({
          cvId: savedCvId,
          customerId: savedCustomerId || undefined,
          cv: data,
          mode: "instant",
          elapsedMs: Date.now() - started,
        });
      }
    }

    const { client: db } = getWriteClient(supabase);
    let customerId = customerIdIn;

    if (!customerId) {
      const { data: customer, error: customerError } = await db
        .from("customers")
        .insert({
          shop_id: employee.shop_id,
          full_name: fullName,
          phone,
          email,
          city: data.personal.city || null,
          created_by: employee.id,
        })
        .select("id")
        .single();
      if (customerError) {
        return NextResponse.json(
          { error: "Could not save customer record. Please try again." },
          { status: 500 },
        );
      }
      customerId = customer.id;
    } else {
      await db
        .from("customers")
        .update({
          full_name: fullName,
          phone,
          email,
          city: data.personal.city || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId)
        .eq("shop_id", employee.shop_id);
    }

    const { data: cvRow, error: cvError } = await db
      .from("cvs")
      .insert({
        shop_id: employee.shop_id,
        customer_id: customerId,
        target_position: data.targetPosition,
        template_id: data.metadata.templateId || "professional",
        current_data: data,
        status: "ready",
        created_by: employee.id,
      })
      .select("id")
      .single();

    if (cvError || !cvRow) {
      return NextResponse.json(
        { error: `Failed to save CV: ${cvError?.message || "unknown error"}` },
        { status: 500 },
      );
    }

    void db.from("cv_versions").insert({
      cv_id: cvRow.id,
      shop_id: employee.shop_id,
      version_number: 1,
      data,
      template_id: data.metadata.templateId || "professional",
      notes: "Instant generation",
      created_by: employee.id,
    });

    return NextResponse.json({
      cvId: cvRow.id,
      customerId,
      cv: data,
      mode: "instant",
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireEmployee();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
    supabase: Awaited<ReturnType<typeof createClient>>;
    employee: { shop_id: string };
  };

  const limit = Number(request.nextUrl.searchParams.get("limit") || 20);
  const { data, error } = await supabase
    .from("cvs")
    .select("id, target_position, template_id, status, updated_at, customers(id, full_name, phone, email)")
    .eq("shop_id", employee.shop_id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cvs: data });
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireEmployee();
    if ("error" in auth && auth.error) return auth.error;
    const { supabase, employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
      employee: { id: string; shop_id: string };
    };

    const body = await request.json();
    const cvId = String(body.cvId || "").trim();
    if (!cvId) return NextResponse.json({ error: "cvId required" }, { status: 400 });

    const parsed = CvDataSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid CV data" }, { status: 400 });
    }

    let data = pruneEmptySections(parsed.data);
    data = { ...data, warnings: validateCvFacts(data) };
    const createVersion = Boolean(body.createVersion);

    // Preferred path: security-definer RPC (no table GRANT / RLS pain)
    const { data: rpcResult, error: rpcError } = await supabase.rpc("update_my_cv", {
      p_cv_id: cvId,
      p_cv_data: data,
      p_create_version: createVersion,
      p_notes: createVersion ? body.notes || "Manual save version" : null,
    });

    if (!rpcError && rpcResult) {
      return NextResponse.json({ ok: true, data });
    }

    // Fallback if RPC not deployed yet — service role + ownership check
    if (rpcError && !/function .*update_my_cv|could not find/i.test(rpcError.message)) {
      const msg = rpcError.message || "Save failed";
      if (/not found/i.test(msg)) {
        return NextResponse.json({ error: "CV not found" }, { status: 404 });
      }
      if (/permission denied/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Database permission error. Run supabase/FIX_PERMISSIONS.sql in Supabase SQL Editor, then retry Save.",
          },
          { status: 500 },
        );
      }
      // fall through to table update only when RPC missing; otherwise return
      if (!/does not exist|schema cache/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    const { client: db } = getWriteClient(supabase);
    const { data: existing, error: findError } = await db
      .from("cvs")
      .select("id")
      .eq("id", cvId)
      .eq("shop_id", employee.shop_id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        {
          error: /permission denied/i.test(findError.message)
            ? "Database permission error. Run supabase/FIX_PERMISSIONS.sql in Supabase SQL Editor, then retry Save."
            : findError.message,
        },
        { status: 500 },
      );
    }
    if (!existing) return NextResponse.json({ error: "CV not found" }, { status: 404 });

    const { error } = await db
      .from("cvs")
      .update({
        current_data: data,
        target_position: data.targetPosition,
        template_id: data.metadata.templateId || "professional",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cvId)
      .eq("shop_id", employee.shop_id);

    if (error) {
      return NextResponse.json(
        {
          error: /permission denied/i.test(error.message)
            ? "Database permission error. Run supabase/FIX_PERMISSIONS.sql in Supabase SQL Editor, then retry Save."
            : error.message,
        },
        { status: 500 },
      );
    }

    if (createVersion) {
      const { data: versions } = await db
        .from("cv_versions")
        .select("version_number")
        .eq("cv_id", cvId)
        .order("version_number", { ascending: false })
        .limit(1);
      const next = (versions?.[0]?.version_number || 0) + 1;
      await db.from("cv_versions").insert({
        cv_id: cvId,
        shop_id: employee.shop_id,
        version_number: next,
        data,
        template_id: data.metadata.templateId || "professional",
        notes: body.notes || `Version ${next}`,
        created_by: employee.id,
      });
    }

    if (body.customerId) {
      await db
        .from("customers")
        .update({
          full_name: data.personal.fullName || null,
          phone: data.personal.phone || null,
          email: data.personal.email || null,
          city: data.personal.city || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.customerId)
        .eq("shop_id", employee.shop_id);
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 },
    );
  }
}
