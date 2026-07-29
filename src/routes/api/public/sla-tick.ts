import { createFileRoute } from "@tanstack/react-router";

/**
 * SLA tick — invoked by pg_cron every minute.
 * Verifies the Supabase anon key in the `apikey` header, then invokes
 * `fn_sla_tick()` via the service role client to expire overdue exclusive
 * assignments and move those leads into Open Market.
 *
 * Per approved decision #4, NO auto-invites are created — approved companies
 * discover open-market leads themselves.
 */
export const Route = createFileRoute("/api/public/sla-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("fn_sla_tick");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Marketplace engine: release 12-hour claims that made no progress.
        const claims = (await supabaseAdmin.rpc("fn_claim_expiry_tick" as never)) as {
          data: unknown;
          error: { message: string } | null;
        };

        if (claims.error) {
          return new Response(JSON.stringify({ ok: false, error: claims.error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return Response.json({
          ok: true,
          expired: Array.isArray(data) ? data.length : 0,
          claimsReturned: Array.isArray(claims.data) ? claims.data.length : 0,
          at: new Date().toISOString(),
        });
      },
    },
  },
});
