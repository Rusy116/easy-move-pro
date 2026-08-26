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

/** Raw bearer token on the current request, or null. Never logged. */
export function currentBuyerToken(): string | null {
  try {
    const request = getRequest();
    const header = request?.headers?.get("authorization");
    const token = header?.replace(/^Bearer\s+/i, "").trim();
    return token || null;
  } catch {
    return null;
  }
}

/** Verifies a buyer access token server-side and returns its user id. */
export async function resolveBuyerUserIdFromToken(
  token: string | null,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return null;
    return data.user?.id ?? null;
  } catch (error) {
    console.error("[store] buyer identity resolve failed:", (error as Error)?.message);
    return null;
  }
}

/** Returns the signed-in user's id, or null for a genuine guest checkout. */
export async function resolveBuyerUserId(): Promise<string | null> {
  return resolveBuyerUserIdFromToken(currentBuyerToken());
}
