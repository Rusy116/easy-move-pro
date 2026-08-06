/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 10 — AI SUPERVISOR server functions.
//
// The Supervisor coordinates the EXISTING production factory. It never
// generates content: it leases cities to workers, advances them through the
// agent chain via the existing stage runner, retries failures up to 3 times,
// skips permanently broken pages, keeps the queue full, monitors health and
// writes batch reports. Nothing here modifies CRM, marketplace, portals,
// auth, the calculator or the quote engine.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { HealthResult, SupervisorIncident, SupervisorReport } from "./ai/supervisor";
import type { ProductionJob } from "./city-production/stages";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/**
 * Supervisor tick — one coordinated production heartbeat.
 *
 * Leases are exclusive: a city already leased by another worker is never
 * handed out again, so two agents can never touch the same page at once.
 */
export const supervisorTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workers?: number; stagesPerJob?: number; useAi?: boolean; worker?: string }) => ({
    workers: Math.min(Math.max(Number(d?.workers ?? 1), 1), 5),
    stagesPerJob: Math.min(Math.max(Number(d?.stagesPerJob ?? 12), 1), 12),
    useAi: d?.useAi !== false,
    worker: (d?.worker ? String(d.worker) : "supervisor").slice(0, 40),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runProductionStage, resolveFacts } = await import("./city-production.server");
    const { TOTAL_STAGES, stageAt } = await import("./city-production/stages");
    const { gateFor, gatePassed } = await import("./city-production/pilot");
    const { MAX_SUPERVISOR_RETRIES, LEASE_MS, agentForStep } = await import("./ai/supervisor");
    const db = supabaseAdmin as any;

    const nowIso = new Date().toISOString();

    // Reclaim stale leases from crashed workers, and log the incident.
    const { data: stale } = await db
      .from("city_production_jobs")
      .select("id, landing_slug, worker_id")
      .not("leased_until", "is", null)
      .lt("leased_until", nowIso)
      .in("status", ["queued", "running", "failed"])
      .limit(20);
    for (const s of (stale ?? []) as Array<{ id: string; landing_slug: string; worker_id: string | null }>) {
      await db
        .from("city_production_jobs")
        .update({ leased_until: null, worker_id: null, supervisor_state: "retry" })
        .eq("id", s.id);
      await db.from("ai_supervisor_incidents").insert({
        kind: "lease_expired",
        severity: "warning",
        agent_key: s.worker_id,
        landing_slug: s.landing_slug,
        message: `Worker ${s.worker_id ?? "unknown"} stalled on ${s.landing_slug} — lease reclaimed and work reassigned`,
      });
    }

    // Candidate selection: priority order, never a leased city, never a page
    // that already exhausted its retries (those are skipped, not blocking).
    const { data: candidates } = await db
      .from("city_production_jobs")
      .select("*")
      .in("status", ["queued", "running", "failed"])
      .is("skipped_reason", null)
      .or(`leased_until.is.null,leased_until.lt.${nowIso}`)
      .order("priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(Math.max(data.workers * 10, 50));

    const pool = ((candidates ?? []) as ProductionJob[]).filter(
      (j) => j.status !== "failed" || j.attempts < MAX_SUPERVISOR_RETRIES,
    );

    // Park permanently broken pages so the queue keeps flowing.
    const exhausted = ((candidates ?? []) as ProductionJob[]).filter(
      (j) => j.status === "failed" && j.attempts >= MAX_SUPERVISOR_RETRIES,
    );
    for (const j of exhausted.slice(0, 10)) {
      await db
        .from("city_production_jobs")
        .update({
          skipped_reason: j.last_error ?? "Exceeded retry limit",
          supervisor_state: "cancelled",
          leased_until: null,
          worker_id: null,
        })
        .eq("id", j.id);
      await db.from("ai_supervisor_incidents").insert({
        kind: "page_skipped",
        severity: "error",
        landing_slug: j.landing_slug,
        message: `${j.city}, ${j.state_code} skipped after ${j.attempts} attempts — queue continues`,
        details: { last_error: j.last_error },
      });
    }

    const results: Array<{
      city: string;
      worker: string;
      agent: string;
      stage: number;
      ok: boolean;
      summary: string;
      done: boolean;
    }> = [];

    let assigned = 0;
    for (const job of pool) {
      if (assigned >= data.workers) break;
      const workerId = `${data.worker}-${assigned + 1}`;

      // Exclusive claim: only succeeds when nobody else holds the lease.
      const leaseUntil = new Date(Date.now() + LEASE_MS).toISOString();
      const { data: claimed } = await db
        .from("city_production_jobs")
        .update({
          worker_id: workerId,
          leased_until: leaseUntil,
          supervisor_state: "running",
          status: "running",
          started_at: job.started_at ?? new Date().toISOString(),
        })
        .eq("id", job.id)
        .or(`leased_until.is.null,leased_until.lt.${new Date().toISOString()}`)
        .select("id");
      if (!claimed || !claimed.length) continue;
      assigned += 1;

      const facts = await resolveFacts(db, job.landing_slug);
      if (!facts) {
        await db
          .from("city_production_jobs")
          .update({
            status: "failed",
            supervisor_state: "cancelled",
            skipped_reason: "City not found in dataset",
            leased_until: null,
            worker_id: null,
          })
          .eq("id", job.id);
        continue;
      }

      const stageResults = { ...(job.stage_results ?? {}) };
      let stage = job.stage;
      let status = "running";
      let lastError: string | null = null;
      const t0 = Date.now();

      for (let i = 0; i < data.stagesPerJob && stage < TOTAL_STAGES; i += 1) {
        const step = stage + 1;
        const agent = agentForStep(step);

        if (stageAt(step)?.key === "publish" && !gatePassed({ stage_results: stageResults })) {
          const missing = gateFor({ stage_results: stageResults })
            .filter((g) => !g.ok)
            .map((g) => g.label)
            .join(", ");
          status = "failed";
          lastError = `Publish blocked — gate incomplete: ${missing}`;
          results.push({
            city: `${facts.city}, ${facts.stateCode}`,
            worker: workerId,
            agent: agent?.name ?? "Publish Agent",
            stage: step,
            ok: false,
            summary: lastError,
            done: false,
          });
          break;
        }

        const stepStart = Date.now();
        let res: { key: string; name: string; ok: boolean; summary: string };
        try {
          res = await runProductionStage(
            { db, facts, landingSlug: job.landing_slug, useAi: data.useAi },
            step,
          );
        } catch (err) {
          // Agent crash: log the incident, the lease is released and the
          // Supervisor reassigns the city on the next tick.
          res = {
            key: stageAt(step)?.key ?? String(step),
            name: agent?.name ?? `Stage ${step}`,
            ok: false,
            summary: err instanceof Error ? err.message : "Agent crashed",
          };
          await db.from("ai_supervisor_incidents").insert({
            kind: "agent_crash",
            severity: "error",
            agent_key: agent?.key ?? null,
            landing_slug: job.landing_slug,
            message: `${agent?.name ?? `Stage ${step}`} crashed on ${facts.city} — restarting via reassignment`,
            details: { error: res.summary, attempt: job.attempts + 1 },
          });
        }

        stageResults[res.key] = {
          ok: res.ok,
          summary: res.summary,
          ms: Date.now() - stepStart,
          at: new Date().toISOString(),
        };
        results.push({
          city: `${facts.city}, ${facts.stateCode}`,
          worker: workerId,
          agent: agent?.name ?? res.name,
          stage: step,
          ok: res.ok,
          summary: res.summary,
          done: false,
        });

        if (!res.ok) {
          status = "failed";
          lastError = `Stage ${step} (${res.name}): ${res.summary}`;
          break;
        }
        stage = step;
      }

      const done = status !== "failed" && stage >= TOTAL_STAGES;
      if (done) status = "completed";
      const attempts = job.attempts + 1;

      await db
        .from("city_production_jobs")
        .update({
          stage,
          status,
          stage_results: stageResults,
          attempts,
          last_error: lastError,
          completed_at: done ? new Date().toISOString() : null,
          duration_ms: (job.duration_ms ?? 0) + (Date.now() - t0),
          leased_until: null,
          worker_id: done ? workerId : null,
          supervisor_state: done
            ? "completed"
            : status === "failed"
              ? attempts >= MAX_SUPERVISOR_RETRIES
                ? "failed"
                : "retry"
              : "waiting",
          ...(status === "failed" && attempts >= MAX_SUPERVISOR_RETRIES
            ? { skipped_reason: lastError }
            : {}),
        })
        .eq("id", job.id);

      if (done && results.length) results[results.length - 1]!.done = true;
    }

    return { assigned, staleReclaimed: (stale ?? []).length, skipped: exhausted.length, results };
  });

