// ---------------------------------------------------------------------------
// Phase 4 — City Landing & Calculator Agent: city dataset layer.
//
// Pure data + helpers (SSR-safe, no side effects). The agent, the public
// landing route and the admin dashboard all read city facts from here.
//
// Scale note: facts are DERIVED from the geo dataset, so adding cities is a
// data-only change — the architecture supports 50,000+ landing pages without
// any code change. Curated metadata (county, ZIPs, highways, ...) overrides
// the derived defaults wherever we have real data.
// ---------------------------------------------------------------------------
import { GEO_CITIES, cityAverages, type GeoCity } from "@/lib/seo/geo";
import { neighborhoodsFor } from "@/lib/seo/city-content";

export interface CityFacts {
  slug: string; // "los-angeles"
  landingSlug: string; // "moving-calculator-los-angeles-ca"
  path: string; // "/moving-calculator-los-angeles-ca"
  city: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  county: string | null;
  population: number;
  timezone: string;
  zipCodes: string[];
  neighborhoods: string[];
  highways: string[];
  nearbyCities: Array<{ name: string; state: string; slug: string; path: string }>;
  parkingNotes: string;
  apartmentTips: string;
  officeTips: string;
  storageInfo: string;
  regulations: string | null;
  averages: ReturnType<typeof cityAverages>;
}

// ── Curated metadata (real data where we have it) ──────────────────────────
interface CityMeta {
  county?: string;
  zips?: string[];
  highways?: string[];
  regulations?: string;
  parking?: string;
}

export const CITY_META: Record<string, CityMeta> = {
  "los-angeles": {
    county: "Los Angeles County",
    zips: ["90001", "90012", "90024", "90026", "90034", "90045", "90064", "90068"],
    highways: ["I-5", "I-10", "I-405", "US-101", "I-110"],
    regulations:
      "Los Angeles requires temporary no-parking permits from LADOT for curbside truck staging on most residential streets. Permits are posted 24–72 hours in advance.",
    parking:
      "Street parking is tight in Hollywood, Koreatown and Downtown. Most moves need an LADOT temporary no-parking permit or a reserved loading dock.",
  },
  "new-york": {
    county: "New York County",
    zips: ["10001", "10011", "10016", "10021", "10025", "11201", "11215", "11222"],
    highways: ["I-95", "I-278", "I-495", "FDR Drive", "BQE"],
    regulations:
      "Most NYC buildings require a Certificate of Insurance naming the building as additional insured, plus a reserved freight-elevator window booked with management.",
    parking:
      "Alternate-side parking rules and loading-zone limits make early-morning starts essential. Crews often stage on the avenue and long-carry to the door.",
  },
  chicago: {
    county: "Cook County",
    zips: ["60601", "60614", "60618", "60622", "60625", "60640", "60647", "60657"],
    highways: ["I-90", "I-94", "I-290", "I-55", "Lake Shore Drive"],
    regulations:
      "Chicago requires a moving-truck parking permit in most residential permit zones; the city issues temporary signs that must be posted 24 hours ahead.",
  },
  houston: { county: "Harris County", highways: ["I-45", "I-10", "I-610", "US-59"] },
  phoenix: { county: "Maricopa County", highways: ["I-10", "I-17", "Loop 101", "Loop 202"] },
  philadelphia: { county: "Philadelphia County", highways: ["I-95", "I-76", "I-676"] },
  "san-antonio": { county: "Bexar County", highways: ["I-10", "I-35", "I-410", "Loop 1604"] },
  "san-diego": { county: "San Diego County", highways: ["I-5", "I-8", "I-15", "I-805"] },
  dallas: { county: "Dallas County", highways: ["I-30", "I-35E", "I-45", "US-75"] },
  austin: { county: "Travis County", highways: ["I-35", "US-183", "MoPac (Loop 1)", "SH-71"] },
  "san-francisco": {
    county: "San Francisco County",
    zips: ["94102", "94110", "94114", "94117", "94123", "94131"],
    highways: ["US-101", "I-80", "I-280"],
    parking:
      "SFMTA temporary no-parking permits are required for most curbside moves and must be posted 72 hours in advance.",
  },
  seattle: { county: "King County", highways: ["I-5", "I-90", "SR-99", "SR-520"] },
  denver: { county: "Denver County", highways: ["I-25", "I-70", "I-225", "US-6"] },
  boston: { county: "Suffolk County", highways: ["I-93", "I-90 (Mass Pike)", "US-1"] },
  miami: { county: "Miami-Dade County", highways: ["I-95", "I-195", "I-395", "US-1"] },
  atlanta: { county: "Fulton County", highways: ["I-75", "I-85", "I-20", "I-285"] },
  portland: { county: "Multnomah County", highways: ["I-5", "I-84", "I-405", "US-26"] },
  washington: { county: "District of Columbia", highways: ["I-395", "I-295", "US-50"] },
  "las-vegas": { county: "Clark County", highways: ["I-15", "US-95", "I-215"] },
  nashville: { county: "Davidson County", highways: ["I-40", "I-24", "I-65", "I-440"] },
  charlotte: { county: "Mecklenburg County", highways: ["I-77", "I-85", "I-485"] },
  pasadena: { county: "Los Angeles County", highways: ["I-210", "SR-134", "SR-110"] },
  glendale: { county: "Los Angeles County", highways: ["I-5", "SR-134", "SR-2"] },
  burbank: { county: "Los Angeles County", highways: ["I-5", "SR-134", "SR-170"] },
  irvine: { county: "Orange County", highways: ["I-5", "I-405", "SR-133"] },
  scottsdale: { county: "Maricopa County", highways: ["Loop 101", "SR-51"] },
  tempe: { county: "Maricopa County", highways: ["I-10", "US-60", "Loop 202"] },
  plano: { county: "Collin County", highways: ["US-75", "SH-121", "Dallas North Tollway"] },
  frisco: { county: "Collin County", highways: ["SH-121", "Dallas North Tollway"] },
};

