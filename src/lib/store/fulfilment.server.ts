// ---------------------------------------------------------------------------
// Digital store — order fulfilment.
//
// Idempotent: an order already marked paid is returned untouched, so Stripe
// webhook retries and the return-page reconcile can both call this safely.
// Orders may contain several products; every line item is fulfilled.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDownloadUrl, siteOrigin } from "./orders.server";
import { sendOrderDownloadEmail } from "./email.server";
import { loadOrderItems } from "./items.server";

export async function fulfilOrder(
  db: any,
  orderId: string,
  options: { paymentIntent?: string | null } = {},
) {
  const { data: order } = await db
    .from("store_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.status === "paid" && order.email_sent_at) return order;

  let current = order;
  const items = await loadOrderItems(db, order);

  if (current.status !== "paid") {
    const { data: updated } = await db
      .from("store_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent: options.paymentIntent ?? current.stripe_payment_intent ?? null,
      })
      .eq("id", orderId)
      .neq("status", "paid")
      .select("*")
      .maybeSingle();
    current = updated ?? { ...current, status: "paid" };

    // Mirror into the signed-in customer library when the buyer already has
    // an account (linked now, or later by fn_claim_my_records).
    if (current.user_id) {
      for (const item of items) {
        await db
          .from("customer_purchases")
          .upsert(
            {
              user_id: current.user_id,
              product_slug: item.slug,
              title: item.title,
              amount_cents: item.amountCents,
              currency: current.currency,
              status: "completed",
              refunded_at: null,
            },
            { onConflict: "user_id,product_slug" },
          )
          .then(() => undefined, () => undefined);
      }
    }

    for (const item of items) {
      const { data: product } = await db
        .from("pdf_products")
        .select("downloads,revenue_cents")
        .eq("slug", item.slug)
        .maybeSingle();
      if (!product) continue;
      await db
        .from("pdf_products")
        .update({
          downloads: Number(product.downloads ?? 0) + 1,
          revenue_cents: Number(product.revenue_cents ?? 0) + Number(item.amountCents ?? 0),
        })
        .eq("slug", item.slug);
    }
  }

  if (!current.email_sent_at) {
    const origin = siteOrigin();
    let anySent = false;
    for (const item of items) {
      const result = await sendOrderDownloadEmail({
        to: current.email,
        firstName: current.first_name,
        productTitle: item.title,
        orderNumber:
          items.length > 1 ? `${current.order_number}-${item.slug}` : current.order_number,
        downloadUrl: await getDownloadUrl(current.id, item.slug),
        accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(current.email)}`,
      });
      if (result.sent) anySent = true;
    }
    if (anySent) {
      const { data: sent } = await db
        .from("store_orders")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", current.id)
        .select("*")
        .maybeSingle();
      current = sent ?? current;
    }
  }

  // Optional payment-confirmation text, only for a signed-in buyer with a
  // verified phone who has not opted out of status updates.
  if (current.user_id && Number(current.amount_cents ?? 0) > 0) {
    try {
      const { data: profile } = await db
        .from("profiles")
        .select("phone,phone_verified_at")
        .eq("id", current.user_id)
        .maybeSingle();
      if (profile?.phone && profile.phone_verified_at) {
        const { sendSmsIfOptedIn } = await import("@/lib/notify/sms.server");
        await sendSmsIfOptedIn({
          template: "order-paid",
          to: profile.phone,
          userId: current.user_id,
          data: { orderNumber: current.order_number },
          refType: "store_order",
          refId: current.id,
        });
      }
    } catch (error) {
      console.error("[fulfilment] order SMS failed:", error);
    }
  }

  return current;
}

/**
 * Revokes access after a refund or dispute. Flipping the order off "paid"
 * makes every issued download token stop working immediately (redeemDownload
 * re-checks status), and every item is marked refunded in the library.
 */
export async function revokeOrder(
  db: any,
  match: { orderId?: string; paymentIntent?: string | null },
  reason: "refunded" | "disputed" = "refunded",
) {
  let query = db.from("store_orders").select("*").limit(1);
  query = match.orderId
    ? query.eq("id", match.orderId)
    : query.eq("stripe_payment_intent", match.paymentIntent ?? "__none__");
  const { data: rows } = await query;
  const order = rows?.[0];
  if (!order || order.status === reason) return order ?? null;

  const now = new Date().toISOString();
  await db
    .from("store_orders")
    .update({ status: reason, refunded_at: now })
    .eq("id", order.id);

  if (order.user_id) {
    const items = await loadOrderItems(db, order);
    for (const item of items) {
      await db
        .from("customer_purchases")
        .update({ status: reason, refunded_at: now })
        .eq("user_id", order.user_id)
        .eq("product_slug", item.slug)
        .then(() => undefined, () => undefined);
    }
  }

  return { ...order, status: reason, refunded_at: now };
}
