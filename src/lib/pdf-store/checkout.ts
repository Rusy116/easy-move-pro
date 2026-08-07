// ---------------------------------------------------------------------------
// PHASE 13 — Checkout abstraction.
//
// The store is payment-provider agnostic. Today every product is delivered
// through the free-access path (instant unlock + library entry). When Stripe
// is enabled, only `startCheckout` below needs a provider branch — every
// caller in the UI already speaks this interface.
// ---------------------------------------------------------------------------

export type CheckoutProvider = "free" | "stripe";

export interface CheckoutIntent {
  slug: string;
  title: string;
  priceCents: number;
  provider: CheckoutProvider;
  /** Present once a hosted payment page exists. */
  redirectUrl?: string;
}

/** Provider currently wired up. Flip to "stripe" once payments are enabled. */
export const ACTIVE_PROVIDER: CheckoutProvider = "free";

export function providerFor(priceCents: number): CheckoutProvider {
  return priceCents <= 0 ? "free" : ACTIVE_PROVIDER;
}

export function isPaid(priceCents: number) {
  return priceCents > 0;
}

/**
 * Stripe-ready seam. When payments are enabled this returns a hosted checkout
 * URL; until then paid products unlock instantly and are recorded as a
 * purchase so the customer library and download history stay correct.
 */
export function describeCheckout(slug: string, title: string, priceCents: number): CheckoutIntent {
  return { slug, title, priceCents, provider: providerFor(priceCents) };
}
