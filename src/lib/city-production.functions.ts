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
    const { TOTAL_STAGES } = await import("./city-production/stages");
    const db = supabaseAdmin as any;

    const { data: batch } = await db
      .from("city_production_jobs")
      .select("*")
      .in("status", ["queued", "running"])
      .order("priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(data.jobs);

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
  .handler(async ({ context }): Promise<ProductionSummary & { jobs: ProductionJob[]; failedJobs: ProductionJob[] }> => {
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
      currentStage: active ? (stageAt(Math.min(active.stage + 1, 12)) ?? null) : null,
      jobs: jobs.slice(0, 60),
      failedJobs: jobs.filter((j) => j.status === "failed").slice(0, 25),
    };
  });
