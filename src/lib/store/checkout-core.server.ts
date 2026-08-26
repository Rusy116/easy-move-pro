// ---------------------------------------------------------------------------
// Digital store — privileged checkout core (SERVER ONLY).
//
// This is the single implementation of paid-checkout business logic. It is
// called by exactly two callers:
//   A. the direct path in src/lib/store-checkout.functions.ts (unchanged
//      behaviour when STORE_BRIDGE_URL is absent);
//   B. the Lovable-hosted bridge endpoint /api/internal/store/checkout.
//
// Prices are ALWAYS read from the authoritative published pdf_products row —
// never from the browser or from the bridge payload.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StripeEnv } from "@/lib/stripe.server";

/** Eligible digital-goods tax code (required for managed payments). */
const DIGITAL_TAX_CODE = "txcd_10103001";

export interface CheckoutCoreInput {
  slugs: string[];
  email: string;
  firstName: string;
  lastName: string;
  returnUrl: string;
  environment: StripeEnv;
}

export type CheckoutCoreResult =
  | { clientSecret: string; orderNumber: string }
  | { error: string };

/**
 * Resolves the Stripe product for one catalog title, creating it on first
 * sale. Each product carries the digital-goods tax code so Stripe can handle
 * tax, disputes and fraud, and the buyer sees the real title at checkout.
 */
async function resolveStripeProduct(stripe: any, slug: string, title: string): Promise<string> {
  const found = await stripe.products.search({
    query: `metadata['lovable_external_id']:'${slug}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  const created = await stripe.products.create({
    name: title,
    tax_code: DIGITAL_TAX_CODE,
    metadata: { lovable_external_id: slug },
  });
  return created.id;
}

/**
 * Resolves a Stripe Customer for the buyer's email so repeat purchases share
 * one customer record (searchable payment history, receipts, refunds).
 */
async function resolveStripeCustomer(
  stripe: any,
  email: string,
  userId?: string | null,
): Promise<string | undefined> {
  try {
    // A signed-in buyer is keyed by userId first: emails change, ids don't.
    if (userId && /^[a-zA-Z0-9_-]+$/.test(userId)) {
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data.length) return found.data[0].id;
    }
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      // Backfill so later Stripe-side lookups by user resolve.
      if (userId && customer.metadata?.userId !== userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId },
        });
      }
      return customer.id;
    }
    const created = await stripe.customers.create({
      email,
      ...(userId ? { metadata: { userId } } : {}),
    });
    return created.id;
  } catch (error) {
    console.error("[store-checkout] customer resolve failed:", error);
    return undefined;
  }
}

/**
 * Runs the privileged part of checkout: authoritative product validation,
 * Stripe session creation and order + line-item persistence.
 *
 * `userId` is resolved by the caller (request auth on the direct path, the
 * forwarded buyer token on the bridge path) — never taken from the payload.
 */
export async function runStoreCheckout(
  data: CheckoutCoreInput,
  userId: string | null,
): Promise<CheckoutCoreResult> {
  const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
  const { admin, newOrderNumber } = await import("@/lib/store/orders.server");

  let db: any;
  try {
    db = await admin();
  } catch (error) {
    // Infrastructure failure (missing/invalid privileged binding) must never
    // be reported to the buyer as "product no longer available".
    console.error("[store-checkout] privileged client unavailable:", (error as Error)?.message);
    return { error: "Checkout is temporarily unavailable. Please try again shortly." };
  }

  const { data: rows, error: queryError } = await db
    .from("pdf_products")
    .select("slug,title,price_cents,status")
    .in("slug", data.slugs)
    .eq("status", "published");

  if (queryError) {
    console.error("[store-checkout] product lookup failed:", queryError.message);
    return { error: "Checkout is temporarily unavailable. Please try again shortly." };
  }

  const products = (rows ?? []) as any[];
  if (products.length !== data.slugs.length) {
    return { error: "One of these products is no longer available." };
  }
  if (products.some((p) => Number(p.price_cents ?? 0) < 50)) {
    return { error: "Free products don't need checkout — claim them with your email." };
  }

  const total = products.reduce((sum, p) => sum + Number(p.price_cents ?? 0), 0);
  const orderNumber = newOrderNumber();

  try {
    const stripe = createStripeClient(data.environment);

    const lineItems = [] as any[];
    for (const product of products) {
      const stripeProductId = await resolveStripeProduct(stripe, product.slug, product.title);
      lineItems.push({
        price_data: {
          currency: "usd",
          product: stripeProductId,
          unit_amount: Number(product.price_cents),
        },
        quantity: 1,
      });
    }

    const customerId = await resolveStripeCustomer(stripe, data.email, userId);
    const description =
      products.length === 1 ? products[0].title : `${products.length} Easy Moving PDFs`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      ...(customerId ? { customer: customerId } : { customer_email: data.email }),
      line_items: lineItems,
      payment_intent_data: { description },
      managed_payments: { enabled: true },
      metadata: {
        order_number: orderNumber,
        product_slug: products[0].slug,
        item_count: String(products.length),
        ...(userId ? { userId } : {}),
        managed_payments: "true",
      },
    } as any);

    const { data: order, error } = await db
      .from("store_orders")
      .insert({
        order_number: orderNumber,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName || null,
        product_slug: products[0].slug,
        product_title: description,
        amount_cents: total,
        currency: "usd",
        status: "pending",
        environment: data.environment,
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        user_id: userId,
      })
      .select("id")
      .maybeSingle();

    if (error || !order) {
      console.error("[store-checkout] order insert failed:", error?.message);
      return { error: "Could not start checkout. Please try again." };
    }

    const { error: itemsError } = await db.from("store_order_items").insert(
      products.map((p) => ({
        order_id: order.id,
        product_slug: p.slug,
        product_title: p.title,
        amount_cents: Number(p.price_cents ?? 0),
      })),
    );
    if (itemsError) {
      console.error("[store-checkout] items insert failed:", itemsError.message);
      return { error: "Could not start checkout. Please try again." };
    }

    return { clientSecret: session.client_secret ?? "", orderNumber };
  } catch (error) {
    console.error("[store-checkout] stripe failure:", error);
    return { error: getStripeErrorMessage(error) };
  }
}
