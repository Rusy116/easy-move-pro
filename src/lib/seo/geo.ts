// ---------------------------------------------------------------------------
// Phase 7 — Public SEO geo layer.
// Scalable state / city / route dataset used by the public website:
//   /california                         → state page
//   /california/los-angeles-movers      → city page
//   /routes/los-angeles-to-phoenix      → route page
// Pure data + helpers. No side effects, SSR-safe.
// ---------------------------------------------------------------------------
import { STATES, CITIES } from "./locations";

export interface GeoCity {
  slug: string; // "los-angeles"
  name: string; // "Los Angeles"
  stateCode: string; // "CA"
  stateName: string; // "California"
  stateSlug: string; // "california"
  population: number;
}

export interface GeoState {
  slug: string;
  name: string;
  code: string;
}

export const GEO_STATES: GeoState[] = STATES.map((s) => ({
  slug: s.slug,
  name: s.name,
  code: s.state!,
}));

const STATE_BY_CODE: Record<string, GeoState> = Object.fromEntries(
  GEO_STATES.map((s) => [s.code, s]),
);
const STATE_BY_SLUG: Record<string, GeoState> = Object.fromEntries(
  GEO_STATES.map((s) => [s.slug, s]),
);

// Additional high-intent suburbs / secondary metros (SEO long tail).
const EXTRA_CITIES: Array<[string, string, string, number]> = [
  ["pasadena", "Pasadena", "CA", 138699],
  ["glendale", "Glendale", "CA", 196543],
  ["irvine", "Irvine", "CA", 307670],
  ["santa-clarita", "Santa Clarita", "CA", 228673],
  ["burbank", "Burbank", "CA", 105319],
  ["san-bernardino", "San Bernardino", "CA", 222101],
  ["scottsdale", "Scottsdale", "AZ", 258069],
  ["tempe", "Tempe", "AZ", 195805],
  ["chandler", "Chandler", "AZ", 275987],
  ["gilbert", "Gilbert", "AZ", 267918],
  ["henderson", "Henderson", "NV", 320189],
  ["reno", "Reno", "NV", 264165],
  ["plano", "Plano", "TX", 285494],
  ["frisco", "Frisco", "TX", 200509],
  ["irving", "Irving", "TX", 256684],
  ["orlando", "Orlando", "FL", 307573],
  ["fort-lauderdale", "Fort Lauderdale", "FL", 182760],
  ["st-petersburg", "St. Petersburg", "FL", 258308],
  ["bellevue", "Bellevue", "WA", 151854],
  ["tacoma", "Tacoma", "WA", 219346],
  ["spokane", "Spokane", "WA", 228989],
  ["eugene", "Eugene", "OR", 176654],
  ["salem", "Salem", "OR", 174365],
  ["boulder", "Boulder", "CO", 108250],
  ["fort-collins", "Fort Collins", "CO", 169810],
  ["durham", "Durham", "NC", 283506],
  ["greensboro", "Greensboro", "NC", 296710],
  ["savannah", "Savannah", "GA", 147780],
  ["jersey-city", "Jersey City", "NJ", 292449],
  ["newark", "Newark", "NJ", 282011],
  ["salt-lake-city", "Salt Lake City", "UT", 200567],
  ["boise", "Boise", "ID", 235684],
  ["charleston", "Charleston", "SC", 150227],
  ["richmond", "Richmond", "VA", 226610],
  ["pittsburgh", "Pittsburgh", "PA", 302971],
  ["st-louis", "St. Louis", "MO", 301578],
  ["cincinnati", "Cincinnati", "OH", 309317],
  ["madison", "Madison", "WI", 269840],
  ["des-moines", "Des Moines", "IA", 214133],
  ["little-rock", "Little Rock", "AR", 197312],
];

function toGeo(slug: string, name: string, code: string, population: number): GeoCity | null {
  const st = STATE_BY_CODE[code];
  if (!st) return null;
  return { slug, name, stateCode: code, stateName: st.name, stateSlug: st.slug, population };
}

