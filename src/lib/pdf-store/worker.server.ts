/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// PHASE 14 — Autonomous Digital Product worker (server-only).
//
// One tick = research → plan → enqueue → advance stages → publish → improve.
// Runs entirely server-side; no browser tab is involved. Called from the
// admin console and from the pg_cron hook at
// /api/public/hooks/pdf-factory-tick.
// ---------------------------------------------------------------------------
import {
  PDF_MAX_RETRIES,
  TOTAL_PDF_STAGES,
  pdfGatePassed,
  pdfStageAt,
  slugify,
} from "./catalog";
import { runPdfStage } from "../pdf-factory.server";
import { improveProducts, planProducts, researchKeywords } from "./research.server";

export interface FactorySettings {
  autopilot: boolean;
  daily_target: number;
  batch_size: number;
  min_seo_score: number;
}

export async function readSettings(db: any): Promise<FactorySettings> {
  const { data } = await db.from("pdf_factory_settings").select("*").eq("id", 1).maybeSingle();
  return {
    autopilot: !!data?.autopilot,
    daily_target: Number(data?.daily_target ?? 10),
    batch_size: Number(data?.batch_size ?? 2),
    min_seo_score: Number(data?.min_seo_score ?? 95),
  };
}

async function publishedToday(db: any) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("pdf_products")
    .select("slug", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", since);
  return Number(count ?? 0);
}

/** Research Agent + Planner: fill the opportunity backlog. */
export async function runResearchCycle(db: any, count: number) {
  const [{ data: kw }, { data: products }, { data: opps }] = await Promise.all([
    db.from("pdf_keywords").select("keyword"),
    db.from("pdf_products").select("slug,title"),
    db.from("pdf_opportunities").select("title"),
  ]);

  const knownKeywords = new Set(((kw ?? []) as any[]).map((r) => String(r.keyword).toLowerCase()));
  const takenSlugs = new Set<string>([
    ...((products ?? []) as any[]).map((r) => r.slug as string),
    ...((products ?? []) as any[]).map((r) => slugify(r.title)),
    ...((opps ?? []) as any[]).map((r) => slugify(r.title)),
  ]);

  const keywords = await researchKeywords(count, knownKeywords);
  if (!keywords.length) return { discovered: 0, planned: 0 };

  await db.from("pdf_keywords").insert(keywords.map((k) => ({ ...k, status: "new" })));

  const planned = await planProducts(keywords, takenSlugs);
  if (planned.length) {
    await db.from("pdf_opportunities").insert(
      planned.map(({ keyword, title }) => ({
        keyword: keyword.keyword,
        title,
        category_slug: keyword.category_slug,
        demand_score: keyword.volume_score,
        difficulty_score: keyword.difficulty_score,
        priority: keyword.opportunity_score,
        gap_reason: keyword.notes,
        source: "research",
      })),
    );
    await db
      .from("pdf_keywords")
      .update({ status: "planned" })
      .in("keyword", planned.map((p) => p.keyword.keyword));
  }

  return { discovered: keywords.length, planned: planned.length };
}

/** Promote the highest-opportunity ideas into the production queue. */
export async function enqueueFromBacklog(db: any, count: number) {
  const { data: opps } = await db
    .from("pdf_opportunities")
    .select("*")
    .eq("status", "new")
    .order("priority", { ascending: false })
    .limit(count);

  const list = (opps ?? []) as any[];
  if (!list.length) return 0;

  const { data: existing } = await db.from("pdf_jobs").select("product_slug");
  const taken = new Set(((existing ?? []) as any[]).map((r) => r.product_slug));

  const jobs = list
    .map((o) => ({ o, slug: slugify(o.title) }))
    .filter(({ slug }) => slug && !taken.has(slug))
    .map(({ o, slug }) => ({
      product_slug: slug,
      title: o.title,
      category_slug: o.category_slug,
      brief: `${o.keyword} — ${o.gap_reason ?? ""}`.trim(),
      priority: 1000 - Number(o.priority ?? 0),
    }));

  if (jobs.length) {
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
  }
  await db.from("pdf_opportunities").update({ status: "queued" }).in("id", list.map((o) => o.id));
  return jobs.length;
}

