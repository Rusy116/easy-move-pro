import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { listContent, listMetrics, listProducts } from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/analytics")({
  head: () => ({
    meta: [
      { title: "AI Analytics — Easy Moving" },
      { name: "description", content: "Traffic, rankings, revenue and conversion for AI output." },
    ],
  }),
  component: AiAnalytics,
});

function TopList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string | number }[];
}) {
  return (
    <SectionShell title={title}>
      {rows.length ? (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 truncate">{r.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No data yet" />
      )}
    </SectionShell>
  );
}

function AiAnalytics() {
  const metrics = useQuery({ queryKey: ["ai", "metrics"], queryFn: listMetrics });
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const products = useQuery({ queryKey: ["ai", "products"], queryFn: listProducts });

  const m = metrics.data ?? [];
  const items = content.data ?? [];
  const p = products.data ?? [];

  const sum = (metric: string) =>
    m.filter((x) => x.metric === metric).reduce((a, b) => a + Number(b.value), 0);
  const avg = (metric: string) => {
    const rows = m.filter((x) => x.metric === metric);
    return rows.length ? rows.reduce((a, b) => a + Number(b.value), 0) / rows.length : 0;
  };

  const clicks = sum("organic_clicks");
  const impressions = sum("impressions");
  const downloads = p.reduce((a, b) => a + Number(b.downloads ?? 0), 0);
  const revenue = p.reduce((a, b) => a + Number(b.revenue_cents ?? 0), 0) / 100;

  const dim = (metric: string, key: string) => {
    const acc = new Map<string, number>();
    for (const row of m.filter((x) => x.metric === metric)) {
      const label = String((row.dims ?? {})[key] ?? "");
      if (!label) continue;
      acc.set(label, (acc.get(label) ?? 0) + Number(row.value));
    }
    return [...acc.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value: value.toLocaleString() }));
  };

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Analytics"
        subtitle="Performance of everything the AI workforce produced."
        icon={<LineChart className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pages created" value={items.length} />
        <StatCard label="Products published" value={p.filter((x) => x.status === "published").length} />
        <StatCard label="Organic clicks" value={clicks.toLocaleString()} tone="info" />
        <StatCard label="Impressions" value={impressions.toLocaleString()} tone="info" />
        <StatCard
          label="CTR"
          value={impressions ? `${((clicks / impressions) * 100).toFixed(2)}%` : "—"}
        />
        <StatCard label="Avg position" value={avg("avg_position") ? avg("avg_position").toFixed(1) : "—"} />
        <StatCard
          label="Revenue"
          value={`$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="success"
        />
        <StatCard label="Downloads" value={downloads.toLocaleString()} />
        <StatCard
          label="Conversion rate"
          value={clicks ? `${((downloads / clicks) * 100).toFixed(2)}%` : "—"}
        />
        <StatCard label="Tracked metrics" value={m.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopList
          title="Top performing pages"
          rows={items
            .filter((i) => i.status === "published")
            .slice(0, 8)
            .map((i) => ({ label: i.title, value: i.quality_score ?? "—" }))}
        />
        <TopList
          title="Top products"
          rows={[...p]
            .sort((a, b) => b.revenue_cents - a.revenue_cents)
            .slice(0, 8)
            .map((x) => ({ label: x.title, value: `$${(x.revenue_cents / 100).toFixed(0)}` }))}
        />
        <TopList title="Top keywords" rows={dim("organic_clicks", "keyword")} />
        <TopList title="Top cities" rows={dim("organic_clicks", "city")} />
      </div>
    </AiShell>
  );
}
