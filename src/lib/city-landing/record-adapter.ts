// ---------------------------------------------------------------------------
// Maps a `city_landing_pages` row onto the shapes the existing public city
// components already render (CityFacts / CityLandingContent / MoversSeoContent).
//
// Stored JSON always wins, so published SEO copy renders byte-identical to the
// database. Generators are only used to fill a gap, never to overwrite.
// ---------------------------------------------------------------------------
import type { CityPageRow } from "./public-read.server";
import type { CityFacts } from "./data";
import { landingSlugFor, landingPathFor } from "./data";
import { buildCityLandingContent, type CityLandingContent } from "./content";
import { buildMoversSeoContent, type MoversSeoContent } from "./seo-page";
import { cityAverages } from "@/lib/seo/geo";
import { neighborhoodsFor } from "@/lib/seo/city-content";
import { stateName as usStateName } from "@/lib/us-states";

function stateSlugFor(_stateCode: string, stateName: string): string {
  return stateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "glendale-ca" → "glendale" */
export function citySlugOf(row: Pick<CityPageRow, "slug" | "state_code">): string {
  return row.slug.replace(new RegExp(`-${row.state_code.toLowerCase()}$`), "");
}

/** Full CityFacts for a stored row — stored `facts` first, derived as fallback. */
export function factsFromRow(row: CityPageRow): CityFacts {
  const stored = (row.facts ?? null) as Partial<CityFacts> | null;
  // Stored JSON only wins when it actually describes THIS city + state. A row
  // whose facts were generated for a same-named city in another state is
  // discarded and rebuilt from the row itself (cross-city contamination guard).
  const storedMatches =
    !!stored &&
    !!stored.city &&
    !!stored.stateCode &&
    stored.city.toLowerCase() === row.city.toLowerCase() &&
    stored.stateCode.toUpperCase() === row.state_code.toUpperCase();
  if (storedMatches && stored!.slug && stored!.averages) {
    return stored as CityFacts;
  }

  const slug = citySlugOf(row);
  const stateCode = row.state_code.toUpperCase();
  const stateName = row.state_name ?? usStateName(stateCode) ?? stateCode;
  const population = row.population ?? 0;
  const nearby = Array.isArray(row.nearby_cities)
    ? (row.nearby_cities as CityFacts["nearbyCities"])
    : [];

  return {
    slug,
    landingSlug: landingSlugFor(slug, stateCode),
    path: landingPathFor(slug, stateCode),
    city: row.city,
    stateCode,
    stateName,
    stateSlug: stateSlugFor(stateCode, stateName),
    county: row.county,
    population,
    timezone: (storedMatches ? (stored?.timezone as string) : undefined) ?? "Eastern Time (ET)",
    zipCodes: row.zip_codes ?? [],
    neighborhoods: row.neighborhoods?.length
      ? row.neighborhoods
      : neighborhoodsFor(slug, row.city, stateCode),
    highways: row.highways ?? [],
    nearbyCities: nearby,
    parkingNotes:
      (storedMatches ? stored?.parkingNotes : undefined) ??
      `Curbside access in ${row.city} varies by neighborhood. Where a permit or reserved loading zone is required, your assigned ${row.city} mover arranges it before move day and includes it in the quote.`,
    apartmentTips:
      (storedMatches ? stored?.apartmentTips : undefined) ??
      `Most ${row.city} apartment buildings require an elevator reservation and a certificate of insurance. Book the freight elevator 24–48 hours ahead and confirm loading-dock hours with management.`,
    officeTips:
      (storedMatches ? stored?.officeTips : undefined) ??
      `Office moves in ${row.city} are usually scheduled after hours or over a weekend to avoid building traffic. Plan IT disconnect/reconnect, floor protection and a certificate of insurance for both buildings.`,
    storageInfo:
      (storedMatches ? stored?.storageInfo : undefined) ??
      `Short-term storage-in-transit is available across ${row.city} in climate-controlled warehouse vaults, with the first 30 days often discounted on long-distance moves.`,
    regulations: (storedMatches ? stored?.regulations : undefined) ?? null,
    averages:
      (storedMatches ? stored?.averages : undefined) ??
      cityAverages({
        slug,
        name: row.city,
        stateCode,
        stateName,
        stateSlug: stateSlugFor(stateCode, stateName),
        population,
      }),
  };
}

/** Calculator-page copy — stored `content` first. */
export function contentFromRow(row: CityPageRow, facts: CityFacts): CityLandingContent {
  const stored = (row.content ?? null) as Partial<CityLandingContent> | null;
  if (stored && stored.title && Array.isArray(stored.sections)) {
    return stored as CityLandingContent;
  }
  return buildCityLandingContent(facts);
}

/** /movers SEO copy — stored `seo_content` first. */
export function seoFromRow(
  row: CityPageRow,
  facts: CityFacts,
  content: CityLandingContent,
): MoversSeoContent {
  const stored = (row.seo_content ?? null) as Partial<MoversSeoContent> | null;
  if (stored && stored.title && Array.isArray(stored.sections)) {
    return stored as MoversSeoContent;
  }
  return buildMoversSeoContent(facts, content);
}
