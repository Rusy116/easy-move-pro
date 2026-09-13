// ---------------------------------------------------------------------------
// AG-3 — Google Performance Agent, governed READ-ONLY engine (server only).
//
// Uses the EXISTING production Search Console provider (same one analytics_agent
// uses — no second connector, no second credential, no duplicate auth stack).
//
// Performs ZERO writes: no city_landing_pages update, no SEO content change, no
// publish/republish, no City Factory job, no sitemap change, no Search Console
// submission or indexing request.
//
// It NEVER invents Google metrics. Every number is either observed from the
// Search Console API, observed from the database, or reported as UNKNOWN.
// When Search Console is unavailable the report says so explicitly — there is
// no LLM estimate, no random value and no database field dressed up as a
// Google metric.
// ---------------------------------------------------------------------------
import { fetchSearchAnalytics, resolveVerifiedProperty } from "@/lib/demand/providers/gsc.server";

export const GOOGLE_PERFORMANCE_PROPERTY = "sc-domain:easymove.pro";

export type PageRow = {
  page: string;
  family: "movers" | "calculator" | "state_city" | "other";
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
};

export type FamilyPerformance = {
  family: PageRow["family"];
  pages: number;
  clicks: number;
  impressions: number;
  ctr: number | null;
  avgPosition: number | null;
};

export type GooglePerformanceReport = {
  mode: "read_only";
  gscAvailable: boolean;
  gscUnavailableReason: string | null;
  property: string | null;
  window: { startDate: string; endDate: string } | null;
  previousWindow: { startDate: string; endDate: string } | null;
  /** Everything in here is observed from the Search Console API. */
  gscObserved: {
    totals: { clicks: number; impressions: number; ctr: number | null; position: number | null };
    topPagesByClicks: PageRow[];
    topPagesByImpressions: PageRow[];
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number | null; position: number | null }>;
    ctrOpportunities: PageRow[];
    zeroClickPages: PageRow[];
    rankingDeclines: Array<{ page: string; position: number; previousPosition: number; delta: number }>;
    families: FamilyPerformance[];
  } | null;
  /** Everything in here is observed from the site/database, NOT from Google. */
  siteObserved: {
    publishedCityPages: number;
    activeSitemapSnapshots: number;
    sitemapCityUrls: number | null;
  };
  /** Metrics no API in this project can supply. Never estimated. */
  unknown: string[];
  anomalies: string[];
  recommendations: string[];
  warnings: string[];
  gscRequests: number;
  rowsAnalyzed: number;
  tablesRead: string[];
  writesPerformed: 0;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/** Metrics Google does not expose through the Search Analytics API. */
export const UNKNOWN_METRICS = [
  "exact indexed-page count — UNKNOWN (requires the Index Coverage / URL Inspection API, not implemented)",
  "index coverage buckets — UNKNOWN (requires the URL Inspection API)",
  "URL Inspection status per page — UNKNOWN (requires the URL Inspection API)",
  "crawl frequency — UNKNOWN (requires the Crawl Stats report, no public API)",
  "crawl budget — UNKNOWN (no API exposes it)",
  "exact reason Google excluded a specific URL — UNKNOWN (requires the URL Inspection API)",
];

export function classifyPage(page: string): PageRow["family"] {
  try {
    const path = new URL(page).pathname;
    if (path.startsWith("/movers/")) return "movers";
    if (path.startsWith("/moving-calculator-")) return "calculator";
    if (/^\/[a-z-]+\/[a-z0-9-]+-movers\/?$/i.test(path)) return "state_city";
    return "other";
  } catch {
    return "other";
  }
}

const rowToPage = (r: { key: string; clicks: number; impressions: number; ctr: number; position: number }): PageRow => ({
  page: r.key,
  family: classifyPage(r.key),
  clicks: r.clicks,
  impressions: r.impressions,
  ctr: r.impressions > 0 ? r.clicks / r.impressions : null,
  position: r.position ?? null,
});

function rollup(rows: PageRow[]): FamilyPerformance[] {
  const byFamily = new Map<PageRow["family"], PageRow[]>();
  for (const r of rows) {
    const list = byFamily.get(r.family) ?? [];
    list.push(r);
    byFamily.set(r.family, list);
  }
  return [...byFamily.entries()].map(([family, list]) => {
    const clicks = list.reduce((s, r) => s + r.clicks, 0);
    const impressions = list.reduce((s, r) => s + r.impressions, 0);
    const positioned = list.filter((r) => r.position != null);
    return {
      family,
      pages: list.length,
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : null,
      avgPosition: positioned.length
        ? Math.round((positioned.reduce((s, r) => s + (r.position ?? 0), 0) / positioned.length) * 10) / 10
        : null,
    };
  });
}

