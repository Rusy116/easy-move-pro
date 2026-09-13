// ---------------------------------------------------------------------------
// AG-1 — Self-Optimization Agent, governed ANALYSIS-ONLY engine (server only).
//
// This engine inspects published city pages that monitoring flagged and
// produces a PROPOSAL. It performs ZERO writes of any kind:
//   * no city_landing_pages update
//   * no seo_status / publish status change
//   * no SEO regeneration written anywhere
//   * no City Factory job enqueued
//   * no sitemap or Search Console action
//
// Production mutations stay behind a server-only kill switch that defaults to
// OFF and is NOT read by this module — enabling writes is a separate stage.
// ---------------------------------------------------------------------------
import { monitorPage, planImprovement, type PageMetrics } from "@/lib/city-landing/agents";

/** ai_settings key holding the self-optimization write kill switch. */
export const SELF_OPTIMIZATION_SETTINGS_KEY = "self_optimization";
/** Hard default: production writes are DISABLED. */
export const SELF_OPTIMIZATION_WRITE_ENABLED_DEFAULT = false;

/**
 * Server-only read of the write kill switch. Absent or malformed settings mean
 * DISABLED — the switch must be explicitly and deliberately turned on.
 */
export async function selfOptimizationWritesEnabled(db: any): Promise<boolean> {
  try {
    const { data } = await db
      .from("ai_settings")
      .select("value")
      .eq("key", SELF_OPTIMIZATION_SETTINGS_KEY)
      .maybeSingle();
    return (data?.value as { write_enabled?: unknown } | null)?.write_enabled === true;
  } catch {
    return SELF_OPTIMIZATION_WRITE_ENABLED_DEFAULT;
  }
}

export type ImprovementProposal = {
  slug: string;
  health: string;
  targets: string[];
  notes: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  auditScore: number | null;
};

export type SelfOptimizationAnalysis = {
  mode: "analysis_only";
  writesEnabled: boolean;
  candidatesInspected: number;
  proposalCount: number;
  proposals: ImprovementProposal[];
  skipped: number;
  warnings: string[];
  tablesRead: string[];
};

const MAX_CANDIDATES = 100;

/**
 * `supabase` is the requesting admin's RLS-scoped client. Read-only.
 */
export async function analyzeSelfOptimization(
  supabase: any,
  opts: { limit?: number } = {},
): Promise<SelfOptimizationAnalysis> {
  const limit = Math.min(Math.max(Number(opts.limit ?? 25), 1), MAX_CANDIDATES);
  const warnings: string[] = [];

  const { data, error } = await supabase
    .from("city_landing_pages")
    .select(
      "slug, clicks, impressions, ctr, avg_position, prev_avg_position, index_status, audit_score, monitor_health, status",
    )
    .eq("status", "published")
    .in("monitor_health", ["degraded", "watch", "not_indexed"])
    .limit(limit);

  if (error) throw new Error(`city_landing_pages: ${error.message}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const proposals: ImprovementProposal[] = [];
  let skipped = 0;

  for (const r of rows) {
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
    const plan = planImprovement(metrics, monitorPage(metrics));
    if (!plan.republish) {
      skipped += 1;
      continue;
    }
    proposals.push({
      slug: metrics.slug,
      health: String(r["monitor_health"] ?? "unknown"),
      targets: plan.targets,
      notes: plan.notes,
      clicks: metrics.clicks,
      impressions: metrics.impressions,
      ctr: metrics.ctr,
      avgPosition: metrics.avgPosition,
      auditScore: metrics.auditScore,
    });
  }

  if (rows.length === 0) {
    warnings.push("No published city pages are currently flagged by monitoring.");
  }

  return {
    mode: "analysis_only",
    writesEnabled: false,
    candidatesInspected: rows.length,
    proposalCount: proposals.length,
    proposals,
    skipped,
    warnings,
    tablesRead: ["city_landing_pages"],
  };
}

export function summarizeSelfOptimization(a: SelfOptimizationAnalysis): string {
  return `Analysis only — production writes disabled. Inspected ${a.candidatesInspected} flagged page(s); ${a.proposalCount} improvement proposal(s), ${a.skipped} no action needed. Nothing was changed or republished.`;
}
