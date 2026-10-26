import { createServiceClient } from "@/lib/supabase/admin";

export type PublicReview = {
  id: string;
  name: string;
  workspace_name: string | null;
  rating: number;
  message: string;
  created_at: string;
};

/** Approved reviews for marketing — from DB only. */
export async function getApprovedReviews(limit = 6): Promise<PublicReview[]> {
  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("site_reviews")
      .select("id, name, workspace_name, rating, message, created_at")
      .not("approved_at", "is", null)
      .is("archived_at", null)
      .order("approved_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getApprovedReviews", error.message);
      return [];
    }
    return (data || []) as PublicReview[];
  } catch (e) {
    console.error("getApprovedReviews", e);
    return [];
  }
}