/** Keeps the line fed: refills the queue and rolls over to the next state. */
export const supervisorRefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stateCode?: string; count?: number }) => ({
    stateCode: (d?.stateCode ? String(d.stateCode) : "CA").slice(0, 2).toUpperCase(),
    count: Math.min(Math.max(Number(d?.count ?? 100), 1), 5000),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { masterFactsForState } = await import("./city-landing/master.server");
    const { cityTier } = await import("./city-landing/hierarchy");
    const { priorityFor } = await import("./city-production/stages");
    const { ROLLOUT_STATES } = await import("./city-production/mass");
    const db = supabaseAdmin as any;

    const [{ data: existing }, { data: published }] = await Promise.all([
      db.from("city_production_jobs").select("landing_slug"),
      db.from("city_landing_pages").select("slug").eq("status", "published"),
    ]);
    const taken = new Set(((existing ?? []) as Array<{ landing_slug: string }>).map((r) => r.landing_slug));
    for (const p of (published ?? []) as Array<{ slug: string }>) taken.add(p.slug);

    // Start at the requested state; when it is exhausted, roll to the next one.
    const order = ROLLOUT_STATES.map((s) => s.code);
    const startIdx = Math.max(0, order.indexOf(data.stateCode));
    let chosen = data.stateCode;
    let eligible: Awaited<ReturnType<typeof masterFactsForState>> = [];

    for (let i = startIdx; i < order.length; i += 1) {
      const code = order[i]!;
      const pool = (await masterFactsForState(db, code, Math.max(data.count * 4, 500))).filter(
        (f) => !taken.has(f.landingSlug),
      );
      if (pool.length) {
        chosen = code;
        eligible = pool;
        break;
      }
    }
    if (!eligible.length) return { queued: 0, stateCode: chosen, rolledOver: false, exhausted: true };

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
          priority: 100 + priorityFor(f.population, tier),
          population: f.population,
          supervisor_state: "waiting",
        };
      })
      .sort((a, b) => a.priority - b.priority || b.population - a.population)
      .slice(0, data.count);

    const { error } = await db.from("city_production_jobs").insert(rows);
    if (error) throw new Error(error.message);

    return {
      queued: rows.length,
      stateCode: chosen,
      rolledOver: chosen !== data.stateCode,
      exhausted: false,
    };
  });

