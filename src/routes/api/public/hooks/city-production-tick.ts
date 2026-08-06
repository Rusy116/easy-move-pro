/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// AUTONOMOUS CITY FACTORY — scheduled production endpoint.
//
// Called every minute by pg_cron (Lovable Cloud Jobs). Runs production ticks
// server-side until its time budget is spent, then returns. No browser tab is
// involved anywhere in this path.
//
// Auth: the caller must present the project's publishable (anon) key in the
// `apikey` header, matching the documented cron pattern.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

const TIME_BUDGET_MS = 45_000;

export const Route = createFileRoute("/api/public/hooks/city-production-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ??
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
          "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: { jobs?: number; trigger?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runWorkerTick } = await import("@/lib/city-production/worker.server");
        const db = supabaseAdmin as any;

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
