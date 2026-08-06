// ---------------------------------------------------------------------------
// PHASE 7 — AUTONOMOUS CITY CALCULATOR PRODUCTION SYSTEM
//
// Pure definition of the 12-stage production line and the queue priority
// model. No I/O — safe to import from the browser and from server code.
//
// Nothing here touches CRM, marketplace, portal, auth or the quote engine.
// ---------------------------------------------------------------------------

export type ProductionStageKey =
  | "usa_data"
  | "calculator"
  | "seo"
  | "internal_links"
  | "image_factory"
  | "image_seo"
  | "blog"
  | "mover_content"
  | "digital_product"
  | "quality"
  | "publish"
  | "analytics";

export interface ProductionStage {
  /** 1-based position in the production line. */
  step: number;
  key: ProductionStageKey;
  name: string;
  agentKey: string;
  description: string;
  outputs: string[];
}

export const PRODUCTION_STAGES: ProductionStage[] = [
  {
    step: 1,
    key: "usa_data",
    name: "USA Data Agent",
    agentKey: "usa_data_engine",
    description: "Selects the next city by priority and imports its master data.",
    outputs: ["population", "county", "zip codes", "coordinates", "timezone", "demand", "competition"],
  },
  {
    step: 2,
    key: "calculator",
    name: "Calculator Agent",
    agentKey: "city_landing_agent",
    description: "Builds the one official city moving calculator with pricing and service areas.",
    outputs: ["calculator config", "city pricing", "service areas", "FAQ", "schema"],
  },
  {
    step: 3,
    key: "seo",
    name: "SEO Agent",
    agentKey: "seo_landing_factory",
    description: "Produces the full metadata layer for the city page.",
    outputs: ["title", "description", "H1", "H2", "keywords", "JSON-LD", "OpenGraph", "Twitter", "canonical"],
  },
  {
    step: 4,
    key: "internal_links",
    name: "Internal Link Agent",
    agentKey: "internal_linking_engine",
    description: "Wires the city into the hierarchy: small → medium → large → state → national.",
    outputs: ["related cities", "county hub", "nearby cities", "guides", "blog", "products", "company pages"],
  },
  {
    step: 5,
    key: "image_factory",
    name: "Image Factory Agent",
    agentKey: "image_factory",
    description: "Briefs the full visual set for the city page.",
    outputs: ["hero", "skyline", "moving truck", "packing illustration", "service icons", "social preview", "featured"],
  },
  {
    step: 6,
    key: "image_seo",
    name: "Image SEO Agent",
    agentKey: "image_factory",
    description: "Compresses, renames and describes every image, with responsive formats.",
    outputs: ["ALT text", "captions", "ImageObject schema", "WebP", "AVIF", "responsive srcset"],
  },
  {
    step: 7,
    key: "blog",
    name: "Blog Agent",
    agentKey: "blog_agent",
    description: "Publishes a customer-intent article that links back into the city calculator.",
    outputs: ["SEO article", "internal links"],
  },
  {
    step: 8,
    key: "mover_content",
    name: "Moving Company Content Agent",
    agentKey: "mover_growth_agent",
    description: "Publishes a B2B article for moving companies with partner funnel links.",
    outputs: ["mover article", "registration CTA", "partner portal link", "broker program link"],
  },
  {
    step: 9,
    key: "digital_product",
    name: "Digital Product Agent",
    agentKey: "product_factory",
    description: "Creates a city-scoped downloadable asset linked back to the calculator.",
    outputs: ["checklist / planner / template", "store landing", "internal links"],
  },
  {
    step: 10,
    key: "quality",
    name: "Quality Agent",
    agentKey: "internal_linking_engine",
    description: "Runs the 100-point audit: duplicates, links, schema, speed, metadata, images.",
    outputs: ["audit score", "failures", "fix list"],
  },
  {
    step: 11,
    key: "publish",
    name: "Publish Agent",
    agentKey: "seo_landing_factory",
    description: "Publishes only when every previous stage passed, then updates discovery surfaces.",
    outputs: ["sitemap", "RSS", "index queue", "internal search"],
  },
  {
    step: 12,
    key: "analytics",
    name: "Analytics Agent",
    agentKey: "google_performance_agent",
    description: "Opens the measurement baseline for the freshly published city.",
    outputs: ["traffic", "CTR", "ranking", "conversions", "downloads", "calculator usage"],
  },
];

export const TOTAL_STAGES = PRODUCTION_STAGES.length;

export function stageAt(step: number): ProductionStage | undefined {
  return PRODUCTION_STAGES.find((s) => s.step === step);
}

export const PRODUCTION_JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "paused",
] as const;
export type ProductionJobStatus = (typeof PRODUCTION_JOB_STATUSES)[number];

export interface ProductionJob {
  id: string;
  landing_slug: string;
  city_slug: string;
  state_code: string;
  city: string;
  county: string | null;
  tier: string;
  priority: number;
  population: number;
  stage: number;
  status: string;
  stage_results: Record<string, { ok: boolean; summary: string; ms: number; at: string }>;
  attempts: number;
  last_error: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
}

/**
 * Queue priority: large metro first, then medium, small and finally the
 * nearby/satellite cities. Lower number = produced sooner.
 */
export function priorityFor(population: number, tier: string): number {
  const tierRank: Record<string, number> = {
    metro: 10,
    large: 20,
    medium: 40,
    small: 60,
    neighborhood: 80,
  };
  const base = tierRank[tier] ?? 70;
  // Inside a tier, bigger cities go first (0…9 spread).
  const within = Math.max(0, 9 - Math.min(9, Math.floor(Math.log10(Math.max(population, 1)))));
  return base + within;
}

export interface ProductionSummary {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
  total: number;
  completedToday: number;
  failedToday: number;
  avgProductionMs: number;
  perHour: number;
  etaHours: number | null;
  currentCity: string | null;
  currentStage: ProductionStage | null;
}

export function estimateEta(remaining: number, perHour: number): number | null {
  if (!remaining) return 0;
  if (perHour <= 0) return null;
  return remaining / perHour;
}
