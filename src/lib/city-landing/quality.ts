// ---------------------------------------------------------------------------
// SEO quality gate for the city page network.
//
// Every city record stays reachable (the route always renders), but only
// records that clear these thresholds are allowed to be indexed and to enter
// the XML sitemap. This is the single source of truth used by BOTH the route
// `head()` robots directive and the sitemap readers, so the two can never
// disagree.
// ---------------------------------------------------------------------------

/** Minimum stored word count for an indexable city page. */
export const MIN_INDEX_WORDS = 1500;
/** Minimum deterministic SEO score produced by the pre-publish validator. */
export const MIN_INDEX_SEO_SCORE = 95;
/** Below this population a page is almost always thin/near-duplicate. */
export const MIN_INDEX_POPULATION = 5000;

export interface CityQualitySignals {
  status?: string | null;
  seo_status?: string | null;
  word_count?: number | null;
  seo_score?: number | null;
  population?: number | null;
  zip_codes?: string[] | null;
}

/** Is the /moving-calculator-{slug} page good enough to index? */
export function isIndexableCity(s: CityQualitySignals): boolean {
  return (
    s.status === "published" &&
    (s.word_count ?? 0) >= MIN_INDEX_WORDS &&
    (s.seo_score ?? 0) >= MIN_INDEX_SEO_SCORE &&
    (s.population ?? 0) >= MIN_INDEX_POPULATION &&
    Array.isArray(s.zip_codes) &&
    s.zip_codes.length > 0
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
