// ---------------------------------------------------------------------------
// PHASE 5 — USA DATA ENGINE: master city dataset layer.
//
// Pure, SSR-safe derivation of a canonical city record from the geo dataset.
// The import engine writes these records into public.usa_cities, which then
// becomes THE permanent master source for every production pipeline.
//
// Scale/expansion notes:
//  • `country` is part of the record and of the DB unique key, so Canada and
//    Mexico can be added later as data only — no schema or code redesign.
//  • Nothing here performs I/O, so importing 50,000+ records is a streaming,
//    cursor-based operation handled by the import run.
// ---------------------------------------------------------------------------
import { GEO_CITIES, type GeoCity } from "@/lib/seo/geo";
import {
  CITY_META,
  timezoneFor,
  landingSlugFor,
  moversSlugFor,
} from "@/lib/city-landing/data";

export interface MasterCity {
  country: string;
  city_slug: string;
  city_name: string;
  state_name: string;
  state_code: string;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  population: number;
  timezone: string;
  zip_codes: string[];
  area_codes: string[];
  nearby_cities: Array<{ name: string; state: string; slug: string }>;
  demand_score: number;
  seo_priority: number;
  calculator_slug: string;
  seo_slug: string;
}

/** Coordinates + area codes for major metros (extend freely — data only). */
const GEO_EXTRA: Record<string, { lat: number; lng: number; area: string[] }> = {
  "new-york": { lat: 40.7128, lng: -74.006, area: ["212", "718", "917", "347"] },
  "los-angeles": { lat: 34.0522, lng: -118.2437, area: ["213", "323", "310", "424"] },
  chicago: { lat: 41.8781, lng: -87.6298, area: ["312", "773", "872"] },
  houston: { lat: 29.7604, lng: -95.3698, area: ["713", "281", "832"] },
  phoenix: { lat: 33.4484, lng: -112.074, area: ["602", "480", "623"] },
  philadelphia: { lat: 39.9526, lng: -75.1652, area: ["215", "267"] },
  "san-antonio": { lat: 29.4241, lng: -98.4936, area: ["210", "726"] },
  "san-diego": { lat: 32.7157, lng: -117.1611, area: ["619", "858"] },
  dallas: { lat: 32.7767, lng: -96.797, area: ["214", "469", "972"] },
  austin: { lat: 30.2672, lng: -97.7431, area: ["512", "737"] },
  "san-francisco": { lat: 37.7749, lng: -122.4194, area: ["415", "628"] },
  seattle: { lat: 47.6062, lng: -122.3321, area: ["206"] },
  denver: { lat: 39.7392, lng: -104.9903, area: ["303", "720"] },
  boston: { lat: 42.3601, lng: -71.0589, area: ["617", "857"] },
  miami: { lat: 25.7617, lng: -80.1918, area: ["305", "786"] },
  atlanta: { lat: 33.749, lng: -84.388, area: ["404", "470", "678"] },
  portland: { lat: 45.5152, lng: -122.6784, area: ["503", "971"] },
  washington: { lat: 38.9072, lng: -77.0369, area: ["202"] },
  "las-vegas": { lat: 36.1699, lng: -115.1398, area: ["702", "725"] },
  nashville: { lat: 36.1627, lng: -86.7816, area: ["615", "629"] },
  charlotte: { lat: 35.2271, lng: -80.8431, area: ["704", "980"] },
  glendale: { lat: 34.1425, lng: -118.2551, area: ["818"] },
  pasadena: { lat: 34.1478, lng: -118.1445, area: ["626"] },
  burbank: { lat: 34.1808, lng: -118.309, area: ["818"] },
  irvine: { lat: 33.6846, lng: -117.8265, area: ["949"] },
  plano: { lat: 33.0198, lng: -96.6989, area: ["972", "469"] },
  frisco: { lat: 33.1507, lng: -96.8236, area: ["972", "214"] },
  scottsdale: { lat: 33.4942, lng: -111.9261, area: ["480"] },
  tempe: { lat: 33.4255, lng: -111.94, area: ["480"] },
};

/** High-mobility states carry a demand multiplier (US census migration data). */
const STATE_DEMAND: Record<string, number> = {
  TX: 1.2, FL: 1.2, AZ: 1.15, NC: 1.12, TN: 1.12, SC: 1.1, GA: 1.08,
  NV: 1.08, CO: 1.06, WA: 1.04, CA: 1.0, NY: 0.98, IL: 0.94, NJ: 0.96,
};

/** 0–100 moving demand score, derived from population + state migration. */
export function demandScore(population: number, stateCode: string): number {
  const base = Math.min(100, Math.log10(Math.max(population, 1000)) * 18);
  return Math.round(Math.min(100, base * (STATE_DEMAND[stateCode] ?? 1)));
}

/** 1 (highest) … 5 — drives production queue ordering. */
export function seoPriority(population: number, demand: number): number {
  if (population >= 750_000 || demand >= 92) return 1;
  if (population >= 300_000 || demand >= 86) return 2;
  if (population >= 120_000) return 3;
  if (population >= 40_000) return 4;
  return 5;
}

export function toMasterCity(c: GeoCity): MasterCity {
  const meta = CITY_META[c.slug] ?? {};
  const extra = GEO_EXTRA[c.slug];
  const demand = demandScore(c.population, c.stateCode);
  const nearby = GEO_CITIES.filter(
    (o) => o.slug !== c.slug && o.stateCode === c.stateCode,
  )
    .slice(0, 8)
    .map((o) => ({ name: o.name, state: o.stateCode, slug: o.slug }));

  return {
    country: "US",
    city_slug: c.slug,
    city_name: c.name,
    state_name: c.stateName,
    state_code: c.stateCode,
    county: meta.county ?? null,
    latitude: extra?.lat ?? null,
    longitude: extra?.lng ?? null,
    population: c.population,
    timezone: timezoneFor(c.stateCode),
    zip_codes: meta.zips ?? [],
    area_codes: extra?.area ?? [],
    nearby_cities: nearby,
    demand_score: demand,
    seo_priority: seoPriority(c.population, demand),
    calculator_slug: landingSlugFor(c.slug, c.stateCode),
    seo_slug: moversSlugFor(c.slug, c.stateCode),
  };
}

/** Source-of-truth catalog, ordered by SEO priority then population. */
export function masterCatalog(stateCode?: string): MasterCity[] {
  return GEO_CITIES.filter((c) => !stateCode || c.stateCode === stateCode)
    .map(toMasterCity)
    .sort(
      (a, b) => a.seo_priority - b.seo_priority || b.population - a.population,
    );
}

/** Total addressable cities available to the import engine. */
export function catalogSize(stateCode?: string): number {
  return stateCode
    ? GEO_CITIES.filter((c) => c.stateCode === stateCode).length
    : GEO_CITIES.length;
}

/** QUALITY CONTROL — a city may only enter production with complete data. */
export function validateMasterCity(c: MasterCity): string[] {
  const issues: string[] = [];
  if (!c.city_name.trim()) issues.push("Missing city name");
  if (!/^[A-Z]{2}$/.test(c.state_code)) issues.push("Invalid state code");
  if (!c.state_name.trim()) issues.push("Missing state name");
  if (!c.city_slug.match(/^[a-z0-9-]+$/)) issues.push("Invalid slug");
  if (c.population <= 0) issues.push("Missing population");
  if (!c.timezone) issues.push("Missing time zone");
  return issues;
}
