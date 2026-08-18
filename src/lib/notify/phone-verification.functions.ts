// ---------------------------------------------------------------------------
// Phone verification — request + confirm a one-time SMS code.
//
// Authenticated only: a code is always sent to the number the signed-in user
// supplies, and confirmation writes profiles.phone / phone_verified_at for
// that same user. Codes are stored hashed, expire in 10 minutes, allow 5
// attempts and are rate limited per user.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

async function hashCode(phone: string, code: string): Promise<string> {
  const secret =
    process.env["DOWNLOAD_SIGNING_SECRET"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${phone}:${code}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const requestPhoneVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string }) => ({ phone: String(d.phone ?? "").slice(0, 30) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: string }> => {
    const { toE164, sendSms } = await import("./sms.server");
    const phone = toE164(data.phone);
    if (!phone) return { ok: false, reason: "invalid_phone" };

    const { admin } = await import("@/lib/store/orders.server");
    const db = (await admin()) as any;
    const userId = context.userId;

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("phone_verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_SENDS_PER_HOUR) return { ok: false, reason: "rate_limited" };

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const { error } = await db.from("phone_verifications").insert({
      user_id: userId,
      phone,
      code_hash: await hashCode(phone, code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (error) return { ok: false, reason: "storage_failed" };

    const result = await sendSms({
      template: "phone-verification",
      to: phone,
      data: { code },
      refType: "user",
      refId: userId,
      userId,
    });
    return result.sent ? { ok: true } : { ok: false, reason: result.reason };
  });

export const confirmPhoneVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string; code: string }) => ({
    phone: String(d.phone ?? "").slice(0, 30),
    code: String(d.code ?? "").replace(/\D/g, "").slice(0, 6),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: string }> => {
    const { toE164 } = await import("./sms.server");
    const phone = toE164(data.phone);
    if (!phone || data.code.length !== 6) return { ok: false, reason: "invalid" };

    const { admin } = await import("@/lib/store/orders.server");
    const db = (await admin()) as any;
    const userId = context.userId;

    const { data: row } = await db
      .from("phone_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("phone", phone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return { ok: false, reason: "not_found" };
    if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
    if (Number(row.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

    const expected = await hashCode(phone, data.code);
    if (expected !== row.code_hash) {
      await db
        .from("phone_verifications")
        .update({ attempts: Number(row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false, reason: "incorrect" };
    }

    const now = new Date().toISOString();
    await db.from("phone_verifications").update({ verified_at: now }).eq("id", row.id);
    await db.from("profiles").update({ phone, phone_verified_at: now }).eq("id", userId);
    return { ok: true };
  });
