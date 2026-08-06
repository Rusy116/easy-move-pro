/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 7 — Autonomous City Calculator Production System (server functions).
// Thin wrappers only: all logic lives in city-production.server.ts.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProductionJob, ProductionSummary } from "./city-production/stages";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Queue the next N cities by priority (metro → large → medium → small → nearby). */
export const enqueueProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number; stateCode?: string }) => ({
    count: Math.min(Math.max(Number(d?.count ?? 10), 1), 100000),
    stateCode: d?.stateCode ? String(d.stateCode).slice(0, 2).toUpperCase() : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allCityFacts, cityFactsForState } = await import("./city-landing/data");
    const { cityTier } = await import("./city-landing/hierarchy");
    const { priorityFor } = await import("./city-production/stages");
    const db = supabaseAdmin as any;

    const pool = data.stateCode ? cityFactsForState(data.stateCode) : allCityFacts();
    const { data: existing } = await db.from("city_production_jobs").select("landing_slug");
    const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));

    const rows = pool
      .filter((f) => !taken.has(f.landingSlug))
      .map((f) => {
        const tier = cityTier(f.population);
        return {
          landing_slug: f.landingSlug,
          city_slug: f.slug,
          state_code: f.stateCode,
          city: f.city,
          county: f.county,
          tier,
          priority: priorityFor(f.population, tier),
          population: f.population,
        };
      })
      .sort((a, b) => a.priority - b.priority || b.population - a.population)
      .slice(0, data.count);

    if (!rows.length) return { queued: 0 };
    const { error } = await db.from("city_production_jobs").insert(rows);
    if (error) throw new Error(error.message);
    return { queued: rows.length };
  });

/**
 * Production tick — the factory heartbeat. Advances up to `jobs` cities by up
 * to `stagesPerJob` stages each. Called on a loop by the dashboard autopilot.
 */
export const productionTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobs?: number; stagesPerJob?: number; useAi?: boolean }) => ({
    jobs: Math.min(Math.max(Number(d?.jobs ?? 1), 1), 5),
    stagesPerJob: Math.min(Math.max(Number(d?.stagesPerJob ?? 12), 1), 12),
    useAi: d?.useAi !== false,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runProductionStage, factsForSlug } = await import("./city-production.server");
    const { TOTAL_STAGES, stageAt } = await import("./city-production/stages");
    const { MAX_AUTO_RETRIES, gateFor, gatePassed } = await import("./city-production/pilot");
    const db = supabaseAdmin as any;

    // Failed cities are retried automatically (up to MAX_AUTO_RETRIES) and never
    // block the rest of the queue — production simply moves to the next city.
    const { data: candidates } = await db
      .from("city_production_jobs")
      .select("*")
      .in("status", ["queued", "running", "failed"])
      .order("priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(Math.max(data.jobs * 8, 40));

    const batch = ((candidates ?? []) as ProductionJob[])
      .filter((j) => j.status !== "failed" || j.attempts < MAX_AUTO_RETRIES)
      .slice(0, data.jobs);


    const results: Array<{ city: string; stage: number; ok: boolean; summary: string; done: boolean }> = [];

    for (const job of (batch ?? []) as ProductionJob[]) {
      const facts = factsForSlug(job.landing_slug);
      if (!facts) {
        await db
          .from("city_production_jobs")
          .update({ status: "failed", last_error: "City not found in dataset" })
          .eq("id", job.id);
        continue;
      }

      const startedAt = job.started_at ?? new Date().toISOString();
      const stageResults = { ...(job.stage_results ?? {}) };
      let stage = job.stage;
      let status = "running";
      let lastError: string | null = null;
      const t0 = Date.now();

      for (let i = 0; i < data.stagesPerJob && stage < TOTAL_STAGES; i += 1) {
        const step = stage + 1;

        // Hard publish gate: nothing publishes until Calculator, SEO, FAQ,
        // Schema, Internal Links, Images, Image SEO and Quality ≥ 95 all pass.
        if (stageAt(step)?.key === "publish" && !gatePassed({ stage_results: stageResults })) {
          const missing = gateFor({ stage_results: stageResults })
            .filter((g) => !g.ok)
            .map((g) => g.label)
            .join(", ");
          status = "failed";
          lastError = `Publish blocked — gate incomplete: ${missing}`;
          results.push({
            city: `${facts.city}, ${facts.stateCode}`,
            stage: step,
            ok: false,
            summary: lastError,
            done: false,
          });
          break;
        }

        const stepStart = Date.now();
        const res = await runProductionStage(
          { db, facts, landingSlug: job.landing_slug, useAi: data.useAi },
          step,
        );

        stageResults[res.key] = {
          ok: res.ok,
          summary: res.summary,
          ms: Date.now() - stepStart,
          at: new Date().toISOString(),
        };
        results.push({ city: `${facts.city}, ${facts.stateCode}`, stage: step, ok: res.ok, summary: res.summary, done: false });

        if (!res.ok) {
          status = "failed";
          lastError = `Stage ${step} (${res.name}): ${res.summary}`;
          break;
        }
        stage = step;
      }

      const done = status !== "failed" && stage >= TOTAL_STAGES;
      if (done) status = "completed";

      await db
        .from("city_production_jobs")
        .update({
          stage,
          status,
          stage_results: stageResults,
          attempts: job.attempts + 1,
          last_error: lastError,
          started_at: startedAt,
          completed_at: done ? new Date().toISOString() : null,
          duration_ms: (job.duration_ms ?? 0) + (Date.now() - t0),
        })
        .eq("id", job.id);

      if (done) results[results.length - 1]!.done = true;
    }

    return { processed: (batch ?? []).length, results };
  });