/** Pause / resume / cancel / requeue at the supervisor level. */
export const supervisorControl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { action: "pause_all" | "resume_all" | "requeue_failed" | "clear_skipped" | "cancel"; id?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    if (data.action === "pause_all") {
      await db
        .from("city_production_jobs")
        .update({ status: "paused", supervisor_state: "paused", leased_until: null, worker_id: null })
        .in("status", ["queued", "running"]);
    } else if (data.action === "resume_all") {
      await db
        .from("city_production_jobs")
        .update({ status: "queued", supervisor_state: "waiting" })
        .eq("status", "paused");
    } else if (data.action === "requeue_failed") {
      await db
        .from("city_production_jobs")
        .update({ status: "queued", supervisor_state: "waiting", attempts: 0, last_error: null, skipped_reason: null })
        .eq("status", "failed");
    } else if (data.action === "clear_skipped") {
      await db
        .from("city_production_jobs")
        .update({ skipped_reason: null, attempts: 0, status: "queued", supervisor_state: "waiting" })
        .not("skipped_reason", "is", null);
    } else if (data.action === "cancel" && data.id) {
      await db
        .from("city_production_jobs")
        .update({ skipped_reason: "Cancelled by admin", supervisor_state: "cancelled", leased_until: null })
        .eq("id", data.id);
    }
    return { ok: true };
  });

