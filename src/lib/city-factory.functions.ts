// ---------------------------------------------------------------------------
// PHASE 5 — Autonomous USA City Factory: steps 9–13 as server functions.
//
//   9  SEO Quality Audit        → auditCityPage / auditFactoryBatch
//  11  Indexing Agent           → submitForIndexing
//  12  Monitoring Agent         → runFactoryMonitor
//  13  Self-Improvement Agent   → runSelfImprovement
//
// Admin-gated. Nothing here touches CRM, marketplace, quotes or portals.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { findCityFacts, parseLandingParam, moversPathFor } from "./city-landing/data";
import { buildCityLandingContent } from "./city-landing/content";
import { buildMoversSeoContent } from "./city-landing/seo-page";
import { auditCityPage, MIN_AUDIT_SCORE, type AuditReport } from "./city-landing/audit";
import { buildCityHierarchy } from "./city-landing/hierarchy";
import {
  buildIndexingSubmission,
  monitorPage,
  planImprovement,
  type PageMetrics,
} from "./city-landing/agents";
import { ENABLE_INDEXING } from "./seo-config";

type Row = Record<string, unknown>;

function factoryClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

function factsFromSlug(slug: string) {
  const parsed = parseLandingParam(String(slug).replace(/^movers-/, ""));
  return parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
}

// ── Step 9: SEO Quality Audit ──────────────────────────────────────────────
export interface AuditOutcome {
  slug: string;
  score: number;
  passed: boolean;
  failures: string[];
  fixes: string[];
  action: "published" | "returned_for_correction" | "skipped";
}

async function auditOne(
  db: ReturnType<typeof factoryClient>,
  row: Row,
  peerTitles: string[],
  peerIntros: string[],
): Promise<AuditOutcome | null> {
  const slug = String(row["slug"] ?? "");
  const facts = factsFromSlug(slug);
  if (!facts) return null;

  const seo = buildMoversSeoContent(facts, buildCityLandingContent(facts));
  const report: AuditReport = auditCityPage(facts, seo, {
    existingTitles: peerTitles,
    existingIntros: peerIntros,
    calculatorPublished: row["status"] === "published",
    consoleErrors: 0,
    brokenLinks: 0,
    indexable: ENABLE_INDEXING,
  });

  const hierarchy = buildCityHierarchy(facts);
  const action: AuditOutcome["action"] = report.passed
    ? "published"
    : "returned_for_correction";

  await db
    .from("city_landing_pages")
    .update({
      audit_score: report.score,
      audit_report: report as unknown as never,
      audited_at: new Date().toISOString(),
      hierarchy: {
        tier: hierarchy.tier,
        county: hierarchy.county,
        up: hierarchy.up,
        down: hierarchy.down,
        lateral: hierarchy.lateral,
      } as unknown as never,
      internal_links: report.internalLinks,
      seo_status: report.passed ? "published" : "review",
      ...(report.passed ? { seo_published_at: new Date().toISOString() } : {}),
    } as never)
    .eq("slug", slug);

  return {
    slug,
    score: report.score,
    passed: report.passed,
    failures: report.failures.map((f) => f.label),
    fixes: report.fixes,
    action,
  };
}

export const auditFactoryBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; slug?: string }) => ({
    limit: Math.min(Math.max(Number(d.limit ?? 25), 1), 200),
    slug: d.slug ? String(d.slug).slice(0, 120) : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = factoryClient();

    const query = db
      .from("city_landing_pages")
      .select("slug, status, seo_status, content, seo_content")
      .eq("status", "published");
    const { data: rows } = data.slug
      ? await query.eq("slug", data.slug)
      : await query.order("audited_at", { ascending: true, nullsFirst: true }).limit(data.limit);

    const list = (rows ?? []) as Row[];
    const results: AuditOutcome[] = [];
    for (const row of list) {
      const peers = list.filter((r) => r["slug"] !== row["slug"]);
      const titles = peers
        .map((r) => String(((r["content"] as Row | null)?.["title"] as string) ?? "").trim().toLowerCase())
        .filter(Boolean);
      const intros = peers
        .map((r) =>
          String(
            (((r["seo_content"] as Row | null)?.["intro"] as string[] | undefined) ?? []).join(" "),
          )
            .trim()
            .toLowerCase()
            .slice(0, 160),
        )
        .filter(Boolean);
      const out = await auditOne(db, row, titles, intros);
      if (out) results.push(out);
    }

    return {
      audited: results.length,
      passed: results.filter((r) => r.passed).length,
      returned: results.filter((r) => !r.passed).length,
      threshold: MIN_AUDIT_SCORE,
      results,
    };
  });

