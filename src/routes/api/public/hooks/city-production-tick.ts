/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// AUTONOMOUS CITY FACTORY — scheduled production endpoint.
//
// Called by pg_cron (Lovable Cloud Jobs). Runs production ticks server-side
// until its time budget is spent, then returns. No browser tab is involved.
//
// Auth: dedicated server-only shared secret FACTORY_TICK_SECRET, presented as
// `x-factory-tick-secret` or `Authorization: Bearer`. The publishable/anon key
// is NO LONGER accepted — it ships to browsers and this endpoint can start
// paid AI work.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

import { verifyFactoryTick } from "@/lib/factory/tick-auth.server";

const TIME_BUDGET_MS = 45_000;

export const Route = createFileRoute("/api/public/hooks/city-production-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyFactoryTick(request);
        if (denied) return denied.response;

        let body: { jobs?: number; trigger?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runWorkerTick, loadWorkerSettings } = await import("@/lib/city-production/worker.server");
        const db = supabaseAdmin as any;

        // Kill switch — never claim jobs or call AI while the factory is off.
        const settings = await loadWorkerSettings(db);
        if (!settings.enabled) {
          return Response.json({ ok: true, enabled: false, reason: "City factory disabled", processed: 0 });
        }

        // Cost cap — reuse the existing ai_settings.task_limits.daily_task_cap.
        const { data: limitsRow } = await db
          .from("ai_settings")
          .select("value")
          .eq("key", "task_limits")
          .maybeSingle();
        const dailyCap = Number((limitsRow?.value as any)?.daily_task_cap ?? 0);
        if (dailyCap > 0) {
          const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const { data: runs } = await db
            .from("city_worker_runs")
            .select("jobs_processed")
            .gte("created_at", since);
          const used = ((runs ?? []) as Array<{ jobs_processed: number | null }>).reduce(
            (sum, r) => sum + Number(r.jobs_processed ?? 0),
            0,
          );
          if (used >= dailyCap) {
            return Response.json({
              ok: true,
              enabled: true,
              processed: 0,
              reason: `Daily task cap reached (${used}/${dailyCap})`,
            });
          }
        }

        const started = Date.now();
        let ticks = 0;
        let processed = 0;
        let published = 0;
        let failed = 0;


        try {
          // Keep producing inside the same invocation until the budget runs out.
          while (Date.now() - started < TIME_BUDGET_MS) {
            const tick = await runWorkerTick(db, {
              trigger: body.trigger ?? "cron",
              jobs: body.jobs,
            });
            ticks += 1;
            processed += tick.processed;
            published += tick.published;
            failed += tick.failed;
            if (!tick.enabled || tick.processed === 0) break;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[city-production-tick] failed:", message);
          await db
            .from("city_worker_runs")
            .insert({ worker_id: "cron", trigger: "cron", error: message.slice(0, 500) });
          return Response.json({ ok: false, error: message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          processed,
          published,
          failed,
          ticks,
          durationMs: Date.now() - started,
        });
      },

      // Health probe — reports whether the autonomous worker is enabled.
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { loadWorkerSettings } = await import("@/lib/city-production/worker.server");
        const db = supabaseAdmin as any;
        const settings = await loadWorkerSettings(db);
        const { data: last } = await db
          .from("city_worker_runs")
          .select("created_at, jobs_processed, published, failed, error")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return Response.json({ ok: true, enabled: settings.enabled, lastRun: last ?? null });
      },
    },
  },
});
