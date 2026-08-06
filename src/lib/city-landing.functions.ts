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
  type CityLandingContent,
} from "./city-landing/content";
import {
  validateCityPage,
  type DuplicateContext,
  type PageValidation,
} from "./city-landing/validation";


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

/** A city is "done" when a published page already exists for its slug. */
async function pageExists(
  admin: ReturnType<typeof publicClient>,
  slug: string,
): Promise<boolean> {
  const { data } = await admin
    .from("city_landing_pages")
    .select("slug")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return Boolean(data);
}

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
/** Duplicate context: slugs/titles already used by OTHER city pages. */
async function duplicateContext(
  admin: ReturnType<typeof publicClient>,
  facts: CityFacts,
  force: boolean,
): Promise<DuplicateContext> {
  const { data } = await admin
    .from("city_landing_pages")
    .select("slug, content, status")
    .eq("city", facts.city)
    .eq("state_code", facts.stateCode);
  const rows = (data ?? []) as unknown as Array<{ slug: string; content: { title?: string } | null; status: string }>;
  const others = rows.filter((r) => r.slug !== facts.landingSlug);
  const self = rows.find((r) => r.slug === facts.landingSlug);
  return {
    existingSlugs: others.map((r) => r.slug),
    existingTitles: others.map((r) => (r.content?.title ?? "").trim().toLowerCase()),
    urlTaken: !force && self?.status === "published",
  };
}

export interface GenerateResult {
  status: "published" | "review" | "failed";
  score: number;
  validation: PageValidation;
  durationMs: number;
}

async function generateOne(
  admin: ReturnType<typeof publicClient>,
  facts: CityFacts,
  runId: string | null,
  useAi: boolean,
  opts: { force?: boolean; attempt?: number; preview?: boolean } = {},
): Promise<GenerateResult> {
  const startedAt = Date.now();
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

  const dup = await duplicateContext(admin, facts, opts.force === true);
  const validation = validateCityPage(facts, content, dup);
  const durationMs = Date.now() - startedAt;

  // AUTOMATIC PUBLISH RULE — every blocker must pass, otherwise Draft Queue.
  const status: "published" | "review" = validation.ok ? "published" : "review";

  if (opts.preview) return { status, score: validation.seoScore, validation, durationMs };

  const { data: prev } = await admin
    .from("city_landing_pages")
    .select("version, publish_attempts")
    .eq("slug", facts.landingSlug)
    .maybeSingle();
  const prevRow = prev as unknown as { version?: number; publish_attempts?: number } | null;
  const version = (prevRow?.version ?? 0) + 1;
  const attempts = (prevRow?.publish_attempts ?? 0) + 1;

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
      seo_score: validation.seoScore,
      status: status === "published" ? "published" : "draft",
      city_status: status,
      source,
      validation: validation as never,
      calculator_status: validation.calculatorStatus,
      schema_valid: validation.schemaValid,
      internal_links: validation.internalLinks,
      canonical_url: validation.canonicalUrl,
      blocked_reason: validation.blockedReason,
      version,
      publish_attempts: attempts,
      generation_ms: durationMs,
      index_status: status === "published" ? "submitted" : "pending",
      error: validation.blockers.length ? validation.blockers.join(" | ") : null,
      run_id: runId,
      published_at: status === "published" ? new Date().toISOString() : null,
    } as never,
    { onConflict: "slug" },
  );
  if (error) throw error;

  await admin.from("city_publish_log").insert({
    slug: facts.landingSlug,
    city: facts.city,
    state_code: facts.stateCode,
    version,
    seo_score: validation.seoScore,
    calculator_status: validation.calculatorStatus,
    result: status === "published" ? "published" : "blocked",
    reason: validation.blockedReason,
    duration_ms: durationMs,
    attempt: opts.attempt ?? 1,
    run_id: runId,
  } as never);

  return { status, score: validation.seoScore, validation, durationMs };
}

