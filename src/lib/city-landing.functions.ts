// City Landing & Calculator Agent — server functions (typed RPC).
// Admin-gated generation + control; public read for published pages.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildCityFacts,
  findCityFacts,
  cityFactsForState,
  allCityFacts,
  parseLandingParam,
  type CityFacts,
} from "./city-landing/data";
import {
  buildCityLandingContent,
  validateCityContent,
  type CityLandingContent,
} from "./city-landing/content";

export interface CityLandingRecord {
  slug: string;
  city: string;
  state_code: string;
  facts: CityFacts;
  content: CityLandingContent;
  seo_score: number;
  word_count: number;
  status: string;
  published_at: string | null;
}

const AUTO_PUBLISH_SCORE = 95;

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

// ── Public read (used by the landing route loader; SSR/prerender safe) ─────
export const getPublishedCityPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 120) }))
  .handler(async ({ data }): Promise<CityLandingRecord | null> => {
    try {
      const { data: row } = await publicClient()
        .from("city_landing_pages")
        .select("slug, city, state_code, facts, content, seo_score, word_count, status, published_at")
        .eq("slug", data.slug)
        .eq("status", "published")
        .maybeSingle();
      return (row as unknown as CityLandingRecord) ?? null;
    } catch {
      return null;
    }
  });

// ── Generation ─────────────────────────────────────────────────────────────
async function generateOne(
  admin: ReturnType<typeof publicClient>,
  facts: CityFacts,
  runId: string | null,
  useAi: boolean,
): Promise<{ status: string; score: number }> {
  let content: CityLandingContent;
  let source: "ai" | "template" = "template";

  if (useAi) {
    const { generateCityContent } = await import("./city-landing.server");
    const res = await generateCityContent(facts);
    content = res.content;
    source = res.source;
  } else {
    content = buildCityLandingContent(facts);
  }

  const validation = validateCityContent(content, facts);
  const status = validation.score > AUTO_PUBLISH_SCORE ? "published" : "draft";

  const { error } = await admin.from("city_landing_pages").upsert(
    {
      slug: facts.landingSlug,
      city: facts.city,
      state_code: facts.stateCode,
      state_name: facts.stateName,
      county: facts.county,
      population: facts.population,
      timezone: facts.timezone,
      zip_codes: facts.zipCodes,
      neighborhoods: facts.neighborhoods,
      nearby_cities: facts.nearbyCities as never,
      highways: facts.highways,
      facts: facts as never,
      content: content as never,
      word_count: validation.words,
      seo_score: validation.score,
      status,
      source,
      error: validation.issues.length ? validation.issues.join(" | ") : null,
      run_id: runId,
      published_at: status === "published" ? new Date().toISOString() : null,
    } as never,
    { onConflict: "slug" },
  );
  if (error) throw error;
  return { status, score: validation.score };
}

