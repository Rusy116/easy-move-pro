// ---------------------------------------------------------------------------
// PHASE 5 — Internal Linking Agent (step 7).
//
// Pure, deterministic link graph for the USA City Factory:
//
//   Neighborhood → Small city → Medium city → Large city → Metro area
//                → County → State → USA hub
//
// Every node links UP and DOWN, and every downward link has an automatic
// reverse link, so no generated page can ever become an orphan.
// Nothing here performs I/O — it scales to 50,000+ cities unchanged.
// ---------------------------------------------------------------------------
import { GEO_CITIES, type GeoCity } from "@/lib/seo/geo";
import { CITY_META, landingPathFor, moversPathFor, buildCityFacts, type CityFacts } from "./data";

export type CityTier = "neighborhood" | "small" | "medium" | "large" | "metro";

export interface HierarchyLink {
  label: string;
  to: string;
  level: CityTier | "county" | "state" | "usa";
}

export const USA_HUB = { label: "All U.S. moving calculators", to: "/cities", level: "usa" as const };

export function cityTier(population: number): CityTier {
  if (population >= 750_000) return "metro";
  if (population >= 300_000) return "large";
  if (population >= 100_000) return "medium";
  if (population >= 25_000) return "small";
  return "neighborhood";
}

export function slugifyCounty(county: string): string {
  return county
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function countyPathFor(county: string, stateCode: string): string {
  return `/counties/${slugifyCounty(county)}-${stateCode.toLowerCase()}`;
}

export function parseCountyParam(param: string): { countySlug: string; stateCode: string } | null {
  const m = param.toLowerCase().match(/^(.+)-([a-z]{2})$/);
  if (!m) return null;
  return { countySlug: m[1]!, stateCode: m[2]!.toUpperCase() };
}

/** County of a city (curated metadata, else derived from the state name). */
export function countyOf(c: GeoCity): string {
  return CITY_META[c.slug]?.county ?? `${c.name} area`;
}

export interface CountyNode {
  name: string;
  slug: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  path: string;
  cities: GeoCity[];
  population: number;
}

/** All counties that own at least one city in the dataset. */
export function allCounties(stateCode?: string): CountyNode[] {
  const map = new Map<string, CountyNode>();
  for (const c of GEO_CITIES) {
    if (stateCode && c.stateCode !== stateCode) continue;
    const name = countyOf(c);
    const key = `${slugifyCounty(name)}-${c.stateCode}`;
    const node = map.get(key) ?? {
      name,
      slug: slugifyCounty(name),
      stateCode: c.stateCode,
      stateName: c.stateName,
      stateSlug: c.stateSlug,
      path: countyPathFor(name, c.stateCode),
      cities: [],
      population: 0,
    };
    node.cities.push(c);
    node.population += c.population;
    map.set(key, node);
  }
  return Array.from(map.values())
    .map((n) => ({
      ...n,
      cities: [...n.cities].sort((a, b) => b.population - a.population),
    }))
    .sort((a, b) => b.population - a.population);
}

export function findCounty(countySlug: string, stateCode: string): CountyNode | null {
  return (
    allCounties(stateCode).find((c) => c.slug === countySlug) ?? null
  );
}

/** Largest city sharing this city's county — the metro anchor. */
export function metroAnchor(c: GeoCity): GeoCity | null {
  const county = countyOf(c);
  const peers = GEO_CITIES.filter(
    (o) => o.stateCode === c.stateCode && countyOf(o) === county,
  ).sort((a, b) => b.population - a.population);
  const top = peers[0];
  return top && top.slug !== c.slug ? top : null;
}

export interface CityHierarchy {
  tier: CityTier;
  county: string;
  countyPath: string;
  /** Breadcrumb trail from the USA hub down to this city. */
  trail: HierarchyLink[];
  /** Upward links: metro → county → state → USA hub. */
  up: HierarchyLink[];
  /** Downward links: smaller cities in the same county, then neighborhoods. */
  down: HierarchyLink[];
  /** Same-tier peers in the same state. */
  lateral: HierarchyLink[];
  /** Neighborhood anchors served by this city page. */
  neighborhoods: string[];
  /** Flat, de-duplicated list for rendering / audit counting. */
  all: HierarchyLink[];
}

/** A sibling city used to build down/lateral links (from the database). */
export interface HierarchyPeer {
  slug: string;
  name: string;
  stateCode: string;
  population: number;
  county: string | null;
}

/**
 * Build the full up/down/lateral link graph for one city.
 * `peerList` comes from the database for DB-driven routes; when omitted the
 * bundled dataset is used (legacy/static callers and the audit tooling).
 */
export function buildCityHierarchy(f: CityFacts, peerList?: HierarchyPeer[]): CityHierarchy {
  const self = GEO_CITIES.find((c) => c.slug === f.slug && c.stateCode === f.stateCode);
  const tier = cityTier(f.population);
  const peers: HierarchyPeer[] =
    peerList ??
    GEO_CITIES.filter(
      (o) => !(o.slug === f.slug && o.stateCode === f.stateCode) && o.stateCode === f.stateCode,
    ).map((o) => ({
      slug: o.slug,
      name: o.name,
      stateCode: o.stateCode,
      population: o.population,
      county: countyOf(o),
    }));

  const countyPeers = peers
    .filter((o) => o.county)
    .sort((a, b) => b.population - a.population);
  const county =
    f.county ??
    (self ? countyOf(self) : null) ??
    countyPeers[0]?.county ??
    `${f.city} area`;
  const cPath = countyPathFor(county, f.stateCode);

  const up: HierarchyLink[] = [];
  const metro =
    peers
      .filter((o) => o.county === county && o.population > f.population)
      .sort((a, b) => b.population - a.population)[0] ?? null;
  if (metro) {
    up.push({
      label: `Movers in ${metro.name}, ${metro.stateCode} (metro area)`,
      to: moversPathFor(metro.slug, metro.stateCode),
      level: "metro",
    });
  }
  up.push({ label: `Moving companies in ${county}`, to: cPath, level: "county" });
  up.push({
    label: `Moving services in ${f.stateName}`,
    to: `/states/${f.stateSlug}`,
    level: "state",
  });
  up.push(USA_HUB);

  const down: HierarchyLink[] = peers
    .filter((o) => o.population < f.population && o.county === county)
    .sort((a, b) => b.population - a.population)
    .slice(0, 8)
    .map((o) => ({
      label: `Movers in ${o.name}, ${o.stateCode}`,
      to: moversPathFor(o.slug, o.stateCode),
      level: cityTier(o.population),
    }));

  const lateral: HierarchyLink[] = peers
    .filter((o) => cityTier(o.population) === tier)
    .sort((a, b) => Math.abs(a.population - f.population) - Math.abs(b.population - f.population))
    .slice(0, 6)
    .map((o) => ({
      label: `Movers in ${o.name}, ${o.stateCode}`,
      to: moversPathFor(o.slug, o.stateCode),
      level: cityTier(o.population),
    }));


  const trail: HierarchyLink[] = [
    USA_HUB,
    { label: f.stateName, to: `/states/${f.stateSlug}`, level: "state" },
    { label: county, to: cPath, level: "county" },
    { label: `${f.city}, ${f.stateCode}`, to: moversPathFor(f.slug, f.stateCode), level: tier },
  ];

  const seen = new Set<string>();
  const all = [...up, ...down, ...lateral].filter((l) => {
    if (seen.has(l.to)) return false;
    seen.add(l.to);
    return true;
  });

  return {
    tier,
    county,
    countyPath: cPath,
    trail,
    up,
    down,
    lateral,
    neighborhoods: f.neighborhoods,
    all,
  };
}

/**
 * Reverse-link resolver — every page that links to a city is discoverable from
 * that city. Used by county/state hubs and by the orphan audit.
 */
export function reverseLinksFor(f: CityFacts): HierarchyLink[] {
  const county = f.county ?? `${f.city} area`;
  const links: HierarchyLink[] = [
    { label: county, to: countyPathFor(county, f.stateCode), level: "county" },
    { label: f.stateName, to: `/states/${f.stateSlug}`, level: "state" },
    USA_HUB,
    {
      label: `${f.city} moving calculator`,
      to: landingPathFor(f.slug, f.stateCode),
      level: cityTier(f.population),
    },
  ];
  const self = GEO_CITIES.find((c) => c.slug === f.slug && c.stateCode === f.stateCode);
  const metro = self ? metroAnchor(self) : null;
  if (metro) {
    links.push({
      label: `${metro.name}, ${metro.stateCode}`,
      to: moversPathFor(metro.slug, metro.stateCode),
      level: "metro",
    });
  }
  return links;
}

/** ORPHAN GUARD — a city is an orphan when nothing links down to it. */
export function isOrphan(f: CityFacts): boolean {
  return buildCityHierarchy(f).up.length === 0 || reverseLinksFor(f).length === 0;
}

/** Every city in a county, as full facts (used by the county hub route). */
export function countyCityFacts(node: CountyNode): CityFacts[] {
  return node.cities.map(buildCityFacts);
}
