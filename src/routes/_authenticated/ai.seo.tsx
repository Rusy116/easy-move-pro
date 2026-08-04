import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { CapabilityGrid, TaskTable, EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import { SEO_CAPABILITIES } from "@/lib/ai/registry";
import { listContent, listTasks } from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/seo")({
  head: () => ({
    meta: [
      { title: "SEO Factory — Easy Moving" },
      { name: "description", content: "Produce city, route, service and FAQ pages at scale." },
    ],
  }),
  component: SeoFactory,
});

function SeoFactory() {
  const qc = useQueryClient();
  const tasks = useQuery({
    queryKey: ["ai", "tasks", "seo_factory"],
    queryFn: () => listTasks({ agentKey: "seo_factory", limit: 40 }),
  });
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });

  const items = content.data ?? [];
  const queue = items.filter((i) => ["draft", "review", "approved", "scheduled"].includes(i.status));
  const scored = items.filter((i) => i.quality_score != null);
  const avgQuality = scored.length
    ? scored.reduce((a, b) => a + Number(b.quality_score), 0) / scored.length
    : 0;

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="SEO Factory"
        subtitle="Queue page production, audits and refreshes. Execution is handled by the SEO agent."
        icon={<Search className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pages tracked" value={items.length} />
        <StatCard label="In publishing queue" value={queue.length} tone="warning" />
        <StatCard label="Published" value={items.filter((i) => i.status === "published").length} tone="success" />
        <StatCard label="Avg quality score" value={avgQuality ? avgQuality.toFixed(0) : "—"} tone="info" />
      </div>

      <SectionShell title="Capabilities">
        <CapabilityGrid
          capabilities={SEO_CAPABILITIES}
          onQueued={() => qc.invalidateQueries({ queryKey: ["ai"] })}
        />
      </SectionShell>

      <SectionShell title="Publishing queue">
        {queue.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">Kind</th>
                  <th className="py-2 pr-3 font-semibold">City / keyword</th>
                  <th className="py-2 pr-3 font-semibold">Quality</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((i) => (
                  <tr key={i.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{i.title}</td>
                    <td className="py-2.5 pr-3 capitalize text-muted-foreground">{i.kind.replace(/_/g, " ")}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{i.target_city ?? i.keyword ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{i.quality_score ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={i.status} />
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{fmtDate(i.scheduled_for)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Queue is empty" hint="Queue a capability above to fill the pipeline." />
        )}
      </SectionShell>

      <SectionShell title="Recent SEO tasks">
        <TaskTable tasks={tasks.data ?? []} />
      </SectionShell>
    </AiShell>
  );
}
