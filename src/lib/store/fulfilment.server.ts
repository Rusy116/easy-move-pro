// ---------------------------------------------------------------------------
// Digital store — order fulfilment.
//
// Idempotent: an order already marked paid is returned untouched, so Stripe
// webhook retries and the return-page reconcile can both call this safely.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { signDownloadToken, siteOrigin } from "./orders.server";
import { sendOrderDownloadEmail } from "./email.server";

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
      await db
        .from("customer_purchases")
        .insert({
          user_id: current.user_id,
          product_slug: current.product_slug,
          title: current.product_title,
          amount_cents: current.amount_cents,
          currency: current.currency,
          status: "completed",
        })
        .then(() => undefined, () => undefined);
    }

    const { data: product } = await db
      .from("pdf_products")
      .select("downloads,revenue_cents")
      .eq("slug", current.product_slug)
      .maybeSingle();
    if (product) {
      await db
        .from("pdf_products")
        .update({
          downloads: Number(product.downloads ?? 0) + 1,
          revenue_cents: Number(product.revenue_cents ?? 0) + Number(current.amount_cents ?? 0),
        })
        .eq("slug", current.product_slug);
    }
  }

  if (!current.email_sent_at) {
    const token = await signDownloadToken(current.id, current.product_slug);
    const origin = siteOrigin();
    const result = await sendOrderDownloadEmail({
      to: current.email,
      firstName: current.first_name,
      productTitle: current.product_title,
      orderNumber: current.order_number,
      downloadUrl: `${origin}/download?t=${token}`,
      accountUrl: `${origin}/auth?signup=1&email=${encodeURIComponent(current.email)}`,
    });
    if (result.sent) {
      const { data: sent } = await db
        .from("store_orders")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", current.id)
        .select("*")
        .maybeSingle();
      current = sent ?? current;
    }
  }

  return current;
}
