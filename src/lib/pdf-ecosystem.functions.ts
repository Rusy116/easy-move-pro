/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Autonomous Digital Product Ecosystem (admin server functions).
// Thin wrappers: all logic lives in pdf-store/worker.server.ts and
// pdf-store/research.server.ts. Extension only.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Everything the /ai/product-factory console renders. */
export const productFactoryDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = context.supabase as any;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [settings, products, jobs, keywords, opps, runs, logs, purchases] = await Promise.all([
      db.from("pdf_factory_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("pdf_products").select("*").order("updated_at", { ascending: false }).limit(300),
      db.from("pdf_jobs").select("*").order("priority").limit(120),
      db.from("pdf_keywords").select("*").order("opportunity_score", { ascending: false }).limit(60),
      db.from("pdf_opportunities").select("*").eq("status", "new").order("priority", { ascending: false }).limit(40),
      db.from("pdf_worker_runs").select("*").order("created_at", { ascending: false }).limit(20),
      db.from("pdf_publish_log").select("*").order("created_at", { ascending: false }).limit(40),
      db.from("customer_purchases").select("amount_cents,purchased_at,product_slug").not("product_slug", "is", null).limit(1000),
    ]);

    const rows = (products.data ?? []) as any[];
    const sales = (purchases.data ?? []) as any[];
    const published = rows.filter((p) => p.status === "published");

    return {
      settings: settings.data ?? { autopilot: false, daily_target: 10, batch_size: 2, min_seo_score: 95 },
      products: rows,
      jobs: (jobs.data ?? []) as any[],
      keywords: (keywords.data ?? []) as any[],
      backlog: (opps.data ?? []) as any[],
      runs: (runs.data ?? []) as any[],
      logs: (logs.data ?? []) as any[],
      stats: {
        createdToday: rows.filter((p) => p.created_at >= since).length,
        publishedToday: published.filter((p) => p.published_at && p.published_at >= since).length,
        published: published.length,
        catalog: rows.length,
        waiting: (jobs.data ?? []).filter((j: any) => j.status === "queued").length,
        generating: (jobs.data ?? []).filter((j: any) => j.status === "running").length,
        failed: (jobs.data ?? []).filter((j: any) => j.status === "failed").length,
        sold: sales.length,
        soldToday: sales.filter((s) => s.purchased_at >= since).length,
        revenueCents: sales.reduce((n, s) => n + Number(s.amount_cents ?? 0), 0),
        views: rows.reduce((n, p) => n + Number(p.views ?? 0), 0),
        downloads: rows.reduce((n, p) => n + Number(p.downloads ?? 0), 0),
        avgSeo: published.length
          ? Math.round(published.reduce((n, p) => n + Number(p.seo_score ?? 0), 0) / published.length)
          : 0,
        avgQuality: published.length
          ? Math.round(published.reduce((n, p) => n + Number(p.quality_score ?? 0), 0) / published.length)
          : 0,
      },
    };
  });

export const setFactorySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { autopilot?: boolean; daily_target?: number; batch_size?: number; min_seo_score?: number }) => ({
    autopilot: d.autopilot,
    daily_target: d.daily_target === undefined ? undefined : Math.min(Math.max(Number(d.daily_target), 1), 500),
    batch_size: d.batch_size === undefined ? undefined : Math.min(Math.max(Number(d.batch_size), 1), 10),
    min_seo_score: d.min_seo_score === undefined ? undefined : Math.min(Math.max(Number(d.min_seo_score), 50), 100),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(data)) if (v !== undefined) patch[k] = v;
    const { error } = await (supabaseAdmin as any).from("pdf_factory_settings").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Run the Research + Planner agents on demand. */
export const runProductResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number } | undefined) => ({
    count: Math.min(Math.max(Number(d?.count ?? 12), 1), 40),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runResearchCycle } = await import("./pdf-store/worker.server");
    return runResearchCycle(supabaseAdmin as any, data.count);
  });

/** One manual heartbeat of the autonomous worker. */
export const runProductWorkerTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobs?: number } | undefined) => ({
    jobs: Math.min(Math.max(Number(d?.jobs ?? 2), 1), 8),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runPdfWorkerTick } = await import("./pdf-store/worker.server");
    return runPdfWorkerTick(supabaseAdmin as any, { trigger: "admin", jobs: data.jobs, force: true });
  });

/** Self-improvement agent, run on demand. */
export const runSelfImprovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(Number(d?.limit ?? 10), 1), 50),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { improveProducts } = await import("./pdf-store/research.server");
    const changes = await improveProducts(supabaseAdmin as any, data.limit);
    return { improved: changes.length, changes };
  });

/** Lifecycle controls for the admin catalog table. */
export const productAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; action: string }) => ({
    slug: String(d.slug).slice(0, 100),
    action: String(d.action).slice(0, 20),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugify } = await import("./pdf-store/catalog");
    const db = supabaseAdmin as any;

    const { data: product } = await db.from("pdf_products").select("*").eq("slug", data.slug).maybeSingle();
    if (!product) throw new Error("Product not found");

    switch (data.action) {
      case "approve":
        await db
          .from("pdf_products")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("slug", data.slug);
        break;
      case "pause":
        await db.from("pdf_products").update({ status: "review" }).eq("slug", data.slug);
        break;
      case "archive":
        await db.from("pdf_products").update({ status: "archived" }).eq("slug", data.slug);
        break;
      case "delete":
        await db.from("pdf_jobs").delete().eq("product_slug", data.slug);
        await db.from("pdf_products").delete().eq("slug", data.slug);
        break;
      case "duplicate": {
        const copySlug = slugify(`${product.title} v2`);
        const { id, created_at, updated_at, published_at, ...rest } = product;
        void id;
        void created_at;
        void updated_at;
        void published_at;
        await db.from("pdf_products").upsert(
          { ...rest, slug: copySlug, title: `${product.title} (v2)`, status: "draft", downloads: 0, views: 0, revenue_cents: 0 },
          { onConflict: "slug" },
        );
        break;
      }
      case "rebuild":
        await db.from("pdf_jobs").delete().eq("product_slug", data.slug);
        await db.from("pdf_jobs").insert({
          product_slug: data.slug,
          title: product.title,
          category_slug: product.category_slug,
          brief: product.ai_prompt,
          priority: 1,
        });
        await db.from("pdf_products").update({ status: "draft" }).eq("slug", data.slug);
        break;
      default:
        throw new Error("Unknown action");
    }

    await db.from("pdf_publish_log").insert({ product_slug: data.slug, action: data.action, detail: "admin action" });
    return { ok: true };
  });
