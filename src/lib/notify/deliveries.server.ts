// ---------------------------------------------------------------------------
// Central delivery audit for every outbound email / SMS.
//
// Server-only. Writes to public.notification_deliveries with the service-role
// client so the log cannot be forged or read from the browser (RLS restricts
// reads to admins/brokers, and nothing but service_role can insert).
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DeliveryChannel = "email" | "sms";
export type DeliveryStatus = "queued" | "sent" | "skipped" | "failed";

export interface DeliveryRecord {
  channel: DeliveryChannel;
  template: string;
  recipient: string;
  status: DeliveryStatus;
  reason?: string | null;
  providerId?: string | null;
  refType?: string | null;
  refId?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
}

/** Masks a recipient so the audit trail never stores a full address/number. */
export function maskRecipient(value: string, channel: DeliveryChannel): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (channel === "email") {
    const [user, domain] = v.split("@");
    if (!domain) return "***";
    const head = user.slice(0, 2);
    return `${head}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
  }
  return `${"*".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
}

export async function logDelivery(record: DeliveryRecord): Promise<void> {
  try {
    const { admin } = await import("@/lib/store/orders.server");
    const db = (await admin()) as any;
    await db.from("notification_deliveries").insert({
      channel: record.channel,
      template: record.template,
      recipient: maskRecipient(record.recipient, record.channel),
      status: record.status,
      reason: record.reason ?? null,
      provider_id: record.providerId ?? null,
      ref_type: record.refType ?? null,
      ref_id: record.refId ?? null,
      user_id: record.userId ?? null,
      idempotency_key: record.idempotencyKey ?? null,
    });
  } catch (error) {
    // Never let auditing break a real send.
    console.error("[notify] delivery log failed:", error);
  }
}
