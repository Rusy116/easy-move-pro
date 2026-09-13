// ---------------------------------------------------------------------------
// SR-1 — Admin server functions for Last-Known-Good sitemap snapshots.
// Admin-gated, RLS-enforced. No production sitemap delivery change.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Authorization check failed");
  if (!isAdmin) throw new Error("Forbidden");
}

/** Build a candidate from the live sitemaps, validate it, promote if safe. */
export const buildSitemapSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { approveShrink?: boolean; origin?: string };
    return { approveShrink: Boolean(d.approveShrink), origin: d.origin };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { buildAndPromoteSnapshot } = await import("./sitemap-snapshot.server");
    const { countIndexableCities } = await import("@/lib/city-landing/public-read.server");

    const publishedCityCount = await countIndexableCities();
    if (!publishedCityCount) {
      throw new Error(
        "City inventory read returned zero — refusing to build a snapshot (last-known-good left intact)",
      );
    }

    const outcome = await buildAndPromoteSnapshot((context as Ctx).supabase, {
      publishedCityCount,
      adminApprovedShrink: data.approveShrink,
      origin: data.origin,
    });

    return {
      releaseId: outcome.releaseId,
      promoted: outcome.promoted,
      blockedReason: outcome.blockedReason,
      publishedCityCount,
      totals: outcome.validation.totals,
      shrinkRatio: outcome.shrink.shrinkRatio,
      issues: outcome.validation.issues.slice(0, 25),
      parts: outcome.parts,
      lastGood: outcome.lastGood,
    };
  });

/** Release history — metadata only, never the XML bodies. */
export const listSitemapSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { data, error } = await (context as Ctx).supabase
      .from("sitemap_snapshots")
      .select(
        "id, release_id, part_key, url_count, city_url_count, byte_size, checksum, status, is_active, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Roll back to a previously validated release. */
export const activateSitemapRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const id = (data as { releaseId?: string })?.releaseId;
    if (!id || typeof id !== "string") throw new Error("releaseId is required");
    return { releaseId: id };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { activateRelease } = await import("./sitemap-snapshot.server");
    const parts = await activateRelease((context as Ctx).supabase, data.releaseId);
    return { releaseId: data.releaseId, parts };
  });