/** Retry / pause / resume / remove a job (or every failed job). */
export const controlProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: "retry" | "pause" | "resume" | "remove" | "retry_all_failed"; id?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    if (data.action === "retry_all_failed") {
      const { error } = await db
        .from("city_production_jobs")
        .update({ status: "queued", last_error: null })
        .eq("status", "failed");
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (!data.id) throw new Error("Missing job id");

    if (data.action === "remove") {
      await db.from("city_production_jobs").delete().eq("id", data.id);
      return { ok: true };
    }
    const status = data.action === "pause" ? "paused" : "queued";
    await db
      .from("city_production_jobs")
      .update({ status, ...(data.action === "retry" ? { last_error: null } : {}) })
      .eq("id", data.id);
    return { ok: true };
  });

/** Dashboard payload: queue, current city, throughput, ETA, recent jobs. */
export const productionStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }): Promise<
    ProductionSummary & {
      jobs: ProductionJob[];
      failedJobs: ProductionJob[];
      publishedTotal: number;
      publishedToday: number;
      avgQuality: number | null;
      retries: number;
      currentWorker: string | null;
    }
  > => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stageAt, estimateEta } = await import("./city-production/stages");
    const db = supabaseAdmin as any;

    const { data: all } = await db
      .from("city_production_jobs")
      .select("*")
      .order("priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(500);
    const jobs = ((all ?? []) as ProductionJob[]);

    const count = (s: string) => jobs.filter((j) => j.status === s).length;
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const completedToday = jobs.filter(
      (j) => j.completed_at && new Date(j.completed_at) >= midnight,
    );
    const failedToday = jobs.filter(
      (j) => j.status === "failed" && new Date(j.queued_at) >= midnight,
    ).length;

    const durations = jobs.filter((j) => j.status === "completed").map((j) => j.duration_ms || 0);
    const avgProductionMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const perHour = avgProductionMs > 0 ? Math.round(3_600_000 / avgProductionMs) : 0;

    const active = jobs.find((j) => j.status === "running") ?? jobs.find((j) => j.status === "queued") ?? null;
    const remaining = count("queued") + count("running");
    const currentStage = active ? (stageAt(Math.min(active.stage + 1, 12)) ?? null) : null;

    // Published pages + average SEO quality across the whole factory output.
    const [{ data: publishedRows }, { count: publishedTotal }] = await Promise.all([
      db
        .from("city_landing_pages")
        .select("audit_score, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1000),
      db.from("city_landing_pages").select("slug", { count: "exact", head: true }).eq("status", "published"),
    ]);
    const pub = ((publishedRows ?? []) as Array<{ audit_score: number | null; published_at: string | null }>);
    const scores = pub.map((r) => r.audit_score).filter((s): s is number => typeof s === "number");

    return {
      queued: count("queued"),
      running: count("running"),
      completed: count("completed"),
      failed: count("failed"),
      paused: count("paused"),
      total: jobs.length,
      completedToday: completedToday.length,
      failedToday,
      avgProductionMs,
      perHour,
      etaHours: estimateEta(remaining, perHour),
      currentCity: active ? `${active.city}, ${active.state_code}` : null,
      currentStage,
      jobs: jobs.slice(0, 60),
      failedJobs: jobs.filter((j) => j.status === "failed").slice(0, 25),
      publishedTotal: publishedTotal ?? pub.length,
      publishedToday: pub.filter((r) => r.published_at && new Date(r.published_at) >= midnight).length,
      avgQuality: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      retries: jobs.reduce((sum, j) => sum + Math.max(0, j.attempts - 1), 0),
      currentWorker: currentStage?.name ?? null,
    };
  });

