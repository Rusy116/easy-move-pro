// ---------------------------------------------------------------------------
// PHASE 5 — USA DATA ENGINE (MASTER CITY DATABASE) — server functions.
//
// This module owns the master city table (public.usa_cities) and the import
// engine that feeds the EXISTING production pipeline. It does not redefine any
// pipeline logic: it calls runCityPipeline() from city-landing.functions.ts so
// there remains exactly ONE calculator and ONE SEO page generator.
//
// Flow: import city → validate data → generate + validate + publish calculator
//       → generate SEO page (embeds the same calculator) → schema/FAQ/links
//       → sitemap (dynamic) → mark completed.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { masterCatalog, catalogSize, validateMasterCity } from "./usa-cities/dataset";
import { findCityFacts } from "./city-landing/data";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export interface ImportResult {
  runId: string;
  requested: number;
  imported: number;
  skipped: number;
  invalid: number;
}

/** Catalog size available for import (client-safe, pure). */
export function usaCatalogSize(stateCode?: string) {
  return catalogSize(stateCode);
}

// ── IMPORT ENGINE ──────────────────────────────────────────────────────────
/**
 * Import 10 / 100 / 1,000 / entire USA. Duplicates are detected by the
 * (country, city_slug, state_code) unique key: existing cities are SKIPPED,
 * never re-created. Imports are resumable — each run stores a cursor.
 */
