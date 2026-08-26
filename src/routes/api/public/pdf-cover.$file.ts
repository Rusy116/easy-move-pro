/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Public cover image delivery.
//
// Covers live in a private storage bucket; this route streams them with long
// cache headers so product pages, OG cards and the sitemap can reference a
// stable public URL. Read-only, no user data.
// ---------------------------------------------------------------------------
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pdf-cover/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = String((params as { file: string }).file).replace(/[^a-zA-Z0-9._-]/g, "");
        if (!file.endsWith(".png")) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { COVER_BUCKET } = await import("@/lib/pdf-store/cover.server");
        console.info("[env-diagnostic]", {
          route: "pdf-cover",
          SUPABASE_URL_PRESENT: Boolean(process.env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY_PRESENT: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
          VERCEL_REGION: process.env.VERCEL_REGION,
          runtime: process.release?.name ?? "unknown",
          platform: process.platform,
        });
        const { data, error } = await (supabaseAdmin as any).storage.from(COVER_BUCKET).download(file);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
