// ---------------------------------------------------------------------------
// Digital store — admin order console.
//
// Every function verifies the caller holds the admin role through their own
// (RLS-scoped) client before touching the privileged admin client.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeEnv } from "@/lib/stripe.server";

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  email: string;
  buyerName: string;
  status: string;
  amountCents: number;
  currency: string;
  environment: string;
  createdAt: string;
  paidAt: string | null;
  emailSentAt: string | null;
  hasPaymentIntent: boolean;
  items: { slug: string; title: string; amountCents: number }[];
}

export interface AdminOrderList {
  rows: AdminOrderRow[];
  totals: { paidCount: number; grossCents: number; refundedCents: number };
}

/** Order list with search and status filter, newest first. */
export const listStoreOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; status?: string }) => ({
    search: clean(d?.search, 120).toLowerCase(),
    status: clean(d?.status, 20),
  }))
  .handler(async ({ data, context }): Promise<AdminOrderList> => {
    await assertAdmin(context);
    const { admin } = await import("@/lib/store/orders.server");
    const { loadOrderItems } = await import("@/lib/store/items.server");
    const db = await admin();

    let query = db.from("store_orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.search) {
      query = query.or(
        `email.ilike.%${data.search}%,order_number.ilike.%${data.search}%,product_title.ilike.%${data.search}%`,
      );
    }

    const { data: orders } = await query;
    const rows: AdminOrderRow[] = [];
    let paidCount = 0;
    let grossCents = 0;
    let refundedCents = 0;

    for (const order of (orders ?? []) as any[]) {
      const items = await loadOrderItems(db, order);
      if (order.status === "paid") {
        paidCount += 1;
        grossCents += Number(order.amount_cents ?? 0);
      }
      if (order.status === "refunded" || order.status === "disputed") {
        refundedCents += Number(order.amount_cents ?? 0);
      }
      rows.push({
        id: order.id,
        orderNumber: order.order_number,
        email: order.email,
        buyerName: [order.first_name, order.last_name].filter(Boolean).join(" "),
        status: order.status,
        amountCents: Number(order.amount_cents ?? 0),
        currency: String(order.currency ?? "usd").toUpperCase(),
        environment: order.environment,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        emailSentAt: order.email_sent_at,
        hasPaymentIntent: Boolean(order.stripe_payment_intent),
        items,
      });
    }

    return { rows, totals: { paidCount, grossCents, refundedCents } };
  });

/** Refunds a paid order in Stripe and revokes every download it unlocked. */
export const refundStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    const orderId = clean(d?.orderId, 60);
    if (!orderId) throw new Error("Order is required");
    return { orderId };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    await assertAdmin(context);
    const { admin } = await import("@/lib/store/orders.server");
    const db = await admin();

    const { data: order } = await db
      .from("store_orders")
      .select("id,status,amount_cents,stripe_payment_intent,environment")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.status !== "paid") return { error: "Only paid orders can be refunded." };

    if (order.stripe_payment_intent && Number(order.amount_cents ?? 0) > 0) {
      try {
        const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
        const stripe = createStripeClient((order.environment as StripeEnv) ?? "sandbox");
        await stripe.refunds.create({ payment_intent: order.stripe_payment_intent });
        // The charge.refunded webhook also revokes; revoking here keeps the
        // console consistent immediately and the operation is idempotent.
        void getStripeErrorMessage;
      } catch (error) {
        console.error("[admin-orders] refund failed:", error);
        const { getStripeErrorMessage } = await import("@/lib/stripe.server");
        return { error: getStripeErrorMessage(error) };
      }
    }

    const { revokeOrder } = await import("@/lib/store/fulfilment.server");
    await revokeOrder(db, { orderId: order.id }, "refunded");
    return { ok: true };
  });

/** Re-sends the download link email for every item on a paid order. */
export const resendOrderLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    const orderId = clean(d?.orderId, 60);
    if (!orderId) throw new Error("Order is required");
    return { orderId };
  })
  .handler(async ({ data, context }): Promise<{ sent: number } | { error: string }> => {
    await assertAdmin(context);
    const { admin, signDownloadToken, siteOrigin } = await import("@/lib/store/orders.server");
    const { loadOrderItems } = await import("@/lib/store/items.server");
    const { sendOrderDownloadEmail } = await import("@/lib/store/email.server");
    const db = await admin();

    const { data: order } = await db
      .from("store_orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (order.status !== "paid") return { error: "Only paid orders have download links." };

    const origin = siteOrigin();
    const items = await loadOrderItems(db, order);
    let sent = 0;
    for (const item of items) {
      const token = await signDownloadToken(order.id, item.slug);
      const result = await sendOrderDownloadEmail({
        to: order.email,
        firstName: order.first_name,
        productTitle: item.title,
        orderNumber: items.length > 1 ? `${order.order_number}-${item.slug}` : order.order_number,
        downloadUrl: `${origin}/download?t=${token}`,
        accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(order.email)}`,
      });
      if (result.sent) sent += 1;
    }

    if (!sent) return { error: "Email delivery is not available right now." };
    await db
      .from("store_orders")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", order.id);
    return { sent };
  });
