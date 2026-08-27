// ---------------------------------------------------------------------------
// One-shot maintenance endpoint: copies the server-only FACTORY_TICK_SECRET
// from the runtime environment into Supabase Vault so pg_cron can read it
// without the plaintext ever appearing in cron.job.command or in chat.
//
// The value is NEVER logged or returned — only a status string.
// Not under /api/public, so it is not reachable anonymously on the published
// site.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/factory/vault-sync")({
  server: {
    handlers: {
      POST: async () => {
        const value = process.env["FACTORY_TICK_SECRET"] ?? "";
        if (!value) {
          return Response.json(
            { ok: false, error: "FACTORY_TICK_SECRET is not configured in this runtime" },
            { status: 503 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin as any).rpc("fn_set_factory_tick_secret", {
          _value: value,
        });

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, result: data, length: value.length });
      },
    },
  },
});