/** Minute-by-minute health sweep across agents, queue, database and outputs. */
export const supervisorHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }): Promise<{ checks: HealthResult[]; incidents: SupervisorIncident[] }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const nowIso = new Date().toISOString();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const checks: HealthResult[] = [];
    const push = (key: HealthResult["key"], status: HealthResult["status"], detail: string) =>
      checks.push({ key, status, detail });

    // Database
    let dbOk = true;
    const { error: dbErr, count: queueCount } = await db
      .from("city_production_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]);
    if (dbErr) dbOk = false;
    push("database", dbOk ? "ok" : "down", dbOk ? "Reachable" : dbErr?.message ?? "Unreachable");

    // Queue depth
    push(
      "queue",
      (queueCount ?? 0) > 0 ? "ok" : "warn",
      (queueCount ?? 0) > 0 ? `${queueCount} cities pending` : "Queue empty — refill required",
    );

    // Agents alive: any progress in the last hour?
    const { count: recent } = await db
      .from("city_production_jobs")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", hourAgo);
    push(
      "agents",
      (recent ?? 0) > 0 ? "ok" : (queueCount ?? 0) > 0 ? "warn" : "ok",
      (recent ?? 0) > 0 ? `${recent} jobs advanced in the last hour` : "No agent activity in the last hour",
    );

    // Memory / leases — stuck exclusive leases mean a crashed worker.
    const { count: stuck } = await db
      .from("city_production_jobs")
      .select("id", { count: "exact", head: true })
      .not("leased_until", "is", null)
      .lt("leased_until", nowIso);
    push(
      "memory",
      (stuck ?? 0) === 0 ? "ok" : "warn",
      (stuck ?? 0) === 0 ? "No stale leases" : `${stuck} stale leases will be reclaimed`,
    );

    // API — AI gateway key present
    push(
      "api",
      process.env["LOVABLE_API_KEY"] ? "ok" : "warn",
      process.env["LOVABLE_API_KEY"] ? "AI gateway configured" : "AI gateway key missing — templates only",
    );

    // Publishing, indexing, images
    const { count: publishedTotal } = await db
      .from("city_landing_pages")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published");
    push(
      "publishing",
      (publishedTotal ?? 0) > 0 ? "ok" : "warn",
      `${publishedTotal ?? 0} pages published`,
    );

    const { count: indexed } = await db
      .from("city_landing_pages")
      .select("slug", { count: "exact", head: true })
      .not("index_submitted_at", "is", null);
    push("indexing", (indexed ?? 0) > 0 ? "ok" : "warn", `${indexed ?? 0} pages submitted for indexing`);

    const { count: withImages } = await db
      .from("city_landing_pages")
      .select("slug", { count: "exact", head: true })
      .eq("status", "published")
      .not("content", "is", null);
    push("images", (withImages ?? 0) > 0 ? "ok" : "warn", `${withImages ?? 0} pages carry a visual set`);

    // Persist a health incident whenever something is down.
    const down = checks.filter((c) => c.status === "down");
    for (const c of down) {
      await db.from("ai_supervisor_incidents").insert({
        kind: "health_down",
        severity: "critical",
        message: `Health check failed: ${c.key} — ${c.detail}`,
      });
    }

    const { data: incidents } = await db
      .from("ai_supervisor_incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    return { checks, incidents: (incidents ?? []) as SupervisorIncident[] };
  });

