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

/** Slugs from `candidates` that are already queued or already published. */
async function alreadyTaken(db: Db, candidates: string[]): Promise<Set<string>> {
  const taken = new Set<string>();
  const CHUNK = 200;
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const slice = candidates.slice(i, i + CHUNK);
    const [{ data: jobs }, { data: pages }] = await Promise.all([
      db.from("city_production_jobs").select("landing_slug").in("landing_slug", slice),
      db.from("city_landing_pages").select("slug").in("slug", slice),
    ]);
    for (const r of (jobs ?? []) as Array<{ landing_slug: string }>) taken.add(r.landing_slug);
    for (const r of (pages ?? []) as Array<{ slug: string }>) taken.add(r.slug);
  }
  return taken;
}

/**
 * Keep the line fed straight from the master USA dataset.
 *
 * Walks states in rollout order and NEVER stops on the first state that has no
 * remaining work — an exhausted state simply rolls on to the next one. Upsert
 * failures are logged and skipped so one bad city cannot stall the factory.
 * Idempotent: `landing_slug` is unique and existing slugs are filtered out, so
 * re-running can never duplicate a city.
 */
async function refillQueue(
  db: Db,
  settings: WorkerSettings,
): Promise<{ refilled: number; statesScanned: number; errors: string[] }> {
  const errors: string[] = [];
  const { count: openCount } = await db
    .from("city_production_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  let need = settings.queue_floor - (openCount ?? 0);
  if (need <= 0) return { refilled: 0, statesScanned: 0, errors };
  need = Math.min(need, settings.refill_batch);

  const { masterFactsForState } = await import("../city-landing/master.server");
  const { ROLLOUT_STATES } = await import("./mass");
  const { cityTier } = await import("../city-landing/hierarchy");
  const { priorityFor } = await import("./stages");

  let refilled = 0;
  let statesScanned = 0;

  for (const state of ROLLOUT_STATES) {
    if (refilled >= need) break;
    statesScanned += 1;

    let pool: Awaited<ReturnType<typeof masterFactsForState>>;
    try {
      // Read the WHOLE state — a partial read makes an exhausted state look
      // full and used to freeze the factory on its first state.
      pool = await masterFactsForState(db, state.code, 10000);
    } catch (err) {
      errors.push(`${state.code}: ${err instanceof Error ? err.message : String(err)}`);
      continue; // never terminate the run because of one state
    }
    if (!pool.length) continue;

    const taken = await alreadyTaken(db, pool.map((f) => f.landingSlug));
    const open = pool.filter((f) => !taken.has(f.landingSlug));
    if (!open.length) continue; // state fully produced → roll to the next state

    const rows = open
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
          status: "queued",
        };
      })
      .sort((a, b) => a.priority - b.priority || b.population - a.population)
      .slice(0, need - refilled);

    // onConflict → duplicate slugs can never be produced twice.
    const { data: inserted, error } = await db
      .from("city_production_jobs")
      .upsert(rows, { onConflict: "landing_slug", ignoreDuplicates: true })
      .select("id");

    if (error) {
      errors.push(`${state.code}: ${error.message}`);
      // Fall back to one-by-one so a single bad row cannot block the state.
      for (const row of rows) {
        const { error: rowErr } = await db
          .from("city_production_jobs")
          .upsert([row], { onConflict: "landing_slug", ignoreDuplicates: true });
        if (rowErr) errors.push(`${row.landing_slug}: ${rowErr.message}`);
        else refilled += 1;
        if (refilled >= need) break;
      }
      continue;
    }

    refilled += (inserted ?? []).length;
  }

  return { refilled, statesScanned, errors };
}


export interface WorkerTickResult {
  ok: boolean;
  workerId: string;
  enabled: boolean;
  reclaimed: number;
  refilled: number;
  statesScanned: number;
  refillErrors: string[];

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
    statesScanned: 0,
    refillErrors: [],

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
  const refill = await refillQueue(db, settings);
  result.refilled = refill.refilled;
  result.statesScanned = refill.statesScanned;
  result.refillErrors = refill.errors;


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

    try {
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
    } catch (err) {
      // One broken city must never stop the line. Release the lease and keep
      // the job retryable (status "failed" + attempts increment).
      const message = err instanceof Error ? err.message : String(err);
      result.failed += 1;
      result.processed += 1;
      await db
        .from("city_production_jobs")
        .update({
          status: "failed",
          last_error: message.slice(0, 500),
          attempts: job.attempts + 1,
          leased_until: null,
          worker_id: null,
          supervisor_state: "failed",
        })
        .eq("id", job.id);
    }
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
    error: result.refillErrors.length ? result.refillErrors.slice(0, 5).join(" | ").slice(0, 500) : null,

  });

  return result;
}