/** Advance queued jobs through the 12 stages, honouring the publish gate. */
export async function advanceJobs(db: any, jobCount: number, minSeoScore: number) {
  const { data: candidates } = await db
    .from("pdf_jobs")
    .select("*")
    .in("status", ["queued", "running", "failed"])
    .order("priority", { ascending: true })
    .limit(Math.max(jobCount * 6, 20));

  const batch = ((candidates ?? []) as any[])
    .filter((j) => j.status !== "failed" || Number(j.attempts ?? 0) < PDF_MAX_RETRIES)
    .slice(0, jobCount);

  let published = 0;
  let failed = 0;

  for (const job of batch) {
    let stage = Number(job.stage ?? 0);
    const stageResults = { ...(job.stage_results ?? {}) };
    let failure: string | null = null;

    while (stage < TOTAL_PDF_STAGES) {
      const next = pdfStageAt(stage + 1);
      const { data: product } = await db.from("pdf_products").select("*").eq("slug", job.product_slug).maybeSingle();

      if (next.key === "publish") {
        if (!pdfGatePassed({ stage_results: stageResults } as any)) {
          failure = "Publish gate not satisfied";
          break;
        }
        if (Number(product?.seo_score ?? 0) < minSeoScore) {
          failure = `SEO score ${product?.seo_score ?? 0} below required ${minSeoScore}`;
          break;
        }
      }

      let outcome;
      try {
        outcome = await runPdfStage(db, { ...job, stage }, product);
      } catch (err) {
        failure = err instanceof Error ? err.message : "Stage crashed";
        break;
      }

      stageResults[next.key] = { ok: outcome.ok, summary: outcome.summary };
      if (outcome.patch && Object.keys(outcome.patch).length) {
        await db.from("pdf_products").update(outcome.patch).eq("slug", job.product_slug);
      }
      if (!outcome.ok) {
        failure = `${next.name}: ${outcome.summary}`;
        break;
      }
      stage = next.step;
    }

    const done = stage >= TOTAL_PDF_STAGES && !failure;
    if (done) published += 1;
    if (failure) failed += 1;

    await db
      .from("pdf_jobs")
      .update({
        stage,
        stage_results: stageResults,
        status: failure ? "failed" : done ? "done" : "running",
        attempts: failure ? Number(job.attempts ?? 0) + 1 : job.attempts,
        last_error: failure,
        started_at: job.started_at ?? new Date().toISOString(),
        finished_at: done ? new Date().toISOString() : null,
      })
      .eq("id", job.id);

    await db.from("pdf_publish_log").insert({
      product_slug: job.product_slug,
      action: done ? "published" : failure ? "failed" : "advanced",
      detail: failure ?? `Stage ${stage}/${TOTAL_PDF_STAGES}`,
    });
  }

  return { processed: batch.length, published, failed };
}

export interface WorkerTickResult {
  enabled: boolean;
  discovered: number;
  planned: number;
  queued: number;
  processed: number;
  published: number;
  failed: number;
  improved: number;
  repaired: number;
  covers: number;
  reason?: string;
}

/** One full autonomous heartbeat. */
export async function runPdfWorkerTick(
  db: any,
  opts: { trigger?: string; jobs?: number; force?: boolean } = {},
): Promise<WorkerTickResult> {
  const started = Date.now();
  const settings = await readSettings(db);
  const empty: WorkerTickResult = {
    enabled: settings.autopilot || !!opts.force,
    discovered: 0,
    planned: 0,
    queued: 0,
    processed: 0,
    published: 0,
    failed: 0,
    improved: 0,
    repaired: 0,
    covers: 0,
  };

  if (!settings.autopilot && !opts.force) return { ...empty, enabled: false, reason: "Autopilot off" };

  const { repairCatalog } = await import("./repair.server");
  const { backfillCovers } = await import("./cover.server");

  const todays = await publishedToday(db);
  if (todays >= settings.daily_target && !opts.force) {
    // Production is paused for the day, but merchandising work continues:
    // names, prices, categories and cover artwork still need finishing.
    const repair = await repairCatalog(db);
    const covers = await backfillCovers(db, 3);
    return {
      ...empty,
      repaired: repair.renamed + repair.repriced + repair.categoriesAdded + repair.backlogAdded,
      covers: covers.generated,
      reason: `Daily target reached (${todays}/${settings.daily_target})`,
    };
  }

  const result = { ...empty };


  // 1 — keep the backlog stocked.
  const { count: backlog } = await db
    .from("pdf_opportunities")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (Number(backlog ?? 0) < 10) {
    const research = await runResearchCycle(db, 12);
    result.discovered = research.discovered;
    result.planned = research.planned;
  }

  // 2 — promote ideas into the queue.
  const { count: openJobs } = await db
    .from("pdf_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  if (Number(openJobs ?? 0) < settings.batch_size * 3) {
    result.queued = await enqueueFromBacklog(db, settings.batch_size * 3);
  }

  // 3 — produce.
  const run = await advanceJobs(db, opts.jobs ?? settings.batch_size, settings.min_seo_score);
  result.processed = run.processed;
  result.published = run.published;
  result.failed = run.failed;

  // 4 — commercial repair: names, prices, categories, backlog balance.
  const repair = await repairCatalog(db);
  result.repaired = repair.renamed + repair.repriced + repair.categoriesAdded + repair.backlogAdded;

  // 5 — Cover Image Agent backfill for anything still on vector artwork.
  const coverRun = await backfillCovers(db, 3);
  result.covers = coverRun.generated;

  // 6 — learn from live performance.
  const improvements = await improveProducts(db, 5);
  result.improved = improvements.length;


  await db.from("pdf_worker_runs").insert({
    trigger: opts.trigger ?? "manual",
    processed: result.processed,
    published: result.published,
    failed: result.failed,
    discovered: result.discovered,
    improved: result.improved,
    duration_ms: Date.now() - started,
    notes: result.reason ?? null,
  });

  return result;
}