export const GEO_CITIES: GeoCity[] = [
  ...CITIES.map((c) => toGeo(c.slug, c.name, c.state!, c.population ?? 100000)),
  ...EXTRA_CITIES.map(([slug, name, code, pop]) => toGeo(slug, name, code, pop)),
]
  .filter((c): c is GeoCity => Boolean(c))
  .sort((a, b) => b.population - a.population);

const CITY_KEY = (stateSlug: string, citySlug: string) => `${stateSlug}/${citySlug}`;
const CITY_INDEX: Record<string, GeoCity> = Object.fromEntries(
  GEO_CITIES.map((c) => [CITY_KEY(c.stateSlug, c.slug), c]),
);

export function findState(slug: string): GeoState | undefined {
  return STATE_BY_SLUG[slug.toLowerCase()];
}

export function citiesInStateSlug(stateSlug: string): GeoCity[] {
  return GEO_CITIES.filter((c) => c.stateSlug === stateSlug);
}

/** Accepts either "los-angeles" or "los-angeles-movers". */
export function normalizeCitySlug(param: string): string {
  return param.toLowerCase().replace(/-movers$/, "");
}

export function findCity(stateSlug: string, cityParam: string): GeoCity | undefined {
  return CITY_INDEX[CITY_KEY(stateSlug.toLowerCase(), normalizeCitySlug(cityParam))];
}

export function findCityAnywhere(citySlug: string): GeoCity | undefined {
  return GEO_CITIES.find((c) => c.slug === citySlug);
}

export const cityPath = (c: GeoCity) => `/${c.stateSlug}/${c.slug}-movers`;
export const statePath = (s: { slug: string }) => `/states/${s.slug}`;

/** States that actually have city pages (used for indexes + sitemap). */
export const ACTIVE_STATES: GeoState[] = GEO_STATES.filter(
  (s) => citiesInStateSlug(s.slug).length > 0,
);

// ── Cost model ─────────────────────────────────────────────────────────────
// Deterministic averages used for SEO content only. The real price always
// comes from the quote calculator / pricing engine.
const HIGH_COST_STATES = ["CA", "NY", "MA", "WA", "HI", "DC", "NJ"];

export function cityAverages(c: GeoCity) {
  const popFactor = Math.min(1.35, 0.9 + c.population / 6_000_000);
  const stateFactor = HIGH_COST_STATES.includes(c.stateCode) ? 1.28 : 1;
  const studio = Math.round((900 * popFactor * stateFactor) / 10) * 10;
  const twoBed = Math.round((1750 * popFactor * stateFactor) / 10) * 10;
  const house = Math.round((3100 * popFactor * stateFactor) / 10) * 10;
  const hourly = Math.round(115 * popFactor * stateFactor);
  return { studio, twoBed, house, hourly };
}

// ── Route (city pair) pages ────────────────────────────────────────────────
export interface GeoRoute {
  slug: string; // "los-angeles-to-phoenix"
  from: GeoCity;
  to: GeoCity;
  miles: number;
  driveHours: number;
  low: number;
  high: number;
}

const ROUTE_PAIRS: Array<[string, string, number]> = [
  ["los-angeles", "phoenix", 373],
  ["los-angeles", "las-vegas", 270],
  ["los-angeles", "san-francisco", 382],
  ["los-angeles", "denver", 1015],
  ["los-angeles", "seattle", 1135],
  ["los-angeles", "austin", 1377],
  ["seattle", "portland", 174],
  ["seattle", "denver", 1316],
  ["san-francisco", "seattle", 808],
  ["san-francisco", "austin", 1750],
  ["new-york", "miami", 1280],
  ["new-york", "boston", 215],
  ["new-york", "chicago", 790],
  ["new-york", "los-angeles", 2790],
  ["new-york", "austin", 1745],
  ["chicago", "denver", 1000],
  ["chicago", "dallas", 925],
  ["chicago", "atlanta", 715],
  ["dallas", "houston", 240],
  ["dallas", "denver", 795],
  ["austin", "denver", 920],
  ["austin", "nashville", 875],
  ["houston", "atlanta", 790],
  ["miami", "atlanta", 660],
  ["atlanta", "charlotte", 245],
  ["denver", "phoenix", 820],
  ["phoenix", "las-vegas", 300],
  ["boston", "washington", 440],
  ["washington", "charlotte", 400],
  ["portland", "san-francisco", 635],
];

