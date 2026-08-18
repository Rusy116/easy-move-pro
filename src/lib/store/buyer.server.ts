// ---------------------------------------------------------------------------
// Digital store — optional buyer identity.
//
// Store checkout is deliberately open to guests, so it can't use
// requireSupabaseAuth (that throws a 401). Instead we *optionally* read the
// bearer token the client middleware already attaches to every server-fn call
// and verify it, so a signed-in buyer's order is linked to their account at
// purchase time instead of waiting for fn_claim_my_records at next sign-in.
// ---------------------------------------------------------------------------
import { getRequest } from "@tanstack/react-start/server";

/** Returns the signed-in user's id, or null for a genuine guest checkout. */
export async function resolveBuyerUserId(): Promise<string | null> {
  try {
    const request = getRequest();
    const header = request?.headers?.get("authorization");
    const token = header?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return null;
    return data.user?.id ?? null;
  } catch (error) {
    console.error("[store] buyer identity resolve failed:", error);
    return null;
  }
}
