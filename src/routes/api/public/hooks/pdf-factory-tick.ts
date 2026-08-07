/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Autonomous Digital Product Factory: scheduled heartbeat.
//
// Called every minute by pg_cron. Runs worker ticks server-side until its
// time budget is spent. No browser tab is involved anywhere in this path.
// Auth: caller must present the project's publishable (anon) key.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

const TIME_BUDGET_MS = 45_000;

export const Route = createFileRoute("/api/public/hooks/pdf-factory-tick")({
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
        const { runPdfWorkerTick } = await import("@/lib/pdf-store/worker.server");
        const db = supabaseAdmin as any;

        const started = Date.now();
        let ticks = 0;
        let processed = 0;
        let published = 0;
        let failed = 0;
        let reason: string | undefined;

        try {
          while (Date.now() - started < TIME_BUDGET_MS) {
            const tick = await runPdfWorkerTick(db, { trigger: body.trigger ?? "cron", jobs: body.jobs });
            ticks += 1;
            processed += tick.processed;
            published += tick.published;
            failed += tick.failed;
            reason = tick.reason;
            if (!tick.enabled || tick.processed === 0) break;
          }
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Worker crashed", ticks, processed },
            { status: 500 },
          );
        }

        return Response.json({ ok: true, ticks, processed, published, failed, reason });
      },
    },
  },
});