/**
 * `supabase` is the requesting admin's RLS-scoped client. Read-only throughout.
 */
export async function computeGooglePerformance(
  supabase: any,
  log?: (m: string, level?: "info" | "warn" | "error") => Promise<void>,
  opts: { pageLimit?: number } = {},
): Promise<GooglePerformanceReport> {
  const pageLimit = Math.min(Math.max(Number(opts.pageLimit ?? 200), 10), 500);
  const warnings: string[] = [];
  const anomalies: string[] = [];
  const recommendations: string[] = [];
  let gscRequests = 0;
  let rowsAnalyzed = 0;

  let gscAvailable = false;
  let gscUnavailableReason: string | null = null;
  let property: string | null = null;
  let window: GooglePerformanceReport["window"] = null;
  let previousWindow: GooglePerformanceReport["previousWindow"] = null;
  let gscObserved: GooglePerformanceReport["gscObserved"] = null;

  try {
    // Closed window: Search Console finalises with a lag.
    const endDate = shift(new Date(), -3);
    const startDate = shift(endDate, -27);
    const prevEnd = shift(startDate, -1);
    const prevStart = shift(prevEnd, -27);
    window = { startDate: iso(startDate), endDate: iso(endDate) };
    previousWindow = { startDate: iso(prevStart), endDate: iso(prevEnd) };

    property = await resolveVerifiedProperty(GOOGLE_PERFORMANCE_PROPERTY);
    gscRequests += 1;

    const pagesNow = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: window.startDate,
      endDate: window.endDate,
      dimensions: ["page"],
      rowLimit: pageLimit,
    });
    gscRequests += 1;

    const pagesPrev = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: previousWindow.startDate,
      endDate: previousWindow.endDate,
      dimensions: ["page"],
      rowLimit: pageLimit,
    });
    gscRequests += 1;

    const queries = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: window.startDate,
      endDate: window.endDate,
      dimensions: ["query"],
      rowLimit: 25,
    });
    gscRequests += 1;

    const pages = pagesNow.rows.map(rowToPage);
    rowsAnalyzed += pages.length + queries.rows.length;

    const prevByPage = new Map(pagesPrev.rows.map((r) => [r.key, r]));
    const rankingDeclines = pages
      .filter((p) => p.position != null && prevByPage.has(p.page))
      .map((p) => {
        const prev = prevByPage.get(p.page)!;
        return {
          page: p.page,
          position: Math.round((p.position ?? 0) * 10) / 10,
          previousPosition: Math.round(prev.position * 10) / 10,
          delta: Math.round(((p.position ?? 0) - prev.position) * 10) / 10,
        };
      })
      .filter((d) => d.delta >= 3)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 20);

    const zeroClickPages = pages
      .filter((p) => p.clicks === 0 && p.impressions >= 50)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    const ctrOpportunities = pages
      .filter((p) => p.impressions >= 100 && (p.ctr ?? 0) < 0.01 && (p.position ?? 99) <= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    const totals = pagesNow.totals;
    gscObserved = {
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
        position: pages.length ? totals.position : null,
      },
      topPagesByClicks: [...pages].sort((a, b) => b.clicks - a.clicks).slice(0, 10),
      topPagesByImpressions: [...pages].sort((a, b) => b.impressions - a.impressions).slice(0, 10),
      topQueries: queries.rows.slice(0, 15).map((r) => ({
        query: r.key,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.impressions > 0 ? r.clicks / r.impressions : null,
        position: r.position ?? null,
      })),
      ctrOpportunities,
      zeroClickPages,
      rankingDeclines,
      families: rollup(pages),
    };
    gscAvailable = true;

    if (!pages.length) warnings.push("Search Console returned no page rows for the window.");
    if (pages.length >= pageLimit) {
      warnings.push(`Page rows were capped at ${pageLimit}; totals cover only the returned rows.`);
    }
    if (rankingDeclines.length) {
      anomalies.push(`${rankingDeclines.length} page(s) dropped 3+ positions versus the previous closed window.`);
    }
    if (zeroClickPages.length) {
      anomalies.push(`${zeroClickPages.length} page(s) earned 50+ impressions and zero clicks.`);
    }
    await log?.(`gsc: ${gscRequests} request(s), ${pages.length} page row(s)`);
  } catch (e) {
    gscUnavailableReason = e instanceof Error ? e.message : "Search Console read failed";
    warnings.push(`GSC data unavailable: ${gscUnavailableReason}`);
    await log?.(`gsc_unavailable: ${gscUnavailableReason}`, "warn");
  }

  // ── Site / database observations (clearly NOT Google data) ─────────────────
  const tablesRead = ["city_landing_pages", "sitemap_snapshots"];

  const { count: cityCount, error: cityErr } = await supabase
    .from("city_landing_pages")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");
  if (cityErr) throw new Error(`city_landing_pages: ${cityErr.message}`);

  let activeSitemapSnapshots = 0;
  let sitemapCityUrls: number | null = null;
  const { data: snaps, error: snapErr } = await supabase
    .from("sitemap_snapshots")
    .select("file_key, url_count, city_url_count, is_active")
    .eq("is_active", true);
  if (snapErr) {
    warnings.push(`Sitemap snapshot health unavailable: ${snapErr.message}`);
  } else {
    const rows = (snaps ?? []) as Array<Record<string, unknown>>;
    activeSitemapSnapshots = rows.length;
    sitemapCityUrls = rows.reduce((s, r) => s + Number(r["city_url_count"] ?? 0), 0);
  }

  // ── Recommendations (advice only — nothing is applied) ─────────────────────
  if (!gscAvailable) {
    recommendations.push("Restore the Search Console connection, then re-run this report; no Google metrics are available right now.");
  } else {
    if (gscObserved?.ctrOpportunities.length) {
      recommendations.push("Review titles and meta descriptions on the listed CTR-opportunity pages — they rank in the top 20 but convert under 1% of impressions.");
    }
    if (gscObserved?.zeroClickPages.length) {
      recommendations.push("Investigate the zero-click pages: check intent match and snippet quality before adding more pages of the same type.");
    }
    if (gscObserved?.rankingDeclines.length) {
      recommendations.push("Compare the declining pages against their competitors; no automatic regeneration was performed.");
    }
    if (!gscObserved?.families.some((f) => f.family === "calculator")) {
      recommendations.push("No calculator-family page appeared in the returned rows; verify those URLs are discoverable.");
    }
  }
  recommendations.push("Indexed-page counts and coverage buckets remain unknown; add the URL Inspection API if those are needed.");

  return {
    mode: "read_only",
    gscAvailable,
    gscUnavailableReason,
    property,
    window,
    previousWindow,
    gscObserved,
    siteObserved: {
      publishedCityPages: Number(cityCount ?? 0),
      activeSitemapSnapshots,
      sitemapCityUrls,
    },
    unknown: UNKNOWN_METRICS,
    anomalies,
    recommendations,
    warnings,
    gscRequests,
    rowsAnalyzed,
    tablesRead,
    writesPerformed: 0,
  };
}

export function summarizeGooglePerformance(r: GooglePerformanceReport): string {
  if (!r.gscAvailable) {
    return `GSC data unavailable (${r.gscUnavailableReason ?? "unknown error"}). No Google metrics were estimated. Site-observed only: ${r.siteObserved.publishedCityPages.toLocaleString()} published city pages, ${r.siteObserved.activeSitemapSnapshots} active sitemap snapshot(s). Read-only — nothing was changed or submitted.`;
  }
  const t = r.gscObserved!.totals;
  return `Real Search Console data (${r.property}, ${r.window?.startDate}→${r.window?.endDate}): ${t.impressions.toLocaleString()} impressions · ${t.clicks.toLocaleString()} clicks · CTR ${
    t.ctr != null ? `${(t.ctr * 100).toFixed(2)}%` : "n/a"
  } · avg position ${t.position != null ? t.position.toFixed(1) : "n/a"}. ${r.gscObserved!.ctrOpportunities.length} CTR opportunity page(s), ${r.gscObserved!.zeroClickPages.length} zero-click page(s), ${r.gscObserved!.rankingDeclines.length} ranking decline(s). Indexed counts and coverage remain UNKNOWN. Read-only — nothing was changed or submitted.`;
}
