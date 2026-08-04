import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { CapabilityGrid, TaskTable, EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import { CONTENT_CAPABILITIES } from "@/lib/ai/registry";
import { listContent, listTasks } from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/content")({
  head: () => ({
    meta: [
      { title: "Content Factory — Easy Moving" },
      { name: "description", content: "Articles, guides, checklists and local content production." },
    ],
  }),
  component: ContentFactory,
});

function ContentFactory() {
  const qc = useQueryClient();
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const tasks = useQuery({
    queryKey: ["ai", "tasks", "content_factory"],
    queryFn: () => listTasks({ agentKey: "content_factory", limit: 40 }),
  });

  const items = content.data ?? [];
  const calendar = items
    .filter((i) => i.scheduled_for)
    .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1));

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Content Factory"
        subtitle="Editorial production and the publishing calendar."
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Content items" value={items.length} />
        <StatCard label="Drafts" value={items.filter((i) => i.status === "draft").length} />
        <StatCard label="In review" value={items.filter((i) => i.status === "review").length} tone="info" />
        <StatCard label="Scheduled" value={calendar.length} tone="warning" />
      </div>

      <SectionShell title="Capabilities">
        <CapabilityGrid
          capabilities={CONTENT_CAPABILITIES}
          onQueued={() => qc.invalidateQueries({ queryKey: ["ai"] })}
        />
      </SectionShell>

      <SectionShell title="Content calendar">
        {calendar.length ? (
          <ul className="divide-y divide-border/60">
            {calendar.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {i.kind.replace(/_/g, " ")} · {i.locale}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={i.status} />
                  <span className="text-xs text-muted-foreground">{fmtDate(i.scheduled_for)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing scheduled" hint="Schedule a capability to build the calendar." />
        )}
      </SectionShell>

      <SectionShell title="Recent content tasks">
        <TaskTable tasks={tasks.data ?? []} />
      </SectionShell>
    </AiShell>
  );
}
