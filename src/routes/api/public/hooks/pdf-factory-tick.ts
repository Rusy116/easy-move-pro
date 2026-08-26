/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Autonomous Digital Product Factory: scheduled heartbeat.
//
// Called by pg_cron. Runs worker ticks server-side until its time budget is
// spent. No browser tab is involved anywhere in this path.
//
// Auth: dedicated server-only shared secret FACTORY_TICK_SECRET, presented as
// `x-factory-tick-secret` or `Authorization: Bearer`. The publishable/anon key
// is NO LONGER accepted — it ships to browsers and this endpoint can start
// paid AI work.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

import { verifyFactoryTick } from "@/lib/factory/tick-auth.server";

const TIME_BUDGET_MS = 45_000;

export const Route = createFileRoute("/api/public/hooks/pdf-factory-tick")({
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
        const { runPdfWorkerTick, readSettings } = await import("@/lib/pdf-store/worker.server");
        const db = supabaseAdmin as any;

        // Kill switch — never claim jobs or call AI while autopilot is off.
        const settings = await readSettings(db);
        if (!settings.autopilot) {
          return Response.json({ ok: true, enabled: false, reason: "Autopilot off", processed: 0 });
        }

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