/**
 * Phase 9 — mass batch enqueue. Scoped to a state (California first), skips
 * every city already queued or already published, so completed cities are
 * never regenerated and no duplicate URL can enter the line.
 */
export const enqueueMassBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stateCode?: string; count?: number }) => ({
    stateCode: (d?.stateCode ? String(d.stateCode) : "CA").slice(0, 2).toUpperCase(),
    count: Math.min(Math.max(Number(d?.count ?? 100), 1), 5000),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cityFactsForState } = await import("./city-landing/data");
    const { cityTier } = await import("./city-landing/hierarchy");
    const { priorityFor } = await import("./city-production/stages");
    const db = supabaseAdmin as any;

    const pool = cityFactsForState(data.stateCode);

    const [{ data: existing }, { data: published }] = await Promise.all([
      db.from("city_production_jobs").select("landing_slug"),
      db.from("city_landing_pages").select("slug").eq("status", "published"),
    ]);
    const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));
    for (const p of (published ?? []) as Array<{ slug: string }>) taken.add(p.slug);

    const eligible = pool.filter((f) => !taken.has(f.landingSlug));
    const duplicatesSkipped = pool.length - eligible.length;

    const rows = eligible
      .map((f) => {
        const tier = cityTier(f.population);
        return {
          landing_slug: f.landingSlug,
          city_slug: f.slug,
          state_code: f.stateCode,
          city: f.city,
          county: f.county,
          tier,
          // Large metro → medium → small → nearby towns.
          priority: 100 + priorityFor(f.population, tier),
          population: f.population,
        };
      })
      .sort((a, b) => a.priority - b.priority || b.population - a.population)
      .slice(0, data.count);

    if (rows.length) {
      const { error } = await db.from("city_production_jobs").insert(rows);
      if (error) throw new Error(error.message);
    }
    return {
      queued: rows.length,
      duplicatesSkipped,
      poolSize: pool.length,
      stateCode: data.stateCode,
    };
  });

// ── PHASE 8 — Pilot batch (10 California cities) ───────────────────────────

/** Queue the 10 pilot cities at the front of the line, in the pilot order. */
export const enqueuePilotBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PILOT_CITIES } = await import("./city-production/pilot");
    const { factsForSlug } = await import("./city-production.server");
    const { cityTier } = await import("./city-landing/hierarchy");
    const db = supabaseAdmin as any;

    const { data: existing } = await db
      .from("city_production_jobs")
      .select("landing_slug")
      .in("landing_slug", PILOT_CITIES.map((c) => c.landingSlug));
    const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));

    const rows = PILOT_CITIES.filter((c) => !taken.has(c.landingSlug)).flatMap((c, i) => {
      const facts = factsForSlug(c.landingSlug);
      if (!facts) return [];
      return [
        {
          landing_slug: c.landingSlug,
          city_slug: facts.slug,
          state_code: facts.stateCode,
          city: facts.city,
          county: facts.county,
          tier: cityTier(facts.population),
          // Pilot cities always run before the rest of the queue, in order.
          priority: i,
          population: facts.population,
        },
      ];
    });

    if (rows.length) {
      const { error } = await db.from("city_production_jobs").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { queued: rows.length, alreadyQueued: taken.size };
  });

