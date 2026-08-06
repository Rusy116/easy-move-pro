/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// AUTONOMOUS CITY FACTORY — server-side production worker.
//
// This is the real production engine. It runs entirely on the server (invoked
// by the scheduled endpoint /api/public/hooks/city-production-tick) and needs
// NO browser tab. Each tick:
//
//   1. reclaims jobs whose worker lease expired (crash / deploy recovery)
//   2. leases the next N jobs and advances them through the 12 stages
//   3. refills the queue from public.usa_cities when it runs low
//   4. writes a run record to public.city_worker_runs for monitoring
//
// Duplicate protection: city_production_jobs.landing_slug is UNIQUE, refills
// skip slugs already queued or already published, and leases guarantee one
// worker per job.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductionJob } from "./stages";

type Db = SupabaseClient<any, "public", any>;

export interface WorkerSettings {
  enabled: boolean;
  jobs_per_tick: number;
  stages_per_tick: number;
  use_ai: boolean;
  queue_floor: number;
  refill_batch: number;
}

export const DEFAULT_WORKER_SETTINGS: WorkerSettings = {
  enabled: true,
  jobs_per_tick: 4,
  stages_per_tick: 12,
  use_ai: true,
  queue_floor: 200,
  refill_batch: 250,
};

/** How long a worker may hold a job before another worker may reclaim it. */
const LEASE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export async function loadWorkerSettings(db: Db): Promise<WorkerSettings> {
  const { data } = await db
    .from("ai_settings")
    .select("value")
    .eq("key", "city_factory_worker")
    .maybeSingle();
  return { ...DEFAULT_WORKER_SETTINGS, ...((data?.value ?? {}) as Partial<WorkerSettings>) };
}

/** Release jobs whose lease expired — survives deploys, restarts and crashes. */
async function reclaimStaleLeases(db: Db): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("city_production_jobs")
    .update({ status: "queued", leased_until: null, worker_id: null, supervisor_state: "retry" })
    .in("status", ["running"])
    .not("leased_until", "is", null)
    .lt("leased_until", nowIso)
    .select("id");
  return (data ?? []).length;
}

/** Keep the line fed straight from the master USA dataset. */
async function refillQueue(db: Db, settings: WorkerSettings): Promise<number> {
  const { count: openCount } = await db
    .from("city_production_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  if ((openCount ?? 0) >= settings.queue_floor) return 0;

  const { masterFactsForState } = await import("../city-landing/master.server");
  const { ROLLOUT_STATES } = await import("./mass");
  const { cityTier } = await import("../city-landing/hierarchy");
  const { priorityFor } = await import("./stages");

  const [{ data: existing }, { data: published }] = await Promise.all([
    db.from("city_production_jobs").select("landing_slug"),
    db.from("city_landing_pages").select("slug").eq("status", "published"),
  ]);
  const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));
  for (const p of (published ?? []) as Array<{ slug: string }>) taken.add(p.slug);

  // Roll state by state (CA → TX → FL → NY → rest) until we find open work.
  for (const state of ROLLOUT_STATES) {
    const pool = (await masterFactsForState(db, state.code, settings.refill_batch * 4)).filter(
      (f) => !taken.has(f.landingSlug),
    );
    if (!pool.length) continue;

    const rows = pool
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
      })
      .sort((a, b) => a.priority - b.priority || b.population - a.population)
      .slice(0, settings.refill_batch);

    // onConflict → duplicate slugs can never be produced twice.
    const { data: inserted } = await db
      .from("city_production_jobs")
      .upsert(rows, { onConflict: "landing_slug", ignoreDuplicates: true })
      .select("id");
    return (inserted ?? []).length;
  }
  return 0;
}

export interface WorkerTickResult {
  ok: boolean;
  workerId: string;
  enabled: boolean;
  reclaimed: number;
  refilled: number;
  processed: number;
  stagesRun: number;
  published: number;
  failed: number;
  durationMs: number;
  cities: Array<{ city: string; stage: number; status: string }>;
}

/**
 * One autonomous production tick. Safe to call concurrently — job leases stop
 * two workers from touching the same city.
 */
