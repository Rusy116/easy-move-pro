// ---------------------------------------------------------------------------
// PHASE 14 — Autonomous Digital Product Ecosystem (pure definitions).
//
// Research sources, the product taxonomy/roadmap and clustering helpers.
// No I/O — safe to import from the browser and from server code.
// Extension only: nothing here touches CRM, marketplace, portals or auth.
// ---------------------------------------------------------------------------

export const RESEARCH_SOURCES = [
  "google",
  "bing",
  "reddit",
  "pinterest",
  "etsy",
  "amazon",
  "youtube",
  "moving-blogs",
  "competitors",
] as const;
export type ResearchSource = (typeof RESEARCH_SOURCES)[number];

export const KEYWORD_INTENTS = ["informational", "commercial", "transactional"] as const;
export type KeywordIntent = (typeof KEYWORD_INTENTS)[number];

export const SEASONALITY = ["evergreen", "seasonal"] as const;
export type Seasonality = (typeof SEASONALITY)[number];

export interface PdfKeyword {
  id: string;
  keyword: string;
  source: string;
  cluster: string | null;
  category_slug: string | null;
  intent: string;
  seasonality: string;
  volume_score: number;
  difficulty_score: number;
  opportunity_score: number;
  notes: string | null;
  status: string;
  created_at: string;
}

/** The product roadmap groups the Planner Agent works through, in order. */
export const PRODUCT_TAXONOMY: Array<{ cluster: string; category_slug: string }> = [
  { cluster: "Moving", category_slug: "checklists" },
  { cluster: "Packing", category_slug: "packing" },
  { cluster: "Organization", category_slug: "planners" },
  { cluster: "Inventory", category_slug: "inventory" },
  { cluster: "Budget", category_slug: "budget" },
  { cluster: "Planner", category_slug: "planners" },
  { cluster: "Checklist", category_slug: "checklists" },
  { cluster: "Kids", category_slug: "family" },
  { cluster: "Pets", category_slug: "family" },
  { cluster: "Seniors", category_slug: "family" },
  { cluster: "Military", category_slug: "checklists" },
  { cluster: "College", category_slug: "checklists" },
  { cluster: "Apartment", category_slug: "checklists" },
  { cluster: "House", category_slug: "checklists" },
  { cluster: "Office", category_slug: "business" },
  { cluster: "Commercial", category_slug: "business" },
  { cluster: "Luxury", category_slug: "packing" },
  { cluster: "Long distance", category_slug: "planners" },
  { cluster: "Local move", category_slug: "planners" },
  { cluster: "State guides", category_slug: "planners" },
  { cluster: "City guides", category_slug: "planners" },
  { cluster: "Storage", category_slug: "inventory" },
  { cluster: "Cleaning", category_slug: "checklists" },
  { cluster: "Utilities", category_slug: "checklists" },
  { cluster: "Timeline", category_slug: "planners" },
  { cluster: "Labels", category_slug: "inventory" },
  { cluster: "Templates", category_slug: "movers" },
  { cluster: "Printable forms", category_slug: "movers" },
  { cluster: "Emergency", category_slug: "checklists" },
  { cluster: "Home buying", category_slug: "planners" },
  { cluster: "Home selling", category_slug: "planners" },
  { cluster: "Digital planner", category_slug: "planners" },
  { cluster: "Excel calculators", category_slug: "budget" },
  { cluster: "PDF kits", category_slug: "packing" },
  { cluster: "Bundles", category_slug: "packing" },
];

export const CATALOG_MILESTONES = [100, 500, 1000, 5000, 10000];

export function nextMilestone(published: number) {
  return CATALOG_MILESTONES.find((m) => published < m) ?? CATALOG_MILESTONES[CATALOG_MILESTONES.length - 1]!;
}

/** Opportunity = demand weighted against difficulty. 0-100. */
export function opportunityScore(volume: number, difficulty: number) {
  return Math.max(0, Math.min(100, Math.round(volume - difficulty * 0.6)));
}

/** Deterministic cluster assignment so research always lands in the roadmap. */
export function clusterFor(keyword: string): { cluster: string; category_slug: string } {
  const k = keyword.toLowerCase();
  const match = PRODUCT_TAXONOMY.find((t) => k.includes(t.cluster.toLowerCase()));
  if (match) return match;
  let hash = 0;
  for (const ch of k) hash = (hash * 31 + ch.charCodeAt(0)) % 99991;
  return PRODUCT_TAXONOMY[hash % PRODUCT_TAXONOMY.length]!;
}

export function inferIntent(keyword: string): KeywordIntent {
  const k = keyword.toLowerCase();
  if (/\b(buy|price|template|printable|pdf|download|kit|bundle)\b/.test(k)) return "transactional";
  if (/\b(best|top|vs|compare|review|cost)\b/.test(k)) return "commercial";
  return "informational";
}

export function inferSeasonality(keyword: string): Seasonality {
  return /\b(summer|winter|holiday|college|semester|spring|january|peak season)\b/i.test(keyword)
    ? "seasonal"
    : "evergreen";
}
