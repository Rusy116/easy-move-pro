// ---------------------------------------------------------------------------
// Digital store — guest checkout, order lookup and secure PDF redemption.
//
// Nothing here trusts a client-supplied price: the amount always comes from
// the published pdf_products row. Card data never touches this app — Stripe's
// embedded checkout collects it inside Stripe's own iframe.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import type { StripeEnv } from "@/lib/stripe.server";

/** Eligible digital-goods tax code (required for managed payments). */
const DIGITAL_TAX_CODE = "txcd_10103001";

/**
 * Resolves the Stripe product for one catalog title, creating it on first
 * sale. Each product carries the digital-goods tax code so Stripe can handle
 * tax, disputes and fraud, and the buyer sees the real title at checkout.
 */
async function resolveStripeProduct(
  stripe: any,
  slug: string,
  title: string,
): Promise<string> {
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
async function resolveStripeCustomer(stripe: any, email: string): Promise<string | undefined> {
  try {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length) return existing.data[0].id;
    const created = await stripe.customers.create({ email });
    return created.id;
  } catch (error) {
    console.error("[store-checkout] customer resolve failed:", error);
    return undefined;
  }
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}


function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

type CheckoutResult = { clientSecret: string; orderNumber: string } | { error: string };

/**
 * Starts a guest checkout for one published product and records a pending
 * order keyed to the Stripe session. The webhook flips it to paid.
 */
export const createStoreCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      slug: string;
      email: string;
      firstName: string;
      lastName?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      const email = clean(d.email, 160).toLowerCase();
      if (!validEmail(email)) throw new Error("A valid email address is required");
      const slug = clean(d.slug, 100);
      if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid product");
      const firstName = clean(d.firstName, 60);
      if (!firstName) throw new Error("First name is required");
      return {
        slug,
        email,
        firstName,
        lastName: clean(d.lastName, 60),
        returnUrl: clean(d.returnUrl, 500),
        environment: d.environment === "live" ? ("live" as const) : ("sandbox" as const),
      };
    },
  )
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { admin, newOrderNumber } = await import("@/lib/store/orders.server");
    const db = await admin();

    const { data: product } = await db
      .from("pdf_products")
      .select("slug,title,price_cents,status")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!product) return { error: "This product is not available." };

    const amount = Number(product.price_cents ?? 0);
    if (amount < 50) return { error: "This product cannot be purchased right now." };

    const orderNumber = newOrderNumber();

    try {
      const stripe = createStripeClient(data.environment);

      const stripeProductId = await resolveStripeProduct(stripe, product.slug, product.title);
      const lineItem = {
        price_data: { currency: "usd", product: stripeProductId, unit_amount: amount },
        quantity: 1,
      };

      const customerId = await resolveStripeCustomer(stripe, data.email);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        ...(customerId ? { customer: customerId } : { customer_email: data.email }),
        line_items: [lineItem],
        payment_intent_data: { description: product.title },
        managed_payments: { enabled: true },
        metadata: {
          order_number: orderNumber,
          product_slug: product.slug,
          managed_payments: "true",
        },
      } as any);

      const { error } = await db.from("store_orders").insert({
        order_number: orderNumber,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName || null,
        product_slug: product.slug,
        product_title: product.title,
        amount_cents: amount,
        currency: "usd",
        status: "pending",
        environment: data.environment,
        stripe_session_id: session.id,
        stripe_customer_id: customerId ?? null,
      });
      if (error) {
        console.error("[store-checkout] order insert failed:", error.message);
        return { error: "Could not start checkout. Please try again." };
      }

      return { clientSecret: session.client_secret ?? "", orderNumber };
    } catch (error) {
      console.error("[store-checkout] stripe failure:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

export type OrderStatusResult =
  | {
      status: "paid" | "pending" | "failed" | "refunded" | "disputed" | "unknown";
      orderNumber?: string;
      productTitle?: string;
      productSlug?: string;
      email?: string;
      amountCents?: number;
      downloadUrl?: string | null;
      emailSent?: boolean;
    }
  | { error: string };

/**
 * Return-page poller. Reconciles directly with Stripe so the buyer is never
 * stuck waiting on webhook latency, then returns a signed download link.
 */
export const getCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) => ({
    sessionId: clean(d.sessionId, 200),
    environment: d.environment === "live" ? ("live" as const) : ("sandbox" as const),
  }))
  .handler(async ({ data }): Promise<OrderStatusResult> => {
    if (!data.sessionId) return { status: "unknown" };
    const { admin } = await import("@/lib/store/orders.server");
    const { fulfilOrder } = await import("@/lib/store/fulfilment.server");
    const db = await admin();

    const { data: order } = await db
      .from("store_orders")
      .select("*")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (!order) return { status: "unknown" };

    let current = order;
    if (current.status !== "paid") {
      try {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const stripe = createStripeClient(data.environment);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);
        if (session.payment_status && session.payment_status !== "unpaid") {
          current = await fulfilOrder(db, current.id, {
            paymentIntent:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          });
        } else if (session.status === "expired") {
          await db.from("store_orders").update({ status: "failed" }).eq("id", current.id);
          current = { ...current, status: "failed" };
        }
      } catch (error) {
        console.error("[store-checkout] status reconcile failed:", error);
      }
    }

    const { signDownloadToken, siteOrigin } = await import("@/lib/store/orders.server");
    const downloadUrl =
      current.status === "paid"
        ? `${siteOrigin()}/download?t=${await signDownloadToken(current.id, current.product_slug)}`
        : null;

    return {
      status:
        (current.status as "paid" | "pending" | "failed" | "refunded" | "disputed") ?? "pending",
      orderNumber: current.order_number,
      productTitle: current.product_title,
      productSlug: current.product_slug,
      email: current.email,
      amountCents: current.amount_cents,
      downloadUrl,
      emailSent: Boolean(current.email_sent_at),
    };
  });

/**
 * Redeems a signed download token and returns the purchased product record so
 * the browser can render the PDF. The token is order-scoped: it only ever
 * unlocks the single product that order paid for.
 */
export const redeemDownload = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: clean(d.token, 800) }))
  .handler(async ({ data }) => {
    const { verifyDownloadToken, admin } = await import("@/lib/store/orders.server");
    const claim = await verifyDownloadToken(data.token);
    if (!claim) return { ok: false as const, reason: "invalid" };

    const db = await admin();
    const { data: order } = await db
      .from("store_orders")
      .select("id,status,product_slug,product_title,order_number")
      .eq("id", claim.o)
      .maybeSingle();
    if (!order || order.status !== "paid" || order.product_slug !== claim.s) {
      return { ok: false as const, reason: "invalid" };
    }

    const { data: product } = await db
      .from("pdf_products")
      .select("*")
      .eq("slug", order.product_slug)
      .maybeSingle();
    if (!product) return { ok: false as const, reason: "missing" };

    return {
      ok: true as const,
      orderNumber: order.order_number,
      product,
    };
  });
