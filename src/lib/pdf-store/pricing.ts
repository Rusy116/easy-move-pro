// ---------------------------------------------------------------------------
// PHASE 14 — Commercial pricing model (pure).
//
// Every product carries a real price. Depth (pages + checklist items) and the
// category's commercial value decide the band; charm pricing finishes it off.
// A small number of intentional lead magnets stay free — flagged explicitly on
// the row (is_lead_magnet), never by accident.
// ---------------------------------------------------------------------------

export type PriceTier = "lead_magnet" | "starter" | "standard" | "premium" | "professional" | "bundle";

export interface PriceDecision {
  price_cents: number;
  compare_at_cents: number | null;
  price_tier: PriceTier;
  reason: string;
}

/** Commercial weighting per category — B2B templates carry more value. */
const CATEGORY_WEIGHT: Record<string, number> = {
  business: 1.6,
  movers: 1.45,
  budget: 1.2,
  inventory: 1.1,
  planners: 1.05,
  packing: 1,
  checklists: 1,
  family: 1,
};

const TIERS: Array<{ tier: PriceTier; max: number; price: number }> = [
  { tier: "starter", max: 45, price: 497 },
  { tier: "standard", max: 75, price: 997 },
  { tier: "premium", max: 115, price: 1497 },
  { tier: "professional", max: Number.POSITIVE_INFINITY, price: 2497 },
];

export function depthScore(pageCount: number, checklistItems: number) {
  return Math.round(Number(pageCount || 0) * 2 + Number(checklistItems || 0));
}

/** The single source of truth for what a product costs. */
export function priceProduct(input: {
  category_slug?: string | null;
  page_count?: number | null;
  checklist_items?: number | null;
  quality_score?: number | null;
  is_bundle?: boolean | null;
  is_lead_magnet?: boolean | null;
  bundle_count?: number | null;
}): PriceDecision {
  if (input.is_lead_magnet) {
    return {
      price_cents: 0,
      compare_at_cents: null,
      price_tier: "lead_magnet",
      reason: "Intentional free lead magnet",
    };
  }

  if (input.is_bundle) {
    const items = Math.max(2, Number(input.bundle_count ?? 3));
    const price = Math.min(9997, 1997 + (items - 2) * 700) - 3;
    return {
      price_cents: price,
      compare_at_cents: Math.round(price * 2.2),
      price_tier: "bundle",
      reason: `Bundle of ${items} products`,
    };
  }

  const weight = CATEGORY_WEIGHT[String(input.category_slug ?? "")] ?? 1;
  const depth = depthScore(Number(input.page_count ?? 8), Number(input.checklist_items ?? 0));
  const quality = Number(input.quality_score ?? 90);
  const effective = depth * weight * (quality >= 96 ? 1.1 : quality >= 90 ? 1 : 0.9);

  // Bands already sit on charm boundaries: $4.97 / $9.97 / $14.97 / $24.97.
  const band = TIERS.find((t) => effective <= t.max) ?? TIERS[TIERS.length - 1]!;

  return {
    price_cents: band.price,
    compare_at_cents: Math.round(band.price * 2),
    price_tier: band.tier,
    reason: `Depth ${depth} × category ${weight} → ${band.tier}`,
  };
}

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  lead_magnet: "Free lead magnet",
  starter: "Starter",
  standard: "Standard",
  premium: "Premium",
  professional: "Professional",
  bundle: "Bundle",
};