// ── Step 11: Indexing Agent ────────────────────────────────────────────────
export const submitForIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({
    limit: Math.min(Math.max(Number(d.limit ?? 50), 1), 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = factoryClient();

    const { data: rows } = await db
      .from("city_landing_pages")
      .select("slug, audit_score, index_submitted_at")
      .eq("status", "published")
      .gte("audit_score", MIN_AUDIT_SCORE)
      .is("index_submitted_at", null)
      .limit(data.limit);

    const list = (rows ?? []) as Row[];
    const paths: string[] = [];
    for (const r of list) {
      const facts = factsFromSlug(String(r["slug"]));
      if (!facts) continue;
      paths.push(`/moving-calculator-${facts.landingSlug}`);
      paths.push(moversPathFor(facts.slug, facts.stateCode));
    }

    const submission = buildIndexingSubmission(paths);

    let pinged = 0;
    if (ENABLE_INDEXING && paths.length) {
      for (const url of submission.pings) {
        try {
          await fetch(url, { method: "GET" });
          pinged += 1;
        } catch {
          /* search-engine ping is best-effort */
        }
      }
    }

    if (list.length) {
      await db
        .from("city_landing_pages")
        .update({
          index_submitted_at: submission.submittedAt,
          index_status: ENABLE_INDEXING ? "submitted" : "pending",
        } as never)
        .in(
          "slug",
          list.map((r) => String(r["slug"])),
        );
    }

    return {
      submittedPages: list.length,
      urls: submission.urls.length,
      sitemapUrl: submission.sitemapUrl,
      pinged,
      indexingEnabled: ENABLE_INDEXING,
    };
  });

// ── Step 12: Monitoring Agent ──────────────────────────────────────────────
export const runFactoryMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({
    limit: Math.min(Math.max(Number(d.limit ?? 100), 1), 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = factoryClient();

    const { data: rows } = await db
      .from("city_landing_pages")
      .select(
        "slug, clicks, impressions, ctr, avg_position, prev_avg_position, index_status, audit_score",
      )
      .eq("status", "published")
      .limit(data.limit);

    const list = (rows ?? []) as Row[];
    const verdicts = list.map((r) => {
      const metrics: PageMetrics = {
        slug: String(r["slug"]),
        clicks: Number(r["clicks"] ?? 0),
        impressions: Number(r["impressions"] ?? 0),
        ctr: Number(r["ctr"] ?? 0),
        avgPosition: Number(r["avg_position"] ?? 0),
        prevAvgPosition: r["prev_avg_position"] == null ? null : Number(r["prev_avg_position"]),
        indexStatus: (r["index_status"] as string | null) ?? null,
        auditScore: r["audit_score"] == null ? null : Number(r["audit_score"]),
      };
      return monitorPage(metrics);
    });

    for (const v of verdicts) {
      await db
        .from("city_landing_pages")
        .update({ monitor_health: v.health, monitored_at: new Date().toISOString() } as never)
        .eq("slug", v.slug);
    }

    return {
      monitored: verdicts.length,
      healthy: verdicts.filter((v) => v.health === "healthy").length,
      watch: verdicts.filter((v) => v.health === "watch").length,
      degraded: verdicts.filter((v) => v.health === "degraded").length,
      notIndexed: verdicts.filter((v) => v.health === "not_indexed").length,
      needsImprovement: verdicts.filter((v) => v.needsImprovement).map((v) => v.slug),
    };
  });

// ── Step 13: Self-Improvement Agent ────────────────────────────────────────
export const runSelfImprovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({
    limit: Math.min(Math.max(Number(d.limit ?? 10), 1), 100),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = factoryClient();

    const { data: rows } = await db
      .from("city_landing_pages")
      .select(
        "slug, clicks, impressions, ctr, avg_position, prev_avg_position, index_status, audit_score, improvement_count, status",
      )
      .eq("status", "published")
      .in("monitor_health", ["degraded", "watch", "not_indexed"])
      .limit(data.limit);

    const list = (rows ?? []) as Row[];
    const improved: Array<{ slug: string; targets: string[]; score: number; notes: string[] }> = [];

    for (const r of list) {
      const slug = String(r["slug"]);
      const metrics: PageMetrics = {
        slug,
        clicks: Number(r["clicks"] ?? 0),
        impressions: Number(r["impressions"] ?? 0),
        ctr: Number(r["ctr"] ?? 0),
        avgPosition: Number(r["avg_position"] ?? 0),
        prevAvgPosition: r["prev_avg_position"] == null ? null : Number(r["prev_avg_position"]),
        indexStatus: (r["index_status"] as string | null) ?? null,
        auditScore: r["audit_score"] == null ? null : Number(r["audit_score"]),
      };
      const plan = planImprovement(metrics, monitorPage(metrics));
      if (!plan.republish) continue;

      const facts = factsFromSlug(slug);
      if (!facts) continue;

      // Regenerate the SEO layer, re-audit, and republish automatically.
      const seo = buildMoversSeoContent(facts, buildCityLandingContent(facts));
      const report = auditCityPage(facts, seo, {
        calculatorPublished: true,
        indexable: ENABLE_INDEXING,
      });

      await db
        .from("city_landing_pages")
        .update({
          seo_content: seo as unknown as never,
          seo_status: report.passed ? "published" : "review",
          seo_published_at: report.passed ? new Date().toISOString() : null,
          audit_score: report.score,
          audit_report: report as unknown as never,
          audited_at: new Date().toISOString(),
          internal_links: report.internalLinks,
          prev_avg_position: metrics.avgPosition || null,
          improvement_count: Number(r["improvement_count"] ?? 0) + 1,
          last_improved_at: new Date().toISOString(),
          index_submitted_at: null,
          monitor_health: report.passed ? "healthy" : "degraded",
        } as never)
        .eq("slug", slug);

      improved.push({ slug, targets: plan.targets, score: report.score, notes: plan.notes });
    }

    return { candidates: list.length, improved: improved.length, results: improved };
  });

// ── Factory overview ───────────────────────────────────────────────────────
export const cityFactoryStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = factoryClient();

    const { data: rows } = await db
      .from("city_landing_pages")
      .select("slug, status, seo_status, audit_score, index_status, monitor_health, improvement_count")
      .limit(5000);

    const list = (rows ?? []) as Row[];
    const num = (r: Row, k: string) => (r[k] == null ? null : Number(r[k]));
    const scored = list.map((r) => num(r, "audit_score")).filter((v): v is number => v != null);

    return {
      total: list.length,
      calculatorsPublished: list.filter((r) => r["status"] === "published").length,
      seoPublished: list.filter((r) => r["seo_status"] === "published").length,
      awaitingAudit: list.filter((r) => r["status"] === "published" && r["audit_score"] == null).length,
      passingAudit: scored.filter((s) => s >= MIN_AUDIT_SCORE).length,
      returnedForCorrection: scored.filter((s) => s < MIN_AUDIT_SCORE).length,
      avgAuditScore: scored.length
        ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
        : 0,
      submitted: list.filter((r) => r["index_status"] === "submitted").length,
      indexed: list.filter((r) => r["index_status"] === "indexed").length,
      degraded: list.filter((r) => r["monitor_health"] === "degraded").length,
      watch: list.filter((r) => r["monitor_health"] === "watch").length,
      healthy: list.filter((r) => r["monitor_health"] === "healthy").length,
      improvements: list.reduce((a, r) => a + Number(r["improvement_count"] ?? 0), 0),
      threshold: MIN_AUDIT_SCORE,
      indexingEnabled: ENABLE_INDEXING,
    };
  });
