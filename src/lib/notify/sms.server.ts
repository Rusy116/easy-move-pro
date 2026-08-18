// ---------------------------------------------------------------------------
// Centralized transactional SMS service (Twilio via the Lovable gateway).
//
// Server-only: credentials live in TWILIO_API_KEY / LOVABLE_API_KEY and are
// never referenced from client code. Every call is templated — callers pick a
// template id and pass data, they can never pass raw provider parameters.
//
// Transactional only. No marketing sends.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { logDelivery } from "./deliveries.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export type SmsTemplate =
  | "phone-verification"
  | "order-paid"
  | "quote-received"
  | "quote-status"
  | "job-assigned"
  | "security-alert";

type Data = Record<string, string | number | null | undefined>;

const BODIES: Record<SmsTemplate, (d: Data) => string> = {
  "phone-verification": (d) =>
    `Easy Move Pro: your verification code is ${d["code"]}. It expires in 10 minutes. Never share this code.`,
  "order-paid": (d) =>
    `Easy Move Pro: payment confirmed for order ${d["orderNumber"]}. Your download link was emailed to you.`,
  "quote-received": (d) =>
    `Easy Move Pro: we received your moving request ${d["quoteNumber"]}. Estimate: ${d["amountLabel"]}. We'll text you when a mover is assigned.`,
  "quote-status": (d) =>
    `Easy Move Pro: update on request ${d["quoteNumber"]} — ${d["statusLabel"]}.`,
  "job-assigned": (d) =>
    `Easy Move Pro: new job assigned to your company (${d["reference"]}). Open your dashboard to review it.`,
  "security-alert": (d) =>
    `Easy Move Pro security notice: ${d["message"]}. If this wasn't you, reset your password immediately.`,
};

export interface SmsResult {
  sent: boolean;
  reason?: string;
  sid?: string;
}

/** Normalizes to E.164; returns null when the number can't be trusted. */
export function toE164(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function config(): { key: string; lovable: string; from: string } | null {
  const key = process.env["TWILIO_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  const from = process.env["TWILIO_FROM_NUMBER"] ?? process.env["TWILIO_MESSAGING_SERVICE_SID"];
  if (!key || !lovable || !from) return null;
  return { key, lovable, from };
}

/**
 * Sends one transactional SMS. Returns a result object instead of throwing so
 * callers (webhooks, fulfilment) never fail a payment over a text message.
 */
export async function sendSms(input: {
  template: SmsTemplate;
  to: unknown;
  data?: Data;
  refType?: string | null;
  refId?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
}): Promise<SmsResult> {
  const to = toE164(input.to);
  if (!to) {
    await logDelivery({
      channel: "sms",
      template: input.template,
      recipient: String(input.to ?? ""),
      status: "skipped",
      reason: "invalid_phone",
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
    });
    return { sent: false, reason: "invalid_phone" };
  }

  const cfg = config();
  if (!cfg) {
    console.warn(`[sms] '${input.template}' not sent: SMS sender not configured`);
    await logDelivery({
      channel: "sms",
      template: input.template,
      recipient: to,
      status: "skipped",
      reason: "sms_not_configured",
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
    });
    return { sent: false, reason: "sms_not_configured" };
  }

  const body = BODIES[input.template](input.data ?? {});
  const params = new URLSearchParams({ To: to, Body: body });
  if (cfg.from.startsWith("MG")) params.set("MessagingServiceSid", cfg.from);
  else params.set("From", cfg.from);

  try {
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.lovable}`,
        "X-Connection-Api-Key": cfg.key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[sms] gateway failed [${response.status}]: ${errorBody}`);
      await logDelivery({
        channel: "sms",
        template: input.template,
        recipient: to,
        status: "failed",
        reason: `${response.status}: ${errorBody.slice(0, 300)}`,
        refType: input.refType,
        refId: input.refId,
        userId: input.userId,
      });
      return { sent: false, reason: `provider_error_${response.status}` };
    }

    const payload = (await response.json()) as { sid?: string };
    await logDelivery({
      channel: "sms",
      template: input.template,
      recipient: to,
      status: "sent",
      providerId: payload.sid ?? null,
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey ?? null,
    });
    return { sent: true, sid: payload.sid };
  } catch (error) {
    console.error(`[sms] '${input.template}' failed:`, error);
    await logDelivery({
      channel: "sms",
      template: input.template,
      recipient: to,
      status: "failed",
      reason: error instanceof Error ? error.message.slice(0, 300) : "send_failed",
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
    });
    return { sent: false, reason: "send_failed" };
  }
}

/**
 * Status-update sends honour customer_preferences.sms_status_updates.
 * Verification and security codes are exempt (they are requested by the user).
 */
export async function sendSmsIfOptedIn(input: {
  template: SmsTemplate;
  to: unknown;
  userId?: string | null;
  data?: Data;
  refType?: string | null;
  refId?: string | null;
}): Promise<SmsResult> {
  if (input.userId) {
    try {
      const { admin } = await import("@/lib/store/orders.server");
      const db = (await admin()) as any;
      const { data } = await db
        .from("customer_preferences")
        .select("sms_status_updates")
        .eq("user_id", input.userId)
        .maybeSingle();
      if (data && data.sms_status_updates === false) {
        await logDelivery({
          channel: "sms",
          template: input.template,
          recipient: String(input.to ?? ""),
          status: "skipped",
          reason: "opted_out",
          refType: input.refType,
          refId: input.refId,
          userId: input.userId,
        });
        return { sent: false, reason: "opted_out" };
      }
    } catch {
      // Preference lookup failure must not silently drop a transactional text.
    }
  }
  return sendSms(input);
}
