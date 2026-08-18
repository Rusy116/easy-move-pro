// ---------------------------------------------------------------------------
// Digital store — guest checkout, order lookup and secure PDF redemption.
//
// Nothing here trusts a client-supplied price: the amount always comes from
// the published pdf_products row. Card data never touches this app — Stripe's
// embedded checkout collects it inside Stripe's own iframe.
//
// An order can carry several products (cart checkout); each one becomes a
// store_order_items row and gets its own signed download link.
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import type { StripeEnv } from "@/lib/stripe.server";

/** Eligible digital-goods tax code (required for managed payments). */
const DIGITAL_TAX_CODE = "txcd_10103001";

/** Hard cap on basket size — protects the Stripe session and the emails. */
const MAX_ITEMS = 10;

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

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Normalises, de-duplicates and validates a basket of product slugs. */
function cleanSlugs(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : [input];
  const slugs: string[] = [];
  for (const value of raw) {
    const slug = clean(value, 100);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid product");
    if (!slugs.includes(slug)) slugs.push(slug);
  }
  if (!slugs.length) throw new Error("No products selected");
  if (slugs.length > MAX_ITEMS) throw new Error(`You can buy up to ${MAX_ITEMS} items at once`);
  return slugs;
}

type CheckoutResult = { clientSecret: string; orderNumber: string } | { error: string };

/**
 * Starts a guest checkout for one or more published products and records a
 * pending order (plus its line items) keyed to the Stripe session. The
 * webhook — or the return-page reconcile — flips it to paid.
 */
export const createStoreCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      slug?: string;
      slugs?: string[];
      email: string;
      firstName: string;
      lastName?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      const email = clean(d.email, 160).toLowerCase();
      if (!validEmail(email)) throw new Error("A valid email address is required");
      const slugs = cleanSlugs(d.slugs ?? d.slug);
      const firstName = clean(d.firstName, 60);
      if (!firstName) throw new Error("First name is required");
      return {
        slugs,
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
    const { resolveBuyerUserId } = await import("@/lib/store/buyer.server");
    const db = await admin();
    const userId = await resolveBuyerUserId();

    const { data: rows } = await db
      .from("pdf_products")
      .select("slug,title,price_cents,status")
      .in("slug", data.slugs)
      .eq("status", "published");

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
        products.length === 1
          ? products[0].title
          : `${products.length} Easy Moving PDFs`;

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
  });

export type CheckoutItemView = {
  slug: string;
  title: string;
  amountCents: number;
  downloadUrl: string | null;
};

export type OrderStatusResult =
  | {
      status: "paid" | "pending" | "failed" | "refunded" | "disputed" | "unknown";
      orderNumber?: string;
      productTitle?: string;
      productSlug?: string;
      email?: string;
      amountCents?: number;
      items?: CheckoutItemView[];
      downloadUrl?: string | null;
      receiptUrl?: string | null;
      emailSent?: boolean;
    }
  | { error: string };

/**
 * Return-page poller. Reconciles directly with Stripe so the buyer is never
 * stuck waiting on webhook latency, then returns a signed link per product.
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

    const { getDownloadUrl, getReceiptUrl } = await import(
      "@/lib/store/orders.server"
    );
    const { loadOrderItems } = await import("@/lib/store/items.server");
    const paid = current.status === "paid";

    const items: CheckoutItemView[] = [];
    for (const item of await loadOrderItems(db, current)) {
      items.push({
        slug: item.slug,
        title: item.title,
        amountCents: item.amountCents,
        downloadUrl: paid ? await getDownloadUrl(current.id, item.slug) : null,
      });
    }

    const receiptUrl =
      current.status === "pending" ? null : await getReceiptUrl(current.id);

    return {
      status:
        (current.status as "paid" | "pending" | "failed" | "refunded" | "disputed") ?? "pending",
      orderNumber: current.order_number,
      productTitle: current.product_title,
      productSlug: current.product_slug,
      email: current.email,
      amountCents: current.amount_cents,
      items,
      downloadUrl: items[0]?.downloadUrl ?? null,
      receiptUrl,
      emailSent: Boolean(current.email_sent_at),
    };
  });

export type FreeClaimResult =
  | { ok: true; orderNumber: string; emailSent: boolean; items: CheckoutItemView[] }
  | { error: string };

/**
 * Email-gated delivery for free lead magnets. No account, no payment: the
 * address is captured as a real order so the same download, receipt, resend
 * and library machinery applies.
 */