export async function runWorkerTick(
  db: Db,
  opts: { trigger?: string; jobs?: number; workerId?: string } = {},
): Promise<WorkerTickResult> {
  const t0 = Date.now();
  const workerId = opts.workerId ?? `srv-${Math.random().toString(36).slice(2, 8)}`;
  const settings = await loadWorkerSettings(db);

  const result: WorkerTickResult = {
    ok: true,
    workerId,
    enabled: settings.enabled,
    reclaimed: 0,
    refilled: 0,
    processed: 0,
    stagesRun: 0,
    published: 0,
    failed: 0,
    durationMs: 0,
    cities: [],
  };

  if (!settings.enabled) {
    result.durationMs = Date.now() - t0;
    return result;
  }

  const { runProductionStage, resolveFacts } = await import("../city-production.server");
  const { TOTAL_STAGES, stageAt } = await import("./stages");
  const { gateFor, gatePassed } = await import("./pilot");

  result.reclaimed = await reclaimStaleLeases(db);
  result.refilled = await refillQueue(db, settings);

  const jobsWanted = Math.max(1, Math.min(opts.jobs ?? settings.jobs_per_tick, 12));
  const nowIso = new Date().toISOString();

  const { data: candidates } = await db
    .from("city_production_jobs")
    .select("*")
    .in("status", ["queued", "running", "failed"])
    .or(`leased_until.is.null,leased_until.lt.${nowIso}`)
    .order("priority", { ascending: true })
    .order("population", { ascending: false })
    .limit(jobsWanted * 6);

  const batch = ((candidates ?? []) as ProductionJob[])
    .filter((j) => j.status !== "failed" || j.attempts < MAX_ATTEMPTS)
    .slice(0, jobsWanted);

  for (const job of batch) {
    // Lease the job: any other worker skips it until the lease expires.
    const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
    const { data: leased } = await db
      .from("city_production_jobs")
      .update({ status: "running", worker_id: workerId, leased_until: leaseUntil, supervisor_state: "working" })
      .eq("id", job.id)
      .or(`leased_until.is.null,leased_until.lt.${new Date().toISOString()}`)
      .select("id");
    if (!(leased ?? []).length) continue;

    const facts = await resolveFacts(db, job.landing_slug);
    if (!facts) {
      await db
        .from("city_production_jobs")
        .update({
          status: "failed",
          last_error: "City not found in master dataset",
          leased_until: null,
          worker_id: null,
          supervisor_state: "failed",
        })
        .eq("id", job.id);
      result.failed += 1;
      continue;
    }

    const startedAt = job.started_at ?? new Date().toISOString();
    const stageResults: Record<string, unknown> = { ...(job.stage_results ?? {}) };
    let stage = job.stage;
    let status = "running";
    let lastError: string | null = null;
    const jobStart = Date.now();

    for (let i = 0; i < settings.stages_per_tick && stage < TOTAL_STAGES; i += 1) {
      const step = stage + 1;

      // Hard publish gate — nothing goes live below quality 95.
      if (stageAt(step)?.key === "publish" && !gatePassed({ stage_results: stageResults as any })) {
        const missing = gateFor({ stage_results: stageResults as any })
          .filter((g) => !g.ok)
          .map((g) => g.label)
          .join(", ");
        status = "failed";
        lastError = `Publish blocked — gate incomplete: ${missing}`;
        break;
      }

      const stepStart = Date.now();
      const res = await runProductionStage(
        { db, facts, landingSlug: job.landing_slug, useAi: settings.use_ai },
        step,
      );
      stageResults[res.key] = {
        ok: res.ok,
        summary: res.summary,
        ms: Date.now() - stepStart,
        at: new Date().toISOString(),
      };
      result.stagesRun += 1;

      if (!res.ok) {
        status = "failed";
        lastError = `Stage ${step} (${res.name}): ${res.summary}`;
        break;
      }
      stage = step;
    }

    const done = status !== "failed" && stage >= TOTAL_STAGES;
    if (done) status = "completed";
    if (done) result.published += 1;
    if (status === "failed") result.failed += 1;
    result.processed += 1;
    result.cities.push({ city: `${facts.city}, ${facts.stateCode}`, stage, status });

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
        duration_ms: (job.duration_ms ?? 0) + (Date.now() - jobStart),
        leased_until: null,
        worker_id: null,
        supervisor_state: done ? "done" : status === "failed" ? "failed" : "waiting",
      })
      .eq("id", job.id);
  }

  result.durationMs = Date.now() - t0;

  await db.from("city_worker_runs").insert({
    worker_id: workerId,
    trigger: opts.trigger ?? "cron",
    jobs_processed: result.processed,
    stages_run: result.stagesRun,
    published: result.published,
    failed: result.failed,
    refilled: result.refilled,
    reclaimed: result.reclaimed,
    duration_ms: result.durationMs,
  });

  return result;
}