export const importUsaCities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; stateCode?: string; runId?: string }) => d)
  .handler(async ({ data, context }): Promise<ImportResult> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const catalog = masterCatalog(data.stateCode);
    const limit = Math.min(Math.max(data.limit ?? catalog.length, 1), 50_000);

    // RESUME — reuse an existing run and continue from its cursor.
    let runId = data.runId ?? null;
    let cursor = 0;
    let imported = 0;
    let skipped = 0;
    if (runId) {
      const { data: run } = await supabaseAdmin
        .from("usa_import_runs")
        .select("cursor, imported, skipped, status")
        .eq("id", runId)
        .maybeSingle();
      const r = run as unknown as {
        cursor: number; imported: number; skipped: number; status: string;
      } | null;
      if (!r) throw new Error("Import run not found");
      if (r.status !== "running") return { runId, requested: limit, imported: r.imported, skipped: r.skipped, invalid: 0 };
      cursor = r.cursor;
      imported = r.imported;
      skipped = r.skipped;
    } else {
      const { data: run, error } = await supabaseAdmin
        .from("usa_import_runs")
        .insert({
          scope: data.stateCode ? "state" : "usa",
          state_code: data.stateCode ?? null,
          requested: Math.min(limit, catalog.length),
          status: "running",
          created_by: context.userId,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      runId = (run as { id: string }).id;
    }

    // Chunked so very large imports never time out — the dashboard re-calls
    // with the same runId until done.
    const CHUNK = 500;
    const end = Math.min(limit, catalog.length);
    const slice = catalog.slice(cursor, Math.min(cursor + CHUNK, end));
    let invalid = 0;

    const rows = slice.filter((c) => {
      const issues = validateMasterCity(c);
      if (issues.length) invalid += 1;
      return issues.length === 0;
    });

    if (rows.length) {
      const slugs = rows.map((r) => r.city_slug);
      const { data: existing } = await supabaseAdmin
        .from("usa_cities")
        .select("city_slug, state_code")
        .in("city_slug", slugs);
      const seen = new Set(
        ((existing ?? []) as unknown as Array<{ city_slug: string; state_code: string }>).map(
          (e) => `${e.city_slug}|${e.state_code}`,
        ),
      );
      const fresh = rows.filter((r) => !seen.has(`${r.city_slug}|${r.state_code}`));
      skipped += rows.length - fresh.length;

      if (fresh.length) {
        const { error } = await supabaseAdmin.from("usa_cities").insert(
          fresh.map((c) => ({
            ...c,
            nearby_cities: c.nearby_cities as never,
            pipeline_status: "queued",
            calculator_status: "pending",
            seo_page_status: "pending",
          })) as never,
        );
        if (error) throw error;
        imported += fresh.length;
      }
    }

    const nextCursor = cursor + slice.length;
    const done = nextCursor >= end;
    await supabaseAdmin
      .from("usa_import_runs")
      .update({
        cursor: nextCursor,
        imported,
        skipped,
        status: done ? "imported" : "running",
      } as never)
      .eq("id", runId!);

    return { runId: runId!, requested: end, imported, skipped, invalid };
  });

// ── PRODUCTION QUEUE ───────────────────────────────────────────────────────
/**
 * Process the next slice of the production queue. Highest SEO priority first.
 * Each city runs the ONE existing pipeline (calculator → SEO page).
 * Failures are logged, retried automatically (up to 3 attempts) and never
 * publish an incomplete page.
 */
export const processUsaQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batchSize?: number; runId?: string; useAi?: boolean; retryFailed?: boolean } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runCityPipeline } = await import("./city-landing.functions");
    const admin = supabaseAdmin as never as Parameters<typeof runCityPipeline>[0];

    if (data.runId) {
      const { data: run } = await supabaseAdmin
        .from("usa_import_runs")
        .select("status")
        .eq("id", data.runId)
        .maybeSingle();
      const status = (run as unknown as { status: string } | null)?.status;
      if (status && !["running", "imported", "processing"].includes(status)) {
        return { status, processed: 0, completed: 0, failed: 0, done: true };
      }
    }

    const size = Math.min(Math.max(data.batchSize ?? 3, 1), 20);
    const statuses = data.retryFailed ? ["failed"] : ["queued", "failed"];
    const { data: queue } = await supabaseAdmin
      .from("usa_cities")
      .select("id, city_slug, state_code, attempts")
      .in("pipeline_status", statuses)
      .lt("attempts", 3)
      .order("seo_priority", { ascending: true })
      .order("population", { ascending: false })
      .limit(size);

    const rows = (queue ?? []) as unknown as Array<{
      id: string; city_slug: string; state_code: string; attempts: number;
    }>;

    let processed = 0;
    let completed = 0;
    let failed = 0;
    let totalMs = 0;

    for (const row of rows) {
      await supabaseAdmin
        .from("usa_cities")
        .update({ pipeline_status: "processing" } as never)
        .eq("id", row.id);

      const facts = findCityFacts(row.city_slug, row.state_code);
      if (!facts) {
        failed += 1;
        processed += 1;
        await supabaseAdmin
          .from("usa_cities")
          .update({
            pipeline_status: "failed",
            attempts: row.attempts + 1,
            last_error: "City not present in the geo dataset",
          } as never)
          .eq("id", row.id);
        continue;
      }

      const startedAt = Date.now();
      try {
        const res = await runCityPipeline(admin, facts, null, data.useAi !== false, {
          attempt: row.attempts + 1,
        });
        totalMs += Date.now() - startedAt;
        processed += 1;
        const done = res.calculator === "published" && res.seo === "published";
        if (done) completed += 1;
        await supabaseAdmin
          .from("usa_cities")
          .update({
            pipeline_status: done ? "completed" : "failed",
            calculator_status: res.calculator,
            seo_page_status: res.seo,
            calculator_slug: res.slug,
            published: res.calculator === "published",
            attempts: row.attempts + 1,
            last_error: done ? null : (res.seoBlockers[0] ?? res.validation.blockedReason ?? "Incomplete page"),
            last_published_at: done ? new Date().toISOString() : null,
          } as never)
          .eq("id", row.id);
        if (!done) failed += 1;
      } catch (err) {
        totalMs += Date.now() - startedAt;
        processed += 1;
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        await supabaseAdmin
          .from("usa_cities")
          .update({
            pipeline_status: "failed",
            attempts: row.attempts + 1,
            last_error: message,
          } as never)
          .eq("id", row.id);
        await supabaseAdmin.from("ai_notifications").insert({
          level: "error",
          title: `USA Data Engine: ${row.city_slug}-${row.state_code} failed`,
          message,
          agent_key: "city_landing_agent",
        } as never);
      }
    }

    if (data.runId) {
      const { data: run } = await supabaseAdmin
        .from("usa_import_runs")
        .select("processed, completed, failed, avg_ms")
        .eq("id", data.runId)
        .maybeSingle();
      const r = (run ?? { processed: 0, completed: 0, failed: 0, avg_ms: 0 }) as unknown as {
        processed: number; completed: number; failed: number; avg_ms: number;
      };
      const nextProcessed = r.processed + processed;
      await supabaseAdmin
        .from("usa_import_runs")
        .update({
          processed: nextProcessed,
          completed: r.completed + completed,
          failed: r.failed + failed,
          avg_ms: processed
            ? Math.round((r.avg_ms * r.processed + totalMs) / Math.max(nextProcessed, 1))
            : r.avg_ms,
          status: rows.length ? "processing" : "completed",
        } as never)
        .eq("id", data.runId);
    }

    return {
      status: rows.length ? "processing" : "completed",
      processed,
      completed,
      failed,
      avgMs: processed ? Math.round(totalMs / processed) : 0,
      done: rows.length === 0,
    };
  });

