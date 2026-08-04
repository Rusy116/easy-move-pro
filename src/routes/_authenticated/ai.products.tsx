import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { CapabilityGrid, TaskTable, EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import { PRODUCT_CAPABILITIES } from "@/lib/ai/registry";
import { listProducts, listTasks } from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/products")({
  head: () => ({
    meta: [
      { title: "Digital Product Factory — Easy Moving" },
      { name: "description", content: "Generate, price and publish digital moving products." },
    ],
  }),
  component: ProductFactory,
});

function ProductFactory() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["ai", "products"], queryFn: listProducts });
  const tasks = useQuery({
    queryKey: ["ai", "tasks", "product_factory"],
    queryFn: () => listTasks({ agentKey: "product_factory", limit: 40 }),
  });

  const p = products.data ?? [];
  const revenue = p.reduce((a, b) => a + Number(b.revenue_cents ?? 0), 0) / 100;
  const downloads = p.reduce((a, b) => a + Number(b.downloads ?? 0), 0);

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Digital Product Factory"
        subtitle="From idea to published product, with covers, copy, schema and pricing."
        icon={<Package className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={p.length} />
        <StatCard label="Published" value={p.filter((x) => x.status === "published").length} tone="success" />
        <StatCard label="Downloads" value={downloads.toLocaleString()} tone="info" />
        <StatCard
          label="Revenue"
          value={`$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone="success"
        />
      </div>

      <SectionShell title="Capabilities">
        <CapabilityGrid
          capabilities={PRODUCT_CAPABILITIES}
          onQueued={() => qc.invalidateQueries({ queryKey: ["ai"] })}
        />
      </SectionShell>

      <SectionShell title="Product catalog & performance">
        {p.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Price</th>
                  <th className="py-2 pr-3 font-semibold">Quality</th>
                  <th className="py-2 pr-3 font-semibold">Downloads</th>
                  <th className="py-2 pr-3 font-semibold">Revenue</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Published</th>
                </tr>
              </thead>
              <tbody>
                {p.map((x) => (
                  <tr key={x.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{x.title}</td>
                    <td className="py-2.5 pr-3 capitalize text-muted-foreground">
                      {x.product_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">${(x.price_cents / 100).toFixed(2)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{x.quality_score ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{x.downloads}</td>
                    <td className="py-2.5 pr-3 tabular-nums">${(x.revenue_cents / 100).toFixed(2)}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={x.status} />
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{fmtDate(x.published_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No products yet" hint="Start with the Idea Generator." />
        )}
      </SectionShell>

      <SectionShell title="Recent product tasks">
        <TaskTable tasks={tasks.data ?? []} />
      </SectionShell>
    </AiShell>
  );
}
