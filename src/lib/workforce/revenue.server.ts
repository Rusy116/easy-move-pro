// ---------------------------------------------------------------------------
// Revenue analysis core — the single revenue engine used by BOTH the legacy
// /ai/ecosystem button and the new Workforce execution layer.
//
// Strictly read-only over finance/commerce tables. The only optional write is
// the daily observability rollup into ai_metrics_daily, which is opt-in.
// ---------------------------------------------------------------------------

export type RevenueAnalysis = {
  platformRevenue: number;
  brokerRevenue: number;
  productRevenue: number;
  pipeline: number;
  mrr: number;
  ltv: number | null;
  deals: number;
  rowsAnalyzed: number;
  tablesRead: string[];
};

/**
 * Compute the revenue rollup. `writeMetrics` defaults to false so the
 * Workforce read-only execution path performs zero writes.
 */
export async function computeRevenueAnalysis(
  supabase: any,
  opts: { writeMetrics?: boolean } = {},
): Promise<RevenueAnalysis> {
  const [{ data: comms }, { data: purchases }, { data: prods }] = await Promise.all([
    supabase.from("company_commissions").select("amount,broker_amount,status,created_at"),
    supabase.from("customer_purchases").select("amount_cents,status"),
    supabase.from("ai_products").select("revenue_cents,downloads"),
  ]);

  const rows = (comms ?? []) as {
    amount: number | null;
    broker_amount: number | null;
    status: string;
    created_at: string;
  }[];
  const purchaseRows = (purchases ?? []) as { amount_cents: number | null; status: string }[];
  const productRows = (prods ?? []) as { revenue_cents: number | null }[];

  const paid = rows.filter((r) => r.status === "paid");
  const platformRevenue = paid.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const brokerRevenue = paid.reduce((s, r) => s + Number(r.broker_amount ?? 0), 0);
  const pipeline = rows
    .filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const since = Date.now() - 30 * 86400000;
  const mrr = paid
    .filter((r) => new Date(r.created_at).getTime() >= since)
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const productRevenue =
    purchaseRows
      .filter((p) => p.status === "paid" || p.status === "completed")
      .reduce((s, p) => s + Number(p.amount_cents ?? 0), 0) /
      100 +
    productRows.reduce((s, p) => s + Number(p.revenue_cents ?? 0), 0) / 100;

  // No paid deals → LTV cannot be derived from real data.
  const ltv = paid.length ? Math.round((platformRevenue / paid.length) * 100) / 100 : null;

  if (opts.writeMetrics) {
    const day = new Date().toISOString().slice(0, 10);
    for (const [metric, value] of [
      ["revenue_platform", platformRevenue],
      ["revenue_broker", brokerRevenue],
      ["revenue_products", productRevenue],
      ["revenue_pipeline", pipeline],
      ["revenue_mrr_30d", mrr],
      ["revenue_ltv", ltv ?? 0],
    ] as [string, number][]) {
      await supabase
        .from("ai_metrics_daily")
        .insert({ day, metric, value, dims: { agent: "revenue_agent" } });
    }
  }

  return {
    platformRevenue,
    brokerRevenue,
    productRevenue,
    pipeline,
    mrr,
    ltv,
    deals: paid.length,
    rowsAnalyzed: rows.length + purchaseRows.length + productRows.length,
    tablesRead: ["company_commissions", "customer_purchases", "ai_products"],
  };
}

const money = (n: number) =>
  `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function summarizeRevenue(a: RevenueAnalysis) {
  return [
    `platform ${money(a.platformRevenue)}`,
    `broker ${money(a.brokerRevenue)}`,
    `products ${money(a.productRevenue)}`,
    `pipeline ${money(a.pipeline)}`,
    `30d ${money(a.mrr)}`,
    `LTV ${a.ltv === null ? "insufficient data" : money(a.ltv)}`,
    `${a.deals} paid deal(s)`,
  ].join(" · ");
}