function buildRoute(fromSlug: string, toSlug: string, miles: number): GeoRoute | null {
  const from = findCityAnywhere(fromSlug);
  const to = findCityAnywhere(toSlug);
  if (!from || !to) return null;
  const base = miles <= 100 ? 1400 : 1900;
  const perMile = miles <= 500 ? 1.9 : 1.35;
  const mid = base + miles * perMile;
  return {
    slug: `${fromSlug}-to-${toSlug}`,
    from,
    to,
    miles,
    driveHours: Math.max(1, Math.round(miles / 55)),
    low: Math.round((mid * 0.82) / 25) * 25,
    high: Math.round((mid * 1.35) / 25) * 25,
  };
}

export const GEO_ROUTES: GeoRoute[] = ROUTE_PAIRS.map(([a, b, m]) => buildRoute(a, b, m)).filter(
  (r): r is GeoRoute => Boolean(r),
);

export function findRoute(slug: string): GeoRoute | undefined {
  return GEO_ROUTES.find((r) => r.slug === slug.toLowerCase());
}

export function routesForCity(citySlug: string): GeoRoute[] {
  return GEO_ROUTES.filter((r) => r.from.slug === citySlug || r.to.slug === citySlug);
}

export const routePath = (r: { slug: string }) => `/routes/${r.slug}`;

// ── Content generators ─────────────────────────────────────────────────────
export function cityFaq(c: GeoCity) {
  const a = cityAverages(c);
  return [
    {
      q: `How much do movers cost in ${c.name}, ${c.stateCode}?`,
      a: `Local moves in ${c.name} typically run about $${a.studio.toLocaleString()} for a studio, $${a.twoBed.toLocaleString()} for a two-bedroom, and $${a.house.toLocaleString()} for a full house. Hourly crews average around $${a.hourly}/hour. Your instant quote prices the actual inventory, access and distance instead of a guess.`,
    },
    {
      q: `How fast can I book a mover in ${c.name}?`,
      a: `Most ${c.name} requests are matched with a vetted moving company within a few hours. Companies have a 12-hour exclusive window to respond, so you are not spammed by a shared lead list.`,
    },
    {
      q: `Are ${c.name} moving companies on Easy Moving licensed and insured?`,
      a: `Yes. Every partner is reviewed before approval — license, DOT/MC where applicable, insurance and service area are all verified.`,
    },
    {
      q: `Do you handle long-distance moves out of ${c.name}?`,
      a: `We handle local, long-distance and interstate relocations from ${c.name} to anywhere in the United States, including auto transport and storage-in-transit.`,
    },
    {
      q: `When is the cheapest time to move in ${c.name}?`,
      a: `Mid-month, midweek dates between October and April are usually the lowest-cost windows in ${c.name}. Summer weekends and the first and last days of a month are the most expensive.`,
    },
  ];
}

export function routeFaq(r: GeoRoute) {
  return [
    {
      q: `How much does it cost to move from ${r.from.name} to ${r.to.name}?`,
      a: `Most households pay between $${r.low.toLocaleString()} and $${r.high.toLocaleString()} for the ${r.miles.toLocaleString()}-mile ${r.from.name} to ${r.to.name} move. Volume, packing and access drive the final number.`,
    },
    {
      q: `How long does the ${r.from.name} to ${r.to.name} move take?`,
      a: `Driving time is roughly ${r.driveHours} hours. Typical door-to-door delivery windows run ${r.miles < 400 ? "1–2 days" : r.miles < 1200 ? "2–5 days" : "4–10 days"} depending on the carrier's schedule.`,
    },
    {
      q: `Can I ship my car on this route?`,
      a: `Yes — auto transport can be bundled with the household shipment on ${r.from.name} to ${r.to.name} moves.`,
    },
    {
      q: `Do I need storage between pickup and delivery?`,
      a: `Storage-in-transit is available if your ${r.to.name} closing or lease start date does not line up with pickup.`,
    },
  ];
}