// ── BATCH CONTROL ──────────────────────────────────────────────────────────
export const controlUsaRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; action: "pause" | "resume" | "cancel" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status =
      data.action === "resume" ? "running" : data.action === "pause" ? "paused" : "cancelled";
    const { error } = await supabaseAdmin
      .from("usa_import_runs")
      .update({ status } as never)
      .eq("id", data.runId);
    if (error) throw error;
    return { status };
  });

/** Requeue every failed city so the pipeline can retry it. */
export const requeueFailedUsaCities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("usa_cities")
      .select("id")
      .eq("pipeline_status", "failed")
      .limit(Math.min(data.limit ?? 200, 1000));
    const ids = ((rows ?? []) as unknown as Array<{ id: string }>).map((r) => r.id);
    if (!ids.length) return { requeued: 0 };
    const { error } = await supabaseAdmin
      .from("usa_cities")
      .update({ pipeline_status: "queued", attempts: 0, last_error: null } as never)
      .in("id", ids);
    if (error) throw error;
    return { requeued: ids.length };
  });

// ── DASHBOARD STATS ────────────────────────────────────────────────────────
export const usaEngineStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const count = async (filter?: { column: string; value: string }) => {
      let q = supabaseAdmin.from("usa_cities").select("id", { count: "exact", head: true });
      if (filter) q = q.eq(filter.column, filter.value);
      const { count: n } = await q;
      return n ?? 0;
    };

    const [imported, queued, processing, completed, failed, skipped] = await Promise.all([
      count(),
      count({ column: "pipeline_status", value: "queued" }),
      count({ column: "pipeline_status", value: "processing" }),
      count({ column: "pipeline_status", value: "completed" }),
      count({ column: "pipeline_status", value: "failed" }),
      count({ column: "pipeline_status", value: "skipped" }),
    ]);

    const { data: runs } = await supabaseAdmin
      .from("usa_import_runs")
      .select("avg_ms, processed")
      .gt("processed", 0)
      .order("created_at", { ascending: false })
      .limit(10);
    const rs = (runs ?? []) as unknown as Array<{ avg_ms: number; processed: number }>;
    const totalProcessed = rs.reduce((a, r) => a + r.processed, 0);
    const avgMs = totalProcessed
      ? Math.round(rs.reduce((a, r) => a + r.avg_ms * r.processed, 0) / totalProcessed)
      : 0;

    const remaining = queued + processing + failed;
    return {
      catalog: catalogSize(),
      imported,
      queued,
      processing,
      completed,
      failed,
      skipped,
      avgMs,
      etaMs: avgMs * remaining,
    };
  });
