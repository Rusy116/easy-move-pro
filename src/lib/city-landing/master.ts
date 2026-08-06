// ---------------------------------------------------------------------------
// MASTER DATASET → CityFacts adapter (pure, SSR-safe).
//
// public.usa_cities is the permanent master source for every US city. This
// module converts a master row into the SAME CityFacts shape the production
// pipeline already consumes, so no stage, route or agent needs to change.
// Curated metadata in CITY_META still wins where we have real editorial data.
// ---------------------------------------------------------------------------
import { buildCityFacts, type CityFacts } from "./data";
import { landingPathFor } from "./data";

export interface MasterCityRow {
  city_slug: string;
  city_name: string;
  state_code: string;
  state_name: string;
  county: string | null;
  population: number;
  zip_codes: string[] | null;
  aliases?: string[] | null;
  nearby_cities?: Array<{ name: string; state: string; slug: string }> | null;
  seo_priority?: number | null;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Convert a public.usa_cities row into the canonical CityFacts record. */
export function factsFromMasterRow(row: MasterCityRow): CityFacts {
  const base = buildCityFacts({
    slug: row.city_slug,
    name: row.city_name,
    stateCode: row.state_code,
    stateName: row.state_name,
    stateSlug: slugify(row.state_name),
    population: Math.max(row.population ?? 0, 1000),
  });

  const nearby = (row.nearby_cities ?? [])
    .filter((n) => n && n.slug && n.slug !== row.city_slug)
    .slice(0, 8)
    .map((n) => ({
      name: n.name,
      state: n.state,
      slug: n.slug,
      path: landingPathFor(n.slug, n.state),
    }));

  return {
    ...base,
    county: base.county ?? row.county ?? null,
    zipCodes: base.zipCodes.length ? base.zipCodes : (row.zip_codes ?? []),
    nearbyCities: nearby.length ? nearby : base.nearbyCities,
  };
}

/**
 * Production priority: California → Texas → Florida → New York → rest.
 * Lower number = produced first (matches usa_cities.seo_priority ordering).
 */
export const STATE_PRIORITY: Record<string, number> = { CA: 1, TX: 2, FL: 3, NY: 4 };

export function statePriority(stateCode: string): number {
  return STATE_PRIORITY[stateCode] ?? 5;
}
