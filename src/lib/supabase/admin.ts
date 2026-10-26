import { createClient } from "@supabase/supabase-js";

function cleanKey(v: string) {
  return v.trim().replace(/^["'`]|["'`]$/g, "");
}

/**
 * Privileged server-only client. NEVER import this into client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!(key.startsWith("eyJ") || key.startsWith("sb_secret_")) || key.length < 30) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY looks truncated. Paste the FULL secret/service_role key in .env.local and restart.",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