/** Generate (or regenerate) a single city landing page. */
export const generateCityPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { citySlug: string; stateCode: string; useAi?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const facts = findCityFacts(data.citySlug, data.stateCode);
    if (!facts) throw new Error(`Unknown city: ${data.citySlug}-${data.stateCode}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await generateOne(
      supabaseAdmin as unknown as ReturnType<typeof publicClient>,
      facts,
      null,
      data.useAi !== false,
    );
    await supabaseAdmin.from("ai_task_logs").insert({
      agent_key: "city_landing_agent",
      level: res.status === "published" ? "info" : "warn",
      message: `${facts.city}, ${facts.stateCode}: ${res.status} (SEO ${res.score})`,
    } as never);
    return { slug: facts.landingSlug, ...res };
  });

/** Start a bulk run: a single city, an entire state, or the whole USA. */
export const startCityRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scope: "city" | "state" | "usa"; stateCode?: string; citySlug?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targets: CityFacts[] = [];
    if (data.scope === "city") {
      const f = data.citySlug ? findCityFacts(data.citySlug, data.stateCode) : null;
      if (!f) throw new Error("City not found");
      targets = [f];
    } else if (data.scope === "state") {
      targets = cityFactsForState(data.stateCode ?? "");
    } else {
      targets = allCityFacts();
    }
    if (!targets.length) throw new Error("No cities matched this scope");

    const { data: run, error } = await supabaseAdmin
      .from("city_landing_runs")
      .insert({
        scope: data.scope,
        state_code: data.stateCode ?? null,
        city_slugs: targets.map((t) => `${t.slug}|${t.stateCode}`),
        total: targets.length,
        status: "running",
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("ai_task_logs").insert({
      agent_key: "city_landing_agent",
      level: "info",
      message: `Run started (${data.scope}${data.stateCode ? ` ${data.stateCode}` : ""}): ${targets.length} cities queued`,
    } as never);

    return { runId: (run as { id: string }).id, total: targets.length };
  });

/** Process the next batch of a run. Called repeatedly by the dashboard. */
export const processCityRunBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; batchSize?: number; useAi?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as ReturnType<typeof publicClient>;

    const { data: run } = await supabaseAdmin
      .from("city_landing_runs")
      .select("*")
      .eq("id", data.runId)
      .maybeSingle();
    if (!run) throw new Error("Run not found");
    const r = run as unknown as {
      id: string;
      status: string;
      cursor: number;
      total: number;
      generated: number;
      published: number;
      failed: number;
      city_slugs: string[];
    };
    if (r.status !== "running") return { status: r.status, cursor: r.cursor, done: true };

    const size = Math.min(Math.max(data.batchSize ?? 3, 1), 10);
    const slice = r.city_slugs.slice(r.cursor, r.cursor + size);
    let generated = r.generated;
    let published = r.published;
    let failed = r.failed;
    let lastError: string | null = null;

    for (const entry of slice) {
      const [citySlug, stateCode] = entry.split("|");
      try {
        const facts = findCityFacts(citySlug!, stateCode);
        if (!facts) throw new Error(`Unknown city ${entry}`);
        const res = await generateOne(admin, facts, r.id, data.useAi !== false);
        generated += 1;
        if (res.status === "published") published += 1;
      } catch (err) {
        failed += 1;
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const cursor = r.cursor + slice.length;
    const done = cursor >= r.total;
    await supabaseAdmin
      .from("city_landing_runs")
      .update({
        cursor,
        generated,
        published,
        failed,
        last_error: lastError,
        status: done ? "completed" : "running",
      } as never)
      .eq("id", r.id);

    return { status: done ? "completed" : "running", cursor, total: r.total, generated, published, failed, done };
  });

/** Pause / resume / stop a run. */
export const controlCityRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; action: "pause" | "resume" | "stop" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = data.action === "resume" ? "running" : data.action === "pause" ? "paused" : "stopped";
    const { error } = await supabaseAdmin
      .from("city_landing_runs")
      .update({ status } as never)
      .eq("id", data.runId);
    if (error) throw error;
    await supabaseAdmin.from("ai_task_logs").insert({
      agent_key: "city_landing_agent",
      level: "info",
      message: `Run ${data.runId.slice(0, 8)} ${status}`,
    } as never);
    return { status };
  });

/** Retry every failed / low-score page (draft with errors). */
export const retryFailedCityPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as ReturnType<typeof publicClient>;
    const { data: rows } = await supabaseAdmin
      .from("city_landing_pages")
      .select("slug")
      .neq("status", "published")
      .limit(Math.min(data.limit ?? 5, 20));

    let ok = 0;
    let failed = 0;
    for (const row of (rows ?? []) as Array<{ slug: string }>) {
      const parsed = parseLandingParam(row.slug);
      if (!parsed) continue;
      const facts = findCityFacts(parsed.citySlug, parsed.stateCode);
      if (!facts) continue;
      try {
        await generateOne(admin, facts, null, true);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { retried: ok, failed };
  });

/** Publish / unpublish manually from the dashboard. */
export const setCityPageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slugs: string[]; status: "published" | "draft" | "archived" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("city_landing_pages")
      .update({
        status: data.status,
        published_at: data.status === "published" ? new Date().toISOString() : null,
      } as never)
      .in("slug", data.slugs);
    if (error) throw error;
    return { updated: data.slugs.length };
  });

/** Catalog of every city the agent can generate (for pickers + coverage). */
export function cityCatalog() {
  return allCityFacts().map((f) => ({
    slug: f.slug,
    city: f.city,
    stateCode: f.stateCode,
    stateName: f.stateName,
    landingSlug: f.landingSlug,
    path: f.path,
    population: f.population,
  }));
}

export { buildCityFacts };