/** Per-city pilot status: gate checklist, quality score, publish + index state. */
export const pilotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PILOT_CITIES, PILOT_SLUGS, gateFor, PILOT_MIN_QUALITY } = await import(
      "./city-production/pilot"
    );
    const { landingPathFor, moversPathFor } = await import("./city-landing/data");
    const db = supabaseAdmin as any;

    const [{ data: jobRows }, { data: pageRows }] = await Promise.all([
      db.from("city_production_jobs").select("*").in("landing_slug", PILOT_SLUGS),
      db
        .from("city_landing_pages")
        .select("slug, status, seo_status, index_status, audit_score")
        .in("slug", PILOT_SLUGS),
    ]);

    const jobs = new Map(((jobRows ?? []) as ProductionJob[]).map((j) => [j.landing_slug, j]));
    const pages = new Map(
      ((pageRows ?? []) as Array<Record<string, any>>).map((p) => [String(p["slug"]), p]),
    );

    const cities = PILOT_CITIES.map((c, i) => {
      const job = jobs.get(c.landingSlug) ?? null;
      const page = pages.get(c.landingSlug) ?? null;
      return {
        landingSlug: c.landingSlug,
        city: c.city,
        stateCode: c.stateCode,
        order: i + 1,
        stage: job?.stage ?? 0,
        status: job?.status ?? "not_queued",
        attempts: job?.attempts ?? 0,
        lastError: job?.last_error ?? null,
        durationMs: job?.duration_ms ?? 0,
        gate: gateFor(job),
        qualityScore: page?.["audit_score"] ?? null,
        publishStatus: page?.["status"] ?? "draft",
        indexStatus: page?.["index_status"] ?? "pending",
        calculatorPath: landingPathFor(c.slug, c.stateCode),
        seoPath: moversPathFor(c.slug, c.stateCode),
      };
    });

    const completed = cities.filter((c) => c.status === "completed").length;
    const scores = cities.map((c) => c.qualityScore).filter((s): s is number => typeof s === "number");

    return {
      cities,
      completed,
      remaining: cities.length - completed,
      failed: cities.filter((c) => c.status === "failed").length,
      queued: cities.filter((c) => c.status === "not_queued" || c.status === "queued").length,
      published: cities.filter((c) => c.publishStatus === "published").length,
      indexed: cities.filter((c) => c.indexStatus === "submitted" || c.indexStatus === "indexed").length,
      avgQuality: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      minQuality: PILOT_MIN_QUALITY,
      readyForPhase9: completed === cities.length,
    };
  });

/**
 * Phase 9 preparation — runs only when all 10 pilot cities finished. Queues
 * the rest of California behind the pilot batch.
 */
export const preparePhase9 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PILOT_SLUGS } = await import("./city-production/pilot");
    const { cityFactsForState } = await import("./city-landing/data");
    const { cityTier } = await import("./city-landing/hierarchy");
    const { priorityFor } = await import("./city-production/stages");
    const db = supabaseAdmin as any;

    const { data: pilotJobs } = await db
      .from("city_production_jobs")
      .select("landing_slug, status")
      .in("landing_slug", PILOT_SLUGS);
    const done = ((pilotJobs ?? []) as Array<{ status: string }>).filter(
      (j) => j.status === "completed",
    ).length;
    if (done < PILOT_SLUGS.length) {
      throw new Error(`Phase 9 locked — ${done}/${PILOT_SLUGS.length} pilot cities completed`);
    }

    const { data: existing } = await db.from("city_production_jobs").select("landing_slug");
    const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));

    const rows = cityFactsForState("CA")
      .filter((f) => !taken.has(f.landingSlug))
      .map((f) => {
        const tier = cityTier(f.population);
        return {
          landing_slug: f.landingSlug,
          city_slug: f.slug,
          state_code: f.stateCode,
          city: f.city,
          county: f.county,
          tier,
          priority: 100 + priorityFor(f.population, tier),
          population: f.population,
        };
      });

    if (rows.length) {
      const { error } = await db.from("city_production_jobs").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { queued: rows.length };
  });
