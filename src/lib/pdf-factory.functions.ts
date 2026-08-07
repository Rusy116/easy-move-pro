/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 13 — PDF Product Factory (admin server functions).
// Thin wrappers: all stage logic lives in pdf-factory.server.ts.
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

/** Discovery Agent — find underserved product opportunities. */
export const runDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number } | undefined) => ({
    count: Math.min(Math.max(Number(d?.count ?? 8), 1), 40),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { discoverIdeas } = await import("./pdf-factory.server");
    const { slugify } = await import("./pdf-store/catalog");
    const db = supabaseAdmin as any;

    const [{ data: products }, { data: opps }] = await Promise.all([
      db.from("pdf_products").select("slug,title"),
      db.from("pdf_opportunities").select("title"),
    ]);
    const taken = new Set<string>([
      ...((products ?? []) as any[]).map((r) => r.slug),
      ...((products ?? []) as any[]).map((r) => slugify(r.title)),
      ...((opps ?? []) as any[]).map((r) => slugify(r.title)),
    ]);

    const ideas = await discoverIdeas(data.count, taken);
    const rows = ideas
      .filter((i) => !taken.has(slugify(i.title)))
      .map((i) => ({
        keyword: i.keyword,
        title: i.title,
        category_slug: i.category_slug,
        demand_score: Math.round(i.demand_score),
        difficulty_score: Math.round(i.difficulty_score),
        priority: Math.round(i.demand_score - i.difficulty_score / 2),
        gap_reason: i.gap_reason,
        source: process.env["LOVABLE_API_KEY"] ? "ai" : "seed",
      }));
    if (!rows.length) return { found: 0 };
    const { error } = await db.from("pdf_opportunities").insert(rows);
    if (error) throw new Error(error.message);
    return { found: rows.length };
  });

/** Promote opportunities into the production queue. */
export const enqueueProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number; ids?: string[] } | undefined) => ({
    count: Math.min(Math.max(Number(d?.count ?? 5), 1), 50),
    ids: Array.isArray(d?.ids) ? d!.ids!.slice(0, 50) : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugify } = await import("./pdf-store/catalog");
    const db = supabaseAdmin as any;

    let q = db.from("pdf_opportunities").select("*").eq("status", "new").order("priority", { ascending: false });
    if (data.ids?.length) q = db.from("pdf_opportunities").select("*").in("id", data.ids);
    const { data: opps } = await q.limit(data.count);
    const list = (opps ?? []) as any[];
    if (!list.length) return { queued: 0 };

    const { data: existing } = await db.from("pdf_jobs").select("product_slug");
    const taken = new Set(((existing ?? []) as any[]).map((r) => r.product_slug));

    const jobs = list
      .map((o) => ({ o, slug: slugify(o.title) }))
      .filter(({ slug }) => !taken.has(slug))
      .map(({ o, slug }) => ({
        product_slug: slug,
        title: o.title,
        category_slug: o.category_slug,
        brief: `${o.keyword} — ${o.gap_reason ?? ""}`.trim(),
        priority: 1000 - Number(o.priority ?? 0),
      }));
    if (!jobs.length) return { queued: 0 };

    await db.from("pdf_jobs").insert(jobs);
    await db.from("pdf_products").upsert(
      jobs.map((j) => ({
        slug: j.product_slug,
        title: j.title,
        category_slug: j.category_slug,
        status: "draft",
        ai_prompt: j.brief,
      })),
      { onConflict: "slug" },
    );
    await db.from("pdf_opportunities").update({ status: "queued" }).in("id", list.map((o) => o.id));
    return { queued: jobs.length };
  });

