// ---------------------------------------------------------------------------
// PHASE 13 — AUTONOMOUS PDF STORE & PRODUCT FACTORY
//
// Pure definitions for the digital product line: statuses, the 12-stage
// factory, categories, cover art specs and formatting helpers.
// No I/O — safe to import from the browser and from server code.
//
// Extension only: nothing here touches CRM, marketplace, portals, auth or the
// quote engine.
// ---------------------------------------------------------------------------

export type PdfStatus =
  | "draft"
  | "generating"
  | "review"
  | "approved"
  | "published"
  | "archived"
  | "failed";

export type PdfDifficulty = "beginner" | "intermediate" | "advanced";

export interface PdfSection {
  heading: string;
  body?: string;
  items?: string[];
}

export interface CoverSpec {
  palette?: string[];
  motif?: "boxes" | "map" | "clock" | "chart" | "home" | "truck";
  layout?: "stack" | "split" | "badge";
  accent?: string;
  prompt?: string;
}

export interface PdfProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category_slug: string;
  collection_slug: string | null;
  tags: string[];
  target_keywords: string[];
  difficulty: PdfDifficulty;
  language: string;
  version: string;
  page_count: number;
  price_cents: number;
  compare_at_cents: number | null;
  status: PdfStatus;
  quality_score: number | null;
  seo_score: number | null;
  ai_prompt: string | null;
  description: string | null;
  features: string[];
  whats_included: string[];
  faq: Array<{ q: string; a: string }>;
  content: PdfSection[];
  cover_spec: CoverSpec;
  cover_url: string | null;
  preview_urls: string[];
  og_image_url: string | null;
  social_image_url: string | null;
  alt_text: string | null;
  file_url: string | null;
  file_size_kb: number | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  related_products: string[];
  related_cities: string[];
  related_articles: string[];
  related_calculators: string[];
  is_featured: boolean;
  is_bestseller: boolean;
  downloads: number;
  views: number;
  rating: number;
  review_count: number;
  impressions: number;
  clicks: number;
  is_bundle: boolean;
  bundle_slugs: string[];
  revenue_cents: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfCategory {
  id?: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface PdfOpportunity {
  id: string;
  keyword: string;
  title: string;
  category_slug: string;
  demand_score: number;
  difficulty_score: number;
  priority: number;
  gap_reason: string | null;
  source: string;
  status: string;
  created_at: string;
}

export type PdfStageKey =
  | "discovery"
  | "outline"
  | "content"
  | "cover"
  | "mockups"
  | "copy"
  | "seo"
  | "schema"
  | "internal_links"
  | "pricing"
  | "quality"
  | "publish";

export interface PdfStage {
  step: number;
  key: PdfStageKey;
  name: string;
  agentKey: string;
  description: string;
  outputs: string[];
}

/** The 12-stage product production line. Every product walks all of them. */
export const PDF_STAGES: PdfStage[] = [
  {
    step: 1,
    key: "discovery",
    name: "Discovery Agent",
    agentKey: "pdf_discovery_agent",
    description: "Finds an underserved moving topic with real search demand and no strong incumbent.",
    outputs: ["keyword", "demand", "difficulty", "gap reason", "audience"],
  },
  {
    step: 2,
    key: "outline",
    name: "Outline Agent",
    agentKey: "pdf_outline_agent",
    description: "Turns the opportunity into a structured document outline and page budget.",
    outputs: ["sections", "page count", "difficulty", "language"],
  },
  {
    step: 3,
    key: "content",
    name: "Content Agent",
    agentKey: "pdf_content_agent",
    description: "Writes every section, checklist item and table of the document.",
    outputs: ["body copy", "checklists", "tables", "worksheets"],
  },
  {
    step: 4,
    key: "cover",
    name: "Cover Design Agent",
    agentKey: "pdf_image_agent",
    description: "Designs the cover artwork recipe — palette, motif and layout.",
    outputs: ["cover spec", "palette", "motif", "art prompt"],
  },
  {
    step: 5,
    key: "mockups",
    name: "Mockup Agent",
    agentKey: "pdf_image_agent",
    description: "Produces preview spreads and the social/OG mockups.",
    outputs: ["previews", "og image", "social image", "alt text"],
  },
  {
    step: 6,
    key: "copy",
    name: "Sales Copy Agent",
    agentKey: "pdf_copy_agent",
    description: "Writes the storefront description, feature bullets and what's-included list.",
    outputs: ["description", "features", "what's included", "FAQ"],
  },
  {
    step: 7,
    key: "seo",
    name: "Product SEO Agent",
    agentKey: "pdf_seo_agent",
    description: "Builds the metadata layer for the product page.",
    outputs: ["SEO title", "meta description", "keywords", "canonical"],
  },
  {
    step: 8,
    key: "schema",
    name: "Schema Agent",
    agentKey: "pdf_seo_agent",
    description: "Generates Product + Offer + FAQ structured data.",
    outputs: ["Product JSON-LD", "Offer", "FAQPage"],
  },
  {
    step: 9,
    key: "internal_links",
    name: "Internal Link Agent",
    agentKey: "pdf_link_agent",
    description: "Links the product to related products, city calculators and articles.",
    outputs: ["related products", "related cities", "related calculators"],
  },
  {
    step: 10,
    key: "pricing",
    name: "Pricing Agent",
    agentKey: "pdf_pricing_agent",
    description: "Sets the price band and compare-at anchor from depth and demand.",
    outputs: ["price", "compare at", "tier"],
  },
  {
    step: 11,
    key: "quality",
    name: "Quality Agent",
    agentKey: "pdf_quality_agent",
    description: "Scores content depth, SEO completeness and asset coverage out of 100.",
    outputs: ["quality score", "seo score", "issues"],
  },
  {
    step: 12,
    key: "publish",
    name: "Publishing Agent",
    agentKey: "pdf_publishing_agent",
    description: "Publishes the product to the store and the sitemap.",
    outputs: ["published product", "sitemap entry"],
  },
];

export const TOTAL_PDF_STAGES = PDF_STAGES.length;
export const PDF_MIN_QUALITY = 90;
export const PDF_MAX_RETRIES = 3;

export function pdfStageAt(step: number): PdfStage {
  return PDF_STAGES[Math.min(Math.max(step, 1), TOTAL_PDF_STAGES) - 1]!;
}

export interface PdfJob {
  id: string;
  product_slug: string;
  title: string;
  category_slug: string;
  brief: string | null;
  stage: number;
  status: string;
  attempts: number;
  priority: number;
  stage_results: Record<string, { ok: boolean; summary?: string }>;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Gate that must be fully green before the Publishing Agent may run. */
export const PDF_PUBLISH_GATE: Array<{ label: string; stage: PdfStageKey }> = [
  { label: "Content complete", stage: "content" },
  { label: "Cover designed", stage: "cover" },
  { label: "Mockups ready", stage: "mockups" },
  { label: "Sales copy written", stage: "copy" },
  { label: "SEO complete", stage: "seo" },
  { label: "Schema complete", stage: "schema" },
  { label: "Internal links complete", stage: "internal_links" },
  { label: "Price set", stage: "pricing" },
  { label: `Quality ≥ ${PDF_MIN_QUALITY}`, stage: "quality" },
];

export function pdfGateFor(job: Pick<PdfJob, "stage_results"> | null | undefined) {
  const r = job?.stage_results ?? {};
  return PDF_PUBLISH_GATE.map((g) => ({ label: g.label, ok: r[g.stage]?.ok === true }));
}

export function pdfGatePassed(job: Pick<PdfJob, "stage_results"> | null | undefined) {
  return pdfGateFor(job).every((g) => g.ok);
}

export const FALLBACK_CATEGORIES: PdfCategory[] = [
  { slug: "checklists", name: "Moving Checklists", description: "Step-by-step printable checklists.", icon: "check-square", sort_order: 1 },
  { slug: "planners", name: "Planners & Timelines", description: "Week-by-week moving planners.", icon: "calendar", sort_order: 2 },
  { slug: "budget", name: "Budget & Cost", description: "Budget worksheets and expense trackers.", icon: "wallet", sort_order: 3 },
  { slug: "inventory", name: "Inventory & Labels", description: "Inventory sheets and box labels.", icon: "boxes", sort_order: 4 },
  { slug: "packing", name: "Packing Guides", description: "Packing techniques and supply lists.", icon: "package", sort_order: 5 },
  { slug: "family", name: "Family & Pets", description: "Moving with kids, seniors and pets.", icon: "users", sort_order: 6 },
  { slug: "business", name: "Business & Office", description: "Office relocation templates.", icon: "briefcase", sort_order: 7 },
  { slug: "movers", name: "For Moving Companies", description: "Operational templates for pros.", icon: "truck", sort_order: 8 },
];

export const DIFFICULTY_LABEL: Record<PdfDifficulty, string> = {
  beginner: "First-time mover",
  intermediate: "Experienced mover",
  advanced: "Complex / commercial",
};

export function money(cents: number | null | undefined) {
  const v = Number(cents ?? 0) / 100;
  return v === 0 ? "Free" : `$${v.toFixed(2)}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const DEFAULT_PALETTES: string[][] = [
  ["#0f3d3e", "#7cc4b0"],
  ["#1b2a41", "#e0a458"],
  ["#2d3142", "#ef8354"],
  ["#22333b", "#a9c5a0"],
  ["#3a2e39", "#d4a373"],
  ["#123c69", "#bab2b5"],
];

/** Deterministic fallback artwork so every product always has a cover. */
export function resolveCoverSpec(slug: string, spec?: CoverSpec | null): Required<Pick<CoverSpec, "palette" | "motif" | "layout">> {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  const motifs: NonNullable<CoverSpec["motif"]>[] = ["boxes", "map", "clock", "chart", "home", "truck"];
  const layouts: NonNullable<CoverSpec["layout"]>[] = ["stack", "split", "badge"];
  return {
    palette: spec?.palette?.length === 2 ? spec.palette : DEFAULT_PALETTES[hash % DEFAULT_PALETTES.length]!,
    motif: spec?.motif ?? motifs[hash % motifs.length]!,
    layout: spec?.layout ?? layouts[hash % layouts.length]!,
  };
}