// ── Time zones by state ────────────────────────────────────────────────────
const TZ_BY_STATE: Record<string, string> = {
  CA: "Pacific Time (PT)", WA: "Pacific Time (PT)", OR: "Pacific Time (PT)",
  NV: "Pacific Time (PT)", AZ: "Mountain Standard Time (no DST)",
  UT: "Mountain Time (MT)", CO: "Mountain Time (MT)", NM: "Mountain Time (MT)",
  MT: "Mountain Time (MT)", WY: "Mountain Time (MT)", ID: "Mountain Time (MT)",
  TX: "Central Time (CT)", IL: "Central Time (CT)", MN: "Central Time (CT)",
  WI: "Central Time (CT)", IA: "Central Time (CT)", MO: "Central Time (CT)",
  AR: "Central Time (CT)", LA: "Central Time (CT)", OK: "Central Time (CT)",
  KS: "Central Time (CT)", NE: "Central Time (CT)", SD: "Central Time (CT)",
  ND: "Central Time (CT)", MS: "Central Time (CT)", AL: "Central Time (CT)",
  TN: "Central Time (CT)", KY: "Eastern Time (ET)", AK: "Alaska Time (AKT)",
  HI: "Hawaii-Aleutian Time (HST)",
};

export function timezoneFor(stateCode: string): string {
  return TZ_BY_STATE[stateCode] ?? "Eastern Time (ET)";
}

// ── Slug helpers ───────────────────────────────────────────────────────────
// Canonical URL shape: /moving-calculator/glendale-ca
export const LANDING_PREFIX = "moving-calculator-";
export const LANDING_BASE = "/moving-calculator";

/** Storage slug — "glendale-ca" (legacy rows may carry the old prefix). */
export function landingSlugFor(citySlug: string, stateCode: string): string {
  return `${citySlug}-${stateCode.toLowerCase()}`;
}

export function landingPathFor(citySlug: string, stateCode: string): string {
  return `${LANDING_BASE}/${landingSlugFor(citySlug, stateCode)}`;
}