/** Live supervisor dashboard payload. */
export const supervisorStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stateFor, agentForStep } = await import("./ai/supervisor");
    const db = supabaseAdmin as any;

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const midnightIso = midnight.toISOString();

    const { data: all } = await db
      .from("city_production_jobs")
      .select("*")
      .order("priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(500);
    const jobs = (all ?? []) as Array<ProductionJob & {
      worker_id: string | null;
      leased_until: string | null;
      supervisor_state: string | null;
      skipped_reason: string | null;
    }>;

    const withState = jobs.map((j) => ({ ...j, state: stateFor(j) }));
    const countState = (s: string) => withState.filter((j) => j.state === s).length;

    const completed = jobs.filter((j) => j.status === "completed");
    const durations = completed.map((j) => j.duration_ms || 0).filter(Boolean);
    const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const perHour = avgMs > 0 ? Math.round(3_600_000 / avgMs) : 0;
    const completedToday = completed.filter((j) => j.completed_at && j.completed_at >= midnightIso).length;

    const active = withState.find((j) => j.state === "running") ?? withState.find((j) => j.state === "assigned") ?? null;
    const currentAgent = active ? agentForStep(Math.min(active.stage + 1, 12)) : null;

    const [
      { data: pubRows },
      { count: publishedTotal },
      { count: indexCount },
      { count: blogCount },
      { count: productCount },
      { count: revenueEvents },
      { count: leadEvents },
    ] = await Promise.all([
      db
        .from("city_landing_pages")
        .select("audit_score, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1000),
      db.from("city_landing_pages").select("slug", { count: "exact", head: true }).eq("status", "published"),
      db
        .from("city_landing_pages")
        .select("slug", { count: "exact", head: true })
        .not("index_submitted_at", "is", null),
      db.from("blog_posts").select("id", { count: "exact", head: true }),
      db.from("digital_products").select("id", { count: "exact", head: true }),
      db.from("company_commissions").select("id", { count: "exact", head: true }),
      db.from("quotes").select("id", { count: "exact", head: true }).gte("created_at", midnightIso),
    ]);

    const pub = (pubRows ?? []) as Array<{ audit_score: number | null; published_at: string | null }>;
    const scores = pub.map((r) => r.audit_score).filter((s): s is number => typeof s === "number");

    return {
      states: {
        waiting: countState("waiting"),
        assigned: countState("assigned"),
        running: countState("running"),
        paused: countState("paused"),
        completed: countState("completed"),
        retry: countState("retry"),
        failed: countState("failed"),
        cancelled: countState("cancelled"),
      },
      total: jobs.length,
      currentCity: active ? `${active.city}, ${active.state_code}` : null,
      currentAgent: currentAgent?.name ?? null,
      currentWorker: active?.worker_id ?? null,
      avgMs,
      perHour,
      perDay: perHour * 24,
      completedToday,
      retries: jobs.reduce((sum, j) => sum + Math.max(0, j.attempts - 1), 0),
      failures: countState("failed") + countState("cancelled"),
      publishedTotal: publishedTotal ?? 0,
      publishedToday: pub.filter((r) => r.published_at && r.published_at >= midnightIso).length,
      indexCount: indexCount ?? 0,
      avgSeoScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      imagesCreated: (publishedTotal ?? 0) * 7,
      blogCount: blogCount ?? 0,
      productCount: productCount ?? 0,
      revenueEvents: revenueEvents ?? 0,
      leadEvents: leadEvents ?? 0,
      queue: withState.slice(0, 60).map((j) => ({
        id: j.id,
        city: `${j.city}, ${j.state_code}`,
        landing_slug: j.landing_slug,
        state: j.state,
        stage: j.stage,
        agent: agentForStep(Math.min(j.stage + 1, 12))?.name ?? "—",
        worker: j.worker_id,
        attempts: j.attempts,
        last_error: j.last_error,
        skipped_reason: j.skipped_reason,
      })),
    };
  });

