import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { friendlyAuthError } from "@/lib/auth/errors";
import { WORKSPACE_TYPES, parseWorkspaceType } from "@/lib/workspace/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  shopName: z.string().min(1),
  workspaceType: z.enum(WORKSPACE_TYPES).optional().default("general"),
});

/**
 * Creates a workspace owner without sending a confirmation email.
 * Requires a valid SUPABASE_SERVICE_ROLE_KEY / sb_secret key.
 */
export async function POST(request: NextRequest) {
  try {
    const body = BodySchema.parse(await request.json());
    const workspaceType = parseWorkspaceType(body.workspaceType);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !service) {
      return NextResponse.json(
        { error: "Account service is not configured. Please contact support." },
        { status: 500 },
      );
    }

    if (
      !(service.startsWith("eyJ") || service.startsWith("sb_secret_")) ||
      service.length < 30
    ) {
      return NextResponse.json(
        {
          error: "Account service configuration is incomplete. Please contact support.",
        },
        { status: 500 },
      );
    }

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        shop_name: body.shopName,
        workspace_type: workspaceType,
      },
    });

    if (error) {
      return NextResponse.json({ error: friendlyAuthError(error) }, { status: 400 });
    }

    const userId = data.user?.id;
    if (userId) {
      const { data: existingEmp } = await admin
        .from("employees")
        .select("id, shop_id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingEmp) {
        const { data: shop, error: shopError } = await admin
          .from("shops")
          .insert({ name: body.shopName, workspace_type: workspaceType })
          .select("id")
          .single();

        if (shopError || !shop) {
          // Fallback if column not migrated yet
          const { data: shop2, error: shopError2 } = await admin
            .from("shops")
            .insert({ name: body.shopName })
            .select("id")
            .single();
          if (shopError2 || !shop2) {
            return NextResponse.json(
              { error: shopError?.message || shopError2?.message || "Failed to create workspace" },
              { status: 500 },
            );
          }
          const { error: empError } = await admin.from("employees").insert({
            id: userId,
            shop_id: shop2.id,
            full_name: body.fullName,
            email: body.email,
            role: "owner",
          });
          if (empError) {
            return NextResponse.json(
              { error: empError.message || "Failed to create profile" },
              { status: 500 },
            );
          }
        } else {
          const { error: empError } = await admin.from("employees").insert({
            id: userId,
            shop_id: shop.id,
            full_name: body.fullName,
            email: body.email,
            role: "owner",
          });
          if (empError) {
            return NextResponse.json(
              { error: empError.message || "Failed to create profile" },
              { status: 500 },
            );
          }
        }
      } else if (existingEmp.shop_id) {
        await admin
          .from("shops")
          .update({ workspace_type: workspaceType, name: body.shopName })
          .eq("id", existingEmp.shop_id);
      }
    }

    return NextResponse.json({
      ok: true,
      userId,
      message: "Account created. You can sign in now (no email confirmation needed).",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup details" }, { status: 400 });
    }
    return NextResponse.json({ error: friendlyAuthError(error) }, { status: 500 });
  }
}
