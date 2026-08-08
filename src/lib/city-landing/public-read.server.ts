// ---------------------------------------------------------------------------
// Public, database-driven reads for the city page network.
//
// This module is the ONLY source of truth for public city routes. It reads
// `public.city_landing_pages` through the publishable key, so the existing
// "Published city pages are public" row policy applies. No admin key, no
// service role, and no bundled city list.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface CityPageRow {
  slug: string;
  city: string;
  state_code: string;
  state_name: string | null;
  county: string | null;
  population: number | null;
  zip_codes: string[] | null;
  neighborhoods: string[] | null;
  highways: string[] | null;
  nearby_cities: unknown;
  facts: unknown;
  content: unknown;
  seo_content: unknown;
  media: unknown;
  status: string;
  seo_status: string | null;
  published_at: string | null;
  seo_published_at: string | null;
  word_count: number | null;
  seo_score: number | null;
}

export interface CityListItem {
  slug: string;
  city: string;
  stateCode: string;
  stateName: string;
  county: string | null;
  population: number;
  seoPublished: boolean;
}

const ROW_COLUMNS =
  "slug, city, state_code, state_name, county, population, zip_codes, neighborhoods, highways, nearby_cities, facts, content, seo_content, media, status, seo_status, published_at, seo_published_at, word_count, seo_score";

const LIST_COLUMNS = "slug, city, state_code, state_name, county, population, seo_status";

function client() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

interface RawListRow {
  slug: string;
  city: string;
  state_code: string;
  state_name: string | null;
  county: string | null;
  population: number | null;
  seo_status: string | null;
}

function toListItem(r: RawListRow): CityListItem {
  return {
    slug: r.slug,
    city: r.city,
    stateCode: r.state_code,
    stateName: r.state_name ?? r.state_code,
    county: r.county,
    population: r.population ?? 0,
    seoPublished: r.seo_status === "published",
  };
}

/** One city page by its storage slug ("glendale-ca"). Published rows only. */
export async function readCityPage(slug: string): Promise<CityPageRow | null> {
  try {
    const { data } = await client()
      .from("city_landing_pages")
      .select(ROW_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return (data as unknown as CityPageRow) ?? null;
  } catch {
    return null;
  }
}

/** Published cities in a state, largest first. */
export async function readCitiesByState(
  stateCode: string,
  limit = 400,
): Promise<CityListItem[]> {
  try {
    const { data } = await client()
      .from("city_landing_pages")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .eq("state_code", stateCode.toUpperCase())
      .order("population", { ascending: false })
      .limit(limit);
    return ((data ?? []) as unknown as RawListRow[]).map(toListItem);
  } catch {
    return [];
  }
}

/** Published cities across the network, largest first (paged). */
export async function readPublishedCities(
  limit = 200,
  offset = 0,
): Promise<CityListItem[]> {
  try {
    const { data } = await client()
      .from("city_landing_pages")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("population", { ascending: false })
      .range(offset, offset + limit - 1);
    return ((data ?? []) as unknown as RawListRow[]).map(toListItem);
  } catch {
    return [];
  }
}

/** Total published city pages (for the /cities hub copy + pagination). */
export async function countPublishedCities(): Promise<number> {
  try {
    const { count } = await client()
      .from("city_landing_pages")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Every published slug, for the XML sitemap. Paged internally so the network
 * scales past PostgREST's per-request row cap without code changes.
 */
export async function readAllPublishedSlugs(): Promise<
  Array<{ slug: string; seoPublished: boolean }>
> {
  const out: Array<{ slug: string; seoPublished: boolean }> = [];
  const page = 1000;
  try {
    for (let offset = 0; offset < 60_000; offset += page) {
      const { data } = await client()
        .from("city_landing_pages")
        .select("slug, seo_status")
        .eq("status", "published")
        .order("slug", { ascending: true })
        .range(offset, offset + page - 1);
      const rows = (data ?? []) as unknown as Array<{ slug: string; seo_status: string | null }>;
      rows.forEach((r) => out.push({ slug: r.slug, seoPublished: r.seo_status === "published" }));
      if (rows.length < page) break;
    }
  } catch {
    /* fall through with whatever we collected */
  }
  return out;
}
