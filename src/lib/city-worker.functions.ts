/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// Autonomous city factory — worker control surface (admin only).
// Thin wrappers: the worker itself lives in city-production/worker.server.ts.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Backend worker status: settings, recent runs and throughput. */
export const workerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadWorkerSettings } = await import("./city-production/worker.server");
    const db = supabaseAdmin as any;

    const settings = await loadWorkerSettings(db);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ data: runs }, { data: hour }, { count: remaining }, { count: totalCities }] =
      await Promise.all([
        db
          .from("city_worker_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15),
        db.from("city_worker_runs").select("published, jobs_processed").gte("created_at", since),
        db
          .from("city_production_jobs")
          .select("id", { count: "exact", head: true })
          .in("status", ["queued", "running", "failed"]),
        db.from("usa_cities").select("id", { count: "exact", head: true }),
      ]);

    const publishedLastHour = ((hour ?? []) as Array<{ published: number }>).reduce(
      (a, r) => a + (r.published ?? 0),
      0,
    );
    const list = (runs ?? []) as Array<{ created_at: string }>;

    return {
      settings,
      runs: runs ?? [],
      lastRunAt: list[0]?.created_at ?? null,
      publishedLastHour,
      remaining: remaining ?? 0,
      totalCities: totalCities ?? 0,
    };
  });

/** Enable/disable the backend worker or tune its throughput. */
export const setWorkerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled?: boolean; jobs_per_tick?: number; use_ai?: boolean }) => ({
    enabled: typeof d?.enabled === "boolean" ? d.enabled : undefined,
    jobs_per_tick: d?.jobs_per_tick ? Math.min(Math.max(Number(d.jobs_per_tick), 1), 12) : undefined,
    use_ai: typeof d?.use_ai === "boolean" ? d.use_ai : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadWorkerSettings } = await import("./city-production/worker.server");
    const db = supabaseAdmin as any;

    const current = await loadWorkerSettings(db);
    const next = {
      ...current,
      ...(data.enabled === undefined ? {} : { enabled: data.enabled }),
      ...(data.jobs_per_tick === undefined ? {} : { jobs_per_tick: data.jobs_per_tick }),
      ...(data.use_ai === undefined ? {} : { use_ai: data.use_ai }),
    };
    const { error } = await db
      .from("ai_settings")
      .upsert({ key: "city_factory_worker", value: next }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return next;
  });

/** Run one backend tick right now (same code path as the cron worker). */
export const runWorkerNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runWorkerTick } = await import("./city-production/worker.server");
    return runWorkerTick(supabaseAdmin as any, { trigger: "manual" });
  });