/** PREVIEW MODE — build the page and run the gate WITHOUT writing/publishing. */
export const previewCityPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { citySlug: string; stateCode: string; useAi?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const facts = findCityFacts(data.citySlug, data.stateCode);
    if (!facts) throw new Error(`Unknown city: ${data.citySlug}-${data.stateCode}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as ReturnType<typeof publicClient>;
    const res = await generateOne(admin, facts, null, data.useAi !== false, { preview: true });
    return {
      url: res.validation.canonicalUrl,
      path: facts.path,
      city: facts.city,
      stateCode: facts.stateCode,
      citySlug: facts.slug,
      ...res,
    };
  });

/** Publish (or retry publishing) a stored page with up to 3 attempts. */
export const publishCityPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; force?: boolean; useAi?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const parsed = parseLandingParam(data.slug);
    if (!parsed) throw new Error("Invalid slug");
    const facts = findCityFacts(parsed.citySlug, parsed.stateCode);
    if (!facts) throw new Error("Unknown city");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as ReturnType<typeof publicClient>;

    let last: GenerateResult | null = null;
    let error: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        last = await generateOne(admin, facts, null, data.useAi !== false, {
          force: data.force !== false,
          attempt,
        });
        error = null;
        if (last.status === "published") break;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }

    if (error) {
      // ERROR QUEUE + admin notification after 3 failed attempts.
      await admin
        .from("city_landing_pages")
        .update({ city_status: "failed", blocked_reason: error } as never)
        .eq("slug", facts.landingSlug);
      await admin.from("city_publish_log").insert({
        slug: facts.landingSlug,
        city: facts.city,
        state_code: facts.stateCode,
        result: "error",
        reason: error,
        attempt: 3,
      } as never);
      await admin.from("ai_notifications").insert({
        level: "error",
        title: `City page failed: ${facts.city}, ${facts.stateCode}`,
        message: error,
        agent_key: "city_landing_agent",
      } as never);
      throw new Error(error);
    }
    return { slug: facts.landingSlug, status: last?.status, score: last?.score };
  });

/** DRAFT REVIEW QUEUE — approve (force publish) or reject a blocked page. */
export const reviewCityPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; action: "approve" | "reject" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch =
      data.action === "approve"
        ? {
            status: "published",
            city_status: "published",
            index_status: "submitted",
            blocked_reason: null,
            published_at: new Date().toISOString(),
          }
        : { status: "archived", city_status: "skipped" };
    const { error } = await supabaseAdmin
      .from("city_landing_pages")
      .update(patch as never)
      .eq("slug", data.slug);
    if (error) throw error;
    await supabaseAdmin.from("city_publish_log").insert({
      slug: data.slug,
      city: data.slug,
      state_code: data.slug.slice(-2).toUpperCase(),
      result: data.action === "approve" ? "approved" : "rejected",
      reason: `Manual ${data.action} by admin`,
    } as never);
    return { ok: true };
  });


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
  .inputValidator(
    (d: {
      scope: "city" | "state" | "usa";
      stateCode?: string;
      citySlug?: string;
      batchSize?: number;
    }) => d,
  )
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

    // BATCH MODE — cap the run at the requested batch size (10…5000).
    const batchSize = Math.min(Math.max(data.batchSize ?? targets.length, 1), 5000);
    targets = targets.slice(0, batchSize);

    const { data: run, error } = await supabaseAdmin
      .from("city_landing_runs")
      .insert({
        scope: data.scope,
        state_code: data.stateCode ?? null,
        city_slugs: targets.map((t) => `${t.slug}|${t.stateCode}`),
        total: targets.length,
        batch_size: batchSize,
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
  .inputValidator((d: { runId: string; batchSize?: number; useAi?: boolean; force?: boolean }) => d)
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

    // Per-tick chunk (the run's total batch target is stored on the run).
    const size = Math.min(Math.max(data.batchSize ?? 3, 1), 25);
    const slice = r.city_slugs.slice(r.cursor, r.cursor + size);
    let generated = r.generated;
    let published = r.published;
    let failed = r.failed;
    let skipped = (r as unknown as { skipped?: number }).skipped ?? 0;
    let lastError: string | null = null;

    for (const entry of slice) {
      const [citySlug, stateCode] = entry.split("|");
      const facts = findCityFacts(citySlug!, stateCode);
      if (!facts) {
        failed += 1;
        lastError = `Unknown city ${entry}`;
        continue;
      }
      // Workflow step 2/3: if a published landing page already exists, skip it.
      if (data.force !== true && (await pageExists(admin, facts.landingSlug))) {
        skipped += 1;
        continue;
      }
      // AUTOMATIC RETRY — up to 3 attempts before the error queue.
      let ok = false;
      for (let attempt = 1; attempt <= 3 && !ok; attempt += 1) {
        try {
          const res = await generateOne(admin, facts, r.id, data.useAi !== false, { attempt });
          generated += 1;
          if (res.status === "published") published += 1;
          ok = true;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (attempt === 3) {
            failed += 1;
            await admin.from("ai_notifications").insert({
              level: "error",
              title: `City page failed after 3 retries: ${facts.city}, ${facts.stateCode}`,
              message: lastError,
              agent_key: "city_landing_agent",
            } as never);
          }
        }
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
        skipped,
        last_error: lastError,
        status: done ? "completed" : "running",
      } as never)
      .eq("id", r.id);


    return {
      status: done ? "completed" : "running",
      cursor,
      total: r.total,
      generated,
      published,
      failed,
      skipped,
      done,
    };
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