/** Factory heartbeat — advance queued products through the 12 stages. */
export const productTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobs?: number; stagesPerJob?: number } | undefined) => ({
    jobs: Math.min(Math.max(Number(d?.jobs ?? 1), 1), 5),
    stagesPerJob: Math.min(Math.max(Number(d?.stagesPerJob ?? 12), 1), 12),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runPdfStage } = await import("./pdf-factory.server");
    const { TOTAL_PDF_STAGES, pdfStageAt, pdfGatePassed, PDF_MAX_RETRIES } = await import("./pdf-store/catalog");
    const db = supabaseAdmin as any;

    const { data: candidates } = await db
      .from("pdf_jobs")
      .select("*")
      .in("status", ["queued", "running", "failed"])
      .order("priority", { ascending: true })
      .limit(Math.max(data.jobs * 6, 20));

    const batch = ((candidates ?? []) as any[])
      .filter((j) => j.status !== "failed" || j.attempts < PDF_MAX_RETRIES)
      .slice(0, data.jobs);

    const results: Array<{ title: string; stage: number; ok: boolean; summary: string; done: boolean }> = [];

    for (const job of batch) {
      let stage = job.stage as number;
      const stageResults = { ...(job.stage_results ?? {}) };
      let failed: string | null = null;

      for (let n = 0; n < data.stagesPerJob && stage < TOTAL_PDF_STAGES; n++) {
        const next = pdfStageAt(stage + 1);
        const { data: product } = await db.from("pdf_products").select("*").eq("slug", job.product_slug).maybeSingle();

        if (next.key === "publish" && !pdfGatePassed({ stage_results: stageResults })) {
          failed = "Publish gate not satisfied";
          break;
        }

        let outcome;
        try {
          outcome = await runPdfStage(db, job, product);
        } catch (err) {
          failed = err instanceof Error ? err.message : "Stage crashed";
          break;
        }

        stageResults[next.key] = { ok: outcome.ok, summary: outcome.summary };
        if (outcome.patch && Object.keys(outcome.patch).length) {
          await db.from("pdf_products").update(outcome.patch).eq("slug", job.product_slug);
        }
        results.push({ title: job.title, stage: next.step, ok: outcome.ok, summary: outcome.summary, done: false });

        if (!outcome.ok) {
          failed = `${next.name}: ${outcome.summary}`;
          break;
        }
        stage = next.step;
      }

      const done = stage >= TOTAL_PDF_STAGES && !failed;
      await db
        .from("pdf_jobs")
        .update({
          stage,
          stage_results: stageResults,
          status: failed ? "failed" : done ? "done" : "running",
          attempts: failed ? Number(job.attempts ?? 0) + 1 : job.attempts,
          last_error: failed,
          started_at: job.started_at ?? new Date().toISOString(),
          finished_at: done ? new Date().toISOString() : null,
        })
        .eq("id", job.id);

      if (done) results.push({ title: job.title, stage, ok: true, summary: "Published", done: true });
    }

    return { processed: batch.length, results };
  });

/** Queue + catalog + revenue snapshot for the factory console. */
export const factorySnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = context.supabase as any;
    const [jobs, products, opps] = await Promise.all([
      db.from("pdf_jobs").select("*").order("priority").limit(100),
      db.from("pdf_products").select("*").order("updated_at", { ascending: false }).limit(200),
      db.from("pdf_opportunities").select("*").order("priority", { ascending: false }).limit(60),
    ]);
    return {
      jobs: (jobs.data ?? []) as any[],
      products: (products.data ?? []) as any[],
      opportunities: (opps.data ?? []) as any[],
    };
  });

/** Manual override for the review queue. */
export const setProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; status: string }) => ({
    slug: String(d.slug).slice(0, 100),
    status: String(d.status).slice(0, 20),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { error } = await (supabaseAdmin as any).from("pdf_products").update(patch).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Toggle merchandising flags from the catalog table. */
export const setProductFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; featured?: boolean; bestseller?: boolean }) => ({
    slug: String(d.slug).slice(0, 100),
    featured: d.featured,
    bestseller: d.bestseller,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (typeof data.featured === "boolean") patch.is_featured = data.featured;
    if (typeof data.bestseller === "boolean") patch.is_bestseller = data.bestseller;
    const { error } = await (supabaseAdmin as any).from("pdf_products").update(patch).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
