/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// MASTER DATASET readers (server only).
//
// Every production entry point pulls its city pool from public.usa_cities so
// the factory scales to the full 29k+ US dataset instead of the hardcoded geo
// seed list. The geo seed remains a fallback for curated cities.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityFacts } from "./data";
import { factsFromMasterRow, type MasterCityRow } from "./master";

type Db = SupabaseClient<any, "public", any>;

const SELECT =
  "city_slug, city_name, state_code, state_name, county, population, zip_codes, aliases, nearby_cities, seo_priority";

/** Highest-priority cities of a state, ordered big metro → small town. */
export async function masterFactsForState(
  db: Db,
  stateCode: string,
  limit = 5000,
): Promise<CityFacts[]> {
  const { data } = await db
    .from("usa_cities")
    .select(SELECT)
    .eq("state_code", stateCode)
    .order("seo_priority", { ascending: true })
    .order("population", { ascending: false })
    .limit(limit);
  return ((data ?? []) as MasterCityRow[]).map(factsFromMasterRow);
}

/** Single city lookup from the master dataset. */
export async function masterFactsForCity(
  db: Db,
  citySlug: string,
  stateCode: string,
): Promise<CityFacts | null> {
  const { data } = await db
    .from("usa_cities")
    .select(SELECT)
    .eq("city_slug", citySlug)
    .eq("state_code", stateCode)
    .maybeSingle();
  return data ? factsFromMasterRow(data as MasterCityRow) : null;
}

/** States that still have unproduced cities, in production priority order. */
export async function masterStatesWithWork(db: Db): Promise<string[]> {
  const { data } = await db
    .from("usa_cities")
    .select("state_code, seo_priority")
    .neq("pipeline_status", "published")
    .order("seo_priority", { ascending: true })
    .limit(20000);
  const seen: string[] = [];
  for (const r of (data ?? []) as Array<{ state_code: string }>) {
    if (!seen.includes(r.state_code)) seen.push(r.state_code);
  }
  return seen;
}
