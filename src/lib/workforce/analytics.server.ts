// ---------------------------------------------------------------------------
// Analytics analysis core — STRICTLY READ-ONLY.
//
// Reuses the existing DD-3 Search Console provider (no second OAuth path, no
// duplicate analytics engine) plus deterministic counts over real business
// tables. No AI calls. No fabricated metrics: anything that is not actually
// recorded is reported as "not currently tracked" / "insufficient data".
// ---------------------------------------------------------------------------
import { fetchSearchAnalytics, resolveVerifiedProperty } from "@/lib/demand/providers/gsc.server";

export const GSC_PROPERTY = "sc-domain:easymove.pro";

export type SearchPerformance = {
  property: string;
  window: { startDate: string; endDate: string };
  previousWindow: { startDate: string; endDate: string } | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  position: number | null;
  impressionsChangePct: number | null;
  clicksChangePct: number | null;
  topQueries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
  topPages: Array<{ page: string; impressions: number; clicks: number; position: number }>;
  requests: number;
};

export type AnalyticsAnalysis = {
  search: SearchPerformance | null;
  site: {
    publishedCityPages: number;
    publishedProducts: number;
    publishedBlogPosts: number;
    paidStoreOrders: number;
    storeRevenueUsd: number;
    quotes: number;
    quotesLast30d: number;
    demandSignals: number;
  };
  notTracked: string[];
  warnings: string[];
  dataSources: string[];
  gscRequests: number;
  metricsAnalyzed: number;
  rowsAnalyzed: number;
  tablesRead: string[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
const pct = (now: number, prev: number) =>
  prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : null;

async function count(supabase: any, table: string, apply?: (q: any) => any) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count: c, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return Number(c ?? 0);
}

/**
 * Real analytics rollup. `supabase` is the requesting admin's RLS-scoped client.
 * Performs zero writes of any kind.
 */
export async function computeAnalytics(
  supabase: any,
  log?: (m: string, level?: "info" | "warn" | "error") => Promise<void>,
): Promise<AnalyticsAnalysis> {
  const warnings: string[] = [];
  const notTracked: string[] = [
    "bounce rate — not currently tracked (no analytics collector stores it)",
    "sessions / unique visitors — not currently tracked",
    "search → order conversion rate — insufficient data (no per-session attribution recorded)",
  ];
  const dataSources: string[] = [];
  let gscRequests = 0;

  // ── Search Console (read-only, minimal request budget) ────────────────────
  let search: SearchPerformance | null = null;
  try {
    // GSC finalises data with a lag; use a complete 28-day window ending 3 days ago.
    const endDate = shift(new Date(), -3);
    const startDate = shift(endDate, -27);
    const prevEnd = shift(startDate, -1);
    const prevStart = shift(prevEnd, -27);

    const property = await resolveVerifiedProperty(GSC_PROPERTY);
    gscRequests += 1;

    const current = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: iso(startDate),
      endDate: iso(endDate),
      dimensions: ["query"],
      rowLimit: 25,
    });
    gscRequests += 1;

    const pages = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: iso(startDate),
      endDate: iso(endDate),
      dimensions: ["page"],
      rowLimit: 10,
    });
    gscRequests += 1;

    const previous = await fetchSearchAnalytics({
      siteUrl: property,
      startDate: iso(prevStart),
      endDate: iso(prevEnd),
      dimensions: [],
      rowLimit: 1,
    });
    gscRequests += 1;

    const totals = current.totals;
    const prevTotals = previous.totals;

    search = {
      property,
      window: { startDate: iso(startDate), endDate: iso(endDate) },
      previousWindow: { startDate: iso(prevStart), endDate: iso(prevEnd) },
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
      position: current.rows.length ? totals.position : null,
      impressionsChangePct: pct(totals.impressions, prevTotals.impressions),
      clicksChangePct: pct(totals.clicks, prevTotals.clicks),
      topQueries: current.rows.slice(0, 10).map((r) => ({
        query: r.key,
        impressions: r.impressions,
        clicks: r.clicks,
        position: r.position,
      })),
      topPages: pages.rows.slice(0, 10).map((r) => ({
        page: r.key,
        impressions: r.impressions,
        clicks: r.clicks,
        position: r.position,
      })),
      requests: gscRequests,
    };
    dataSources.push(`google_search_console:${property}`);
    if (!current.rows.length) warnings.push("Search Console returned no query rows for the window");
    if (!pages.rows.length) warnings.push("Search Console returned no page rows for the window");
    await log?.(`gsc: ${gscRequests} request(s), ${current.rows.length} query row(s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search Console read failed";
    warnings.push(`Search performance unavailable: ${msg}`);
    await log?.(`gsc_unavailable: ${msg}`, "warn");
  }

  // ── Internal database (real recorded rows only) ───────────────────────────
  const tablesRead = [
    "city_landing_pages",
    "pdf_products",
    "blog_posts",
    "store_orders",
    "quotes",
    "demand_signals",
  ];

  const [publishedCityPages, publishedProducts, publishedBlogPosts, quotes, demandSignals] =
    await Promise.all([
      count(supabase, "city_landing_pages", (q: any) => q.eq("status", "published")),
      count(supabase, "pdf_products", (q: any) => q.eq("status", "published")),
      count(supabase, "blog_posts", (q: any) => q.eq("published", true)),
      count(supabase, "quotes"),
      count(supabase, "demand_signals"),
    ]);

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const quotesLast30d = await count(supabase, "quotes", (q: any) => q.gte("created_at", since30));

  const { data: orderRows, error: orderErr } = await supabase
    .from("store_orders")
    .select("amount_cents,status,currency");
  if (orderErr) throw new Error(`store_orders: ${orderErr.message}`);
  const orders = (orderRows ?? []) as Array<{
    amount_cents: number | null;
    status: string | null;
    currency: string | null;
  }>;
  const paid = orders.filter((o) => (o.status ?? "").toLowerCase() === "paid");
  const nonUsd = paid.filter((o) => (o.currency ?? "usd").toLowerCase() !== "usd").length;
  if (nonUsd > 0) warnings.push(`${nonUsd} paid order(s) are not USD; revenue total mixes currencies`);
  const storeRevenueUsd =
    Math.round(paid.reduce((s, o) => s + Number(o.amount_cents ?? 0), 0)) / 100;

  dataSources.push("lovable_cloud_database");

  const rowsAnalyzed =
    orders.length + (search ? search.topQueries.length + search.topPages.length : 0);

  return {
    search,
    site: {
      publishedCityPages,
      publishedProducts,
      publishedBlogPosts,
      paidStoreOrders: paid.length,
      storeRevenueUsd,
      quotes,
      quotesLast30d,
      demandSignals,
    },
    notTracked,
    warnings,
    dataSources,
    gscRequests,
    metricsAnalyzed: (search ? 6 : 0) + 8,
    rowsAnalyzed,
    tablesRead,
  };
}

export function summarizeAnalytics(a: AnalyticsAnalysis): string {
  const s = a.search;
  const searchPart = s
    ? `search ${s.impressions.toLocaleString()} impr · ${s.clicks.toLocaleString()} clicks · CTR ${
        s.ctr != null ? `${(s.ctr * 100).toFixed(2)}%` : "n/a"
      } · pos ${s.position != null ? s.position.toFixed(1) : "n/a"} (${s.window.startDate}→${s.window.endDate})`
    : "search performance unavailable";
  return `${searchPart} · ${a.site.publishedCityPages.toLocaleString()} city pages · ${a.site.publishedProducts} products · ${a.site.paidStoreOrders} paid orders ($${a.site.storeRevenueUsd.toLocaleString()}) · ${a.site.quotes} quotes (${a.site.quotesLast30d} in 30d)`;
}