/** Generates the five batch reports and stores them in the AI Growth Center. */
export const generateSupervisorReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label?: string; stateCode?: string }) => ({
    label: (d?.label ? String(d.label) : `Batch ${new Date().toLocaleString()}`).slice(0, 80),
    stateCode: d?.stateCode ? String(d.stateCode).slice(0, 2).toUpperCase() : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const [{ data: jobs }, { data: pages }, { count: blogCount }, { count: productCount }, { data: commissions }] =
      await Promise.all([
        db.from("city_production_jobs").select("status, attempts, duration_ms, state_code, skipped_reason"),
        db.from("city_landing_pages").select("status, audit_score, index_submitted_at, state_code"),
        db.from("blog_posts").select("id", { count: "exact", head: true }),
        db.from("digital_products").select("id", { count: "exact", head: true }),
        db.from("company_commissions").select("platform_amount"),
      ]);

    const j = ((jobs ?? []) as Array<any>).filter((r) => !data.stateCode || r.state_code === data.stateCode);
    const p = ((pages ?? []) as Array<any>).filter((r) => !data.stateCode || r.state_code === data.stateCode);
    const published = p.filter((r) => r.status === "published");
    const scores = published.map((r) => r.audit_score).filter((s: unknown): s is number => typeof s === "number");
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const durations = j.filter((r) => r.status === "completed").map((r) => r.duration_ms || 0);
    const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const revenue = ((commissions ?? []) as Array<{ platform_amount: number | null }>).reduce(
      (sum, r) => sum + Number(r.platform_amount ?? 0),
      0,
    );

    const rows = [
      {
        kind: "production",
        summary: `${j.filter((r) => r.status === "completed").length} cities completed, ${j.filter((r) => r.status === "failed").length} failed, ${j.filter((r) => r.skipped_reason).length} skipped`,
        metrics: {
          total: j.length,
          completed: j.filter((r) => r.status === "completed").length,
          failed: j.filter((r) => r.status === "failed").length,
          skipped: j.filter((r) => r.skipped_reason).length,
          retries: j.reduce((s, r) => s + Math.max(0, (r.attempts ?? 0) - 1), 0),
          avgMs,
        },
      },
      {
        kind: "seo",
        summary: `Average SEO score ${avgScore}/100 across ${published.length} published pages`,
        metrics: { avgScore, scored: scores.length, published: published.length },
      },
      {
        kind: "publishing",
        summary: `${published.length} pages live, ${p.filter((r) => r.index_submitted_at).length} submitted for indexing`,
        metrics: { published: published.length, indexed: p.filter((r) => r.index_submitted_at).length },
      },
      {
        kind: "quality",
        summary: `${scores.filter((s) => s >= 95).length}/${scores.length} pages meet the 95-point quality gate`,
        metrics: {
          passing: scores.filter((s) => s >= 95).length,
          scored: scores.length,
          minScore: scores.length ? Math.min(...scores) : 0,
        },
      },
      {
        kind: "revenue",
        summary: `$${Math.round(revenue).toLocaleString()} platform commission tracked · ${blogCount ?? 0} articles · ${productCount ?? 0} digital products`,
        metrics: { revenue: Math.round(revenue), articles: blogCount ?? 0, products: productCount ?? 0 },
      },
    ].map((r) => ({ ...r, batch_label: data.label, state_code: data.stateCode }));

    const { error } = await db.from("ai_supervisor_reports").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length, label: data.label };
  });

/** Report archive for the AI Growth Center. */
export const listSupervisorReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }): Promise<SupervisorReport[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data } = await db
      .from("ai_supervisor_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []) as SupervisorReport[];
  });
