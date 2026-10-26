import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Prefer service-role client for trusted server writes after the user was authorized.
 * Falls back to the user-scoped client when service key is unavailable.
 */
export function getWriteClient(userClient: SupabaseClient): {
  client: SupabaseClient;
  mode: "service" | "user";
} {
  try {
    return { client: createServiceClient(), mode: "service" };
  } catch {
    return { client: userClient, mode: "user" };
  }
}
