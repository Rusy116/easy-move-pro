// ---------------------------------------------------------------------------
// SEO quality gate for the city page network.
//
// Every city record stays reachable (the route always renders), but only
// records that clear these thresholds are allowed to be indexed and to enter
// the XML sitemap. This is the single source of truth used by BOTH the route
// `head()` robots directive and the sitemap readers, so the two can never
// disagree.
// ---------------------------------------------------------------------------

import { stateName } from "@/lib/us-states";

/** Minimum stored word count for an indexable city page. */
export const MIN_INDEX_WORDS = 1500;
/** Minimum deterministic SEO score produced by the pre-publish validator. */
export const MIN_INDEX_SEO_SCORE = 95;
/**
 * Below this population a place is usually an unincorporated hamlet where the
 * generated guide has no distinct local substance. Kept deliberately low so the
 * real city network (tens of thousands of genuine towns) stays indexable — the
 * word-count and SEO-score gates do the heavy lifting.
 */
export const MIN_INDEX_POPULATION = 1000;

export interface CityQualitySignals {
  status?: string | null;
  seo_status?: string | null;
  word_count?: number | null;
  seo_score?: number | null;
  population?: number | null;
  zip_codes?: string[] | null;
  city?: string | null;
  state_code?: string | null;
  state_name?: string | null;
}

/**
 * Geography sanity: the record must carry a real US state code, and when a
 * state name is stored it must be that code's state. Guards against rows whose
 * geography was filled from a same-named city in another state.
 */
export function hasConsistentGeography(s: CityQualitySignals): boolean {
  const code = (s.state_code ?? "").toUpperCase();
  const name = stateName(code);
  if (!name) return false;
  if (s.state_name && s.state_name.trim().toLowerCase() !== name.toLowerCase()) return false;
  return true;
}

/**
 * Is the /moving-calculator-{slug} page good enough to index?
 * Mirrors `indexableQuery()` in public-read.server.ts one-for-one so the robots
 * directive and the sitemap can never disagree.
 */
export function isIndexableCity(s: CityQualitySignals): boolean {
  return (
    s.status === "published" &&
    (s.word_count ?? 0) >= MIN_INDEX_WORDS &&
    (s.seo_score ?? 0) >= MIN_INDEX_SEO_SCORE &&
    (s.population ?? 0) >= MIN_INDEX_POPULATION &&
    s.zip_codes != null &&
    hasConsistentGeography(s)
  );
}

/** Is the companion /movers/{slug} page good enough to index? */
export function isIndexableMovers(s: CityQualitySignals): boolean {
  return isIndexableCity(s) && s.seo_status === "published";
}

/** Robots meta entries for a city page, given its quality verdict. */
export function cityRobotsMeta(indexable: boolean) {
  return indexable ? [] : [{ name: "robots", content: "noindex, follow" }];
}
