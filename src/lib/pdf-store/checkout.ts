// ---------------------------------------------------------------------------
// PHASE 14 — Checkout abstraction (payment-provider agnostic).
//
// Products now carry real prices. Until a payment provider is enabled the
// store runs in "preorder" mode for paid items and instant-unlock for free
// lead magnets. When payments are switched on, only ACTIVE_PROVIDER and
// startCheckout below need to change — every caller already speaks this
// interface.
// ---------------------------------------------------------------------------

export type CheckoutProvider = "free" | "preorder" | "stripe";

export interface CheckoutIntent {
  slug: string;
  title: string;
  priceCents: number;
  provider: CheckoutProvider;
  /** What the buy button should say for this product right now. */
  label: string;
  /** Present once a hosted payment page exists. */
  redirectUrl?: string;
}

/**
 * Provider currently wired up. Payments are not enabled yet, so paid products
 * collect interest instead of silently giving away priced work.
 */
export const ACTIVE_PROVIDER = "stripe" as CheckoutProvider;

export const PAYMENTS_ENABLED = ACTIVE_PROVIDER === "stripe";

export function isPaid(priceCents: number) {
  return Number(priceCents ?? 0) > 0;
}

export function providerFor(priceCents: number): CheckoutProvider {
  return isPaid(priceCents) ? ACTIVE_PROVIDER : "free";
}

export function checkoutLabel(priceCents: number) {
  const provider = providerFor(priceCents);
  if (provider === "free") return "Download free PDF";
  if (provider === "stripe") return "Buy now";
  return "Get early access";
}

/**
 * Stripe-ready seam. Returns everything the UI needs to render and run the
 * buy action for a single product.
 */
/**
 * Where the buy button should point. Paid products go through the hosted
 * Stripe checkout (guest-friendly); free lead magnets unlock in the library.
 */
export function checkoutHref(slug: string, priceCents: number) {
  return providerFor(priceCents) === "free"
    ? `/customer/library?claim=${slug}`
    : `/checkout/${slug}`;
}

export function describeCheckout(slug: string, title: string, priceCents: number): CheckoutIntent {
  return {
    slug,
    title,
    priceCents,
    provider: providerFor(priceCents),
    label: checkoutLabel(priceCents),
    redirectUrl: checkoutHref(slug, priceCents),
  };
}