/** Accepts both the legacy prefixed slug and the new bare slug. */
export function landingPathForSlug(slug: string): string {
  return `${LANDING_BASE}/${slug.replace(new RegExp(`^${LANDING_PREFIX}`), "")}`;
}

/** "los-angeles-ca" → { citySlug: "los-angeles", stateCode: "CA" } */
export function parseLandingParam(param: string): { citySlug: string; stateCode: string } | null {
  const clean = param.toLowerCase().replace(new RegExp(`^${LANDING_PREFIX}`), "");
  const m = clean.match(/^(.+)-([a-z]{2})$/);
  if (!m) return null;
  return { citySlug: m[1]!, stateCode: m[2]!.toUpperCase() };
}

// ── Stage 2: SEO landing page (/movers/glendale-ca) ────────────────────────
// The SEO page ALWAYS embeds the one official calculator — it never clones it.
export const MOVERS_BASE = "/movers";

/** Storage slug for the SEO page — "movers-glendale-ca". */
export function moversSlugFor(citySlug: string, stateCode: string): string {
  return `movers-${citySlug}-${stateCode.toLowerCase()}`;
}

export function moversPathFor(citySlug: string, stateCode: string): string {
  return `${MOVERS_BASE}/${citySlug}-${stateCode.toLowerCase()}`;
}

/** "movers-glendale-ca" | "glendale-ca" → "/movers/glendale-ca" */
export function moversPathForSlug(slug: string): string {
  return `${MOVERS_BASE}/${slug.replace(/^movers-/, "")}`;
}


// ── Fact builder ───────────────────────────────────────────────────────────
export function buildCityFacts(c: GeoCity): CityFacts {
  const meta = CITY_META[c.slug] ?? {};
  const nearby = GEO_CITIES.filter(
    (o) => o.slug !== c.slug && (o.stateCode === c.stateCode || o.stateSlug === c.stateSlug),
  )
    .slice(0, 8)
    .map((o) => ({
      name: o.name,
      state: o.stateCode,
      slug: o.slug,
      path: landingPathFor(o.slug, o.stateCode),
    }));

  return {
    slug: c.slug,
    landingSlug: landingSlugFor(c.slug, c.stateCode),
    path: landingPathFor(c.slug, c.stateCode),
    city: c.name,
    stateCode: c.stateCode,
    stateName: c.stateName,
    stateSlug: c.stateSlug,
    county: meta.county ?? null,
    population: c.population,
    timezone: timezoneFor(c.stateCode),
    zipCodes: meta.zips ?? [],
    neighborhoods: neighborhoodsFor(c.slug, c.name),
    highways: meta.highways ?? [],
    nearbyCities: nearby,
    parkingNotes:
      meta.parking ??
      `Curbside access in ${c.name} varies by neighborhood. Where a permit or reserved loading zone is required, your assigned ${c.name} mover arranges it before move day and includes it in the quote.`,
    apartmentTips: `Most ${c.name} apartment buildings require an elevator reservation and a certificate of insurance. Book the freight elevator 24–48 hours ahead and confirm loading-dock hours with management.`,
    officeTips: `Office moves in ${c.name} are usually scheduled after hours or over a weekend to avoid building traffic. Plan IT disconnect/reconnect, floor protection and a certificate of insurance for both buildings.`,
    storageInfo: `Short-term storage-in-transit is available across ${c.name} in climate-controlled warehouse vaults. Typical rates run $95–$220 per month depending on volume, with the first 30 days often discounted on long-distance moves.`,
    regulations: meta.regulations ?? null,
    averages: cityAverages(c),
  };
}

export function allCityFacts(): CityFacts[] {
  return GEO_CITIES.map(buildCityFacts);
}

export function findCityFacts(citySlug: string, stateCode?: string): CityFacts | null {
  const c = GEO_CITIES.find(
    (g) => g.slug === citySlug && (!stateCode || g.stateCode === stateCode),
  );
  return c ? buildCityFacts(c) : null;
}

export function cityFactsForState(stateCode: string): CityFacts[] {
  return GEO_CITIES.filter((c) => c.stateCode === stateCode).map(buildCityFacts);
}
