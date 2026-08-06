// ---------------------------------------------------------------------------
// PHASE 8 — PILOT CITY PRODUCTION (10 CITIES)
//
// Pure definition of the pilot batch and the pre-publish gate. No I/O, safe to
// import from the browser. Extension only: nothing here touches CRM,
// marketplace, portals, auth or the quote engine.
// ---------------------------------------------------------------------------
import type { ProductionJob, ProductionStageKey } from "./stages";

/** The 10 pilot cities, produced in this exact order. */
export const PILOT_CITIES: Array<{ slug: string; landingSlug: string; city: string; stateCode: string }> = [
  { slug: "los-angeles", landingSlug: "los-angeles-ca", city: "Los Angeles", stateCode: "CA" },
  { slug: "san-diego", landingSlug: "san-diego-ca", city: "San Diego", stateCode: "CA" },
  { slug: "san-francisco", landingSlug: "san-francisco-ca", city: "San Francisco", stateCode: "CA" },
  { slug: "sacramento", landingSlug: "sacramento-ca", city: "Sacramento", stateCode: "CA" },
  { slug: "san-jose", landingSlug: "san-jose-ca", city: "San Jose", stateCode: "CA" },
  { slug: "glendale", landingSlug: "glendale-ca", city: "Glendale", stateCode: "CA" },
  { slug: "pasadena", landingSlug: "pasadena-ca", city: "Pasadena", stateCode: "CA" },
  { slug: "long-beach", landingSlug: "long-beach-ca", city: "Long Beach", stateCode: "CA" },
  { slug: "burbank", landingSlug: "burbank-ca", city: "Burbank", stateCode: "CA" },
  { slug: "santa-monica", landingSlug: "santa-monica-ca", city: "Santa Monica", stateCode: "CA" },
];

export const PILOT_SLUGS = PILOT_CITIES.map((c) => c.landingSlug);
export const isPilotSlug = (slug: string) => PILOT_SLUGS.includes(slug);

/** Automatic retries before a city is parked as failed for manual review. */
export const MAX_AUTO_RETRIES = 3;
export const PILOT_MIN_QUALITY = 95;

/**
 * The publish gate. Every one of these must be green before the Publish Agent
 * is allowed to run — Calculator, SEO, FAQ, Schema, Internal Links, Images,
 * Image SEO and Quality ≥ 95.
 */
export const PUBLISH_GATE: Array<{ label: string; stage: ProductionStageKey }> = [
  { label: "Calculator complete", stage: "calculator" },
  { label: "SEO complete", stage: "seo" },
  { label: "FAQ complete", stage: "calculator" },
  { label: "Schema complete", stage: "seo" },
  { label: "Internal links complete", stage: "internal_links" },
  { label: "Images complete", stage: "image_factory" },
  { label: "Image SEO complete", stage: "image_seo" },
  { label: "Quality score ≥ 95", stage: "quality" },
];

export function gateFor(job: Pick<ProductionJob, "stage_results"> | null | undefined) {
  const results = job?.stage_results ?? {};
  return PUBLISH_GATE.map((g) => ({ label: g.label, ok: results[g.stage]?.ok === true }));
}

export function gatePassed(job: Pick<ProductionJob, "stage_results"> | null | undefined) {
  return gateFor(job).every((g) => g.ok);
}

export interface PilotCityStatus {
  landingSlug: string;
  city: string;
  stateCode: string;
  order: number;
  stage: number;
  status: string;
  attempts: number;
  lastError: string | null;
  durationMs: number;
  gate: Array<{ label: string; ok: boolean }>;
  qualityScore: number | null;
  publishStatus: string;
  indexStatus: string;
  calculatorPath: string;
  seoPath: string;
}
