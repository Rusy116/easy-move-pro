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
import { MIN_INDEX_WORDS, MIN_INDEX_SEO_SCORE, MIN_INDEX_POPULATION } from "./quality";

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
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const proc =
    typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);

  // Keep each URL paired with a key from the same source. The build-inlined
  // browser pair is the verified public-read configuration on external hosts;
  // use the server process pair only when that complete Vite pair is absent.
  const pairs: Array<[string | undefined, string | undefined]> = [
    [env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_ANON_KEY"]],
    [proc["SUPABASE_URL"], proc["SUPABASE_PUBLISHABLE_KEY"] ?? proc["SUPABASE_ANON_KEY"]],
  ];
  const [url, key] = pairs.find(([u, k]) => Boolean(u && k)) ?? [undefined, undefined];

  if (!url || !key) {
    console.error("[city-landing] missing backend config for public city reads");
    return null;
  }
  return createClient<Database>(url, key, {
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

function logReadFailure(operation: string, error: unknown) {
  const value = error as { code?: unknown; message?: unknown } | null;
  const code = typeof value?.code === "string" ? value.code : "unknown";
  const message =
    typeof value?.message === "string"
      ? value.message
      : error instanceof Error
        ? error.message
        : "Unknown public read failure";
  console.error(`[city-landing] ${operation} failed (${code}): ${message}`);
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
    const db = client();
    if (!db) return null;
    const { data, error } = await db
      .from("city_landing_pages")
      .select(ROW_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) logReadFailure("readCityPage", error);
    return (data as unknown as CityPageRow) ?? null;
  } catch (error) {
    logReadFailure("readCityPage", error);
    return null;
  }
}

/** Published cities in a state, largest first. */
export async function readCitiesByState(
  stateCode: string,
  limit = 400,
): Promise<CityListItem[]> {
  try {
    const db = client();
    if (!db) return [];
    const { data, error } = await db
      .from("city_landing_pages")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .eq("state_code", stateCode.toUpperCase())
      .order("population", { ascending: false })
      .limit(limit);
    if (error) logReadFailure("readCitiesByState", error);
    return ((data ?? []) as unknown as RawListRow[]).map(toListItem);
  } catch (error) {
    logReadFailure("readCitiesByState", error);
    return [];
  }
}

/** Published cities across the network, largest first (paged). */
export async function readPublishedCities(
  limit = 200,
  offset = 0,
): Promise<CityListItem[]> {
  try {
    const db = client();
    if (!db) return [];
    const { data, error } = await db
      .from("city_landing_pages")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("population", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) logReadFailure("readPublishedCities", error);
    return ((data ?? []) as unknown as RawListRow[]).map(toListItem);
  } catch (error) {
    logReadFailure("readPublishedCities", error);
    return [];
  }
}

/** Total published city pages (for the /cities hub copy + pagination). */
export async function countPublishedCities(): Promise<number> {
  try {
    const db = client();
    if (!db) return 0;
    const { count, error } = await db
      .from("city_landing_pages")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published");
    if (error) logReadFailure("countPublishedCities", error);
    return count ?? 0;
  } catch (error) {
    logReadFailure("countPublishedCities", error);
    return 0;
  }
}

/**
 * Quality gate applied in the database so low-value pages never reach the
 * sitemap and we never transfer rows we are going to throw away.
 */
function indexableQuery(db: NonNullable<ReturnType<typeof client>>, columns: string, head = false) {
  return db
    .from("city_landing_pages")
    .select(columns, head ? { count: "exact", head: true } : undefined)
    .eq("status", "published")
    .gte("word_count", MIN_INDEX_WORDS)
    .gte("seo_score", MIN_INDEX_SEO_SCORE)
    .gte("population", MIN_INDEX_POPULATION)
    .not("zip_codes", "is", null);
}

/** How many city pages currently qualify for indexing. */
export async function countIndexableCities(): Promise<number> {
  try {
    const db = client();
    if (!db) return 0;
    const { count, error } = await indexableQuery(db, "slug", true);
    if (error) logReadFailure("countIndexableCities", error);
    return count ?? 0;
  } catch (error) {
    logReadFailure("countIndexableCities", error);
    return 0;
  }
}

/**
 * One page of indexable slugs for an XML sitemap part. Paged in the database
 * (LIMIT/OFFSET) — we never load the whole city table to build one file.
 */
export async function readIndexableSlugs(
  limit: number,
  offset: number,
): Promise<Array<{ slug: string; seoPublished: boolean }>> {
  try {
    const db = client();
    if (!db) return [];
    // The Data API caps a single response at 1000 rows, so the requested slice
    // is filled with deterministic 1000-row batches (same filters + ordering).
    const BATCH = 1000;
    const out: Array<{ slug: string; seoPublished: boolean }> = [];
    while (out.length < limit) {
      const from = offset + out.length;
      const size = Math.min(BATCH, limit - out.length);
      const { data, error } = await indexableQuery(db, "slug, seo_status")
        .order("population", { ascending: false })
        .order("slug", { ascending: true })
        .range(from, from + size - 1);
      if (error) {
        logReadFailure("readIndexableSlugs", error);
        break;
      }
      const rows = (data ?? []) as unknown as Array<{ slug: string; seo_status: string | null }>;
      for (const r of rows) {
        out.push({ slug: r.slug, seoPublished: r.seo_status === "published" });
      }
      if (rows.length < size) break; // source exhausted
    }
    return out;
  } catch (error) {
    logReadFailure("readIndexableSlugs", error);
    return [];
  }
}