export const claimFreeProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { slug?: string; slugs?: string[]; email: string; firstName?: string }) => {
    const email = clean(d.email, 160).toLowerCase();
    if (!validEmail(email)) throw new Error("A valid email address is required");
    return {
      slugs: cleanSlugs(d.slugs ?? d.slug),
      email,
      firstName: clean(d.firstName, 60),
    };
  })
  .handler(async ({ data }): Promise<FreeClaimResult> => {
    const { admin, newOrderNumber, getDownloadUrl } = await import(
      "@/lib/store/orders.server"
    );
    const { resolveBuyerUserId } = await import("@/lib/store/buyer.server");
    const db = await admin();
    const userId = await resolveBuyerUserId();

    const { data: rows } = await db
      .from("pdf_products")
      .select("slug,title,price_cents,status")
      .in("slug", data.slugs)
      .eq("status", "published");

    const products = (rows ?? []) as any[];
    if (products.length !== data.slugs.length) {
      return { error: "One of these products is no longer available." };
    }
    if (products.some((p) => Number(p.price_cents ?? 0) > 0)) {
      return { error: "These products are not free — please use checkout." };
    }

    const orderNumber = newOrderNumber();
    const title =
      products.length === 1 ? products[0].title : `${products.length} free Easy Moving PDFs`;

    const { data: order, error } = await db
      .from("store_orders")
      .insert({
        order_number: orderNumber,
        email: data.email,
        first_name: data.firstName || null,
        product_slug: products[0].slug,
        product_title: title,
        amount_cents: 0,
        currency: "usd",
        status: "pending",
        user_id: userId,
      })
      .select("id")
      .maybeSingle();
    if (error || !order) {
      console.error("[store-checkout] free order insert failed:", error?.message);
      return { error: "Could not prepare your download. Please try again." };
    }

    await db.from("store_order_items").insert(
      products.map((p) => ({
        order_id: order.id,
        product_slug: p.slug,
        product_title: p.title,
        amount_cents: 0,
      })),
    );

    const { fulfilOrder } = await import("@/lib/store/fulfilment.server");
    const fulfilled = await fulfilOrder(db, order.id, {});

    const items: CheckoutItemView[] = [];
    for (const p of products) {
      items.push({
        slug: p.slug,
        title: p.title,
        amountCents: 0,
        downloadUrl: await getDownloadUrl(order.id, p.slug),
      });
    }

    return {
      ok: true,
      orderNumber,
      emailSent: Boolean(fulfilled?.email_sent_at),
      items,
    };
  });

/**
 * Redeems a signed download token and returns the purchased product record so
 * the browser can render the PDF. The token is order-scoped: it only unlocks
 * a product that this specific order actually paid for.
 */
export const redeemDownload = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({ token: clean(d.token, 800) }))
  .handler(async ({ data }) => {
    const { verifyDownloadToken, admin } = await import("@/lib/store/orders.server");
    const { orderIncludes } = await import("@/lib/store/items.server");
    const claim = await verifyDownloadToken(data.token);
    if (!claim) return { ok: false as const, reason: "invalid" };

    const db = await admin();
    const { data: order } = await db
      .from("store_orders")
      .select("id,status,product_slug,product_title,order_number")
      .eq("id", claim.o)
      .maybeSingle();
    if (!order || order.status !== "paid") return { ok: false as const, reason: "invalid" };
    if (!(await orderIncludes(db, order, claim.s))) {
      return { ok: false as const, reason: "invalid" };
    }

    const { data: product } = await db
      .from("pdf_products")
      .select("*")
      .eq("slug", claim.s)
      .maybeSingle();
    if (!product) return { ok: false as const, reason: "missing" };

    return {
      ok: true as const,
      orderNumber: order.order_number,
      product,
    };
  });
