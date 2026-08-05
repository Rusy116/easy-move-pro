import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState, Progress, StatusPill, fmtDate } from "@/components/ai/blocks";
import { listAgents } from "@/lib/ai/api";
import { fmtDuration, listQueue, taskDuration } from "@/lib/ai/orchestrator";

export const Route = createFileRoute("/_authenticated/ai/monitor")({
  head: () => ({
    meta: [
      { title: "Queue Monitor — Easy Moving" },
      { name: "description", content: "Live health of the AI queue: load, throughput and stuck work." },
      { property: "og:title", content: "Queue Monitor — Easy Moving" },
      { property: "og:description", content: "Real-time AI queue health and agent load." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonitorPage,
});

function MonitorPage() {
  const tasks = useQuery({
    queryKey: ["ai", "queue"],
    queryFn: () => listQueue({ limit: 400 }),
    refetchInterval: 15000,
  });
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents, refetchInterval: 15000 });

  const all = tasks.data ?? [];
  const running = all.filter((t) => t.status === "running");
  const pending = all.filter((t) => ["pending", "queued", "waiting", "scheduled"].includes(t.status));
  const failed = all.filter((t) => t.status === "failed");
  const completed = all.filter((t) => t.status === "completed");
  const health =
    all.length === 0 ? 100 : Math.round((completed.length / (completed.length + failed.length || 1)) * 100);

  const stuck = running.filter(
    (t) => t.started_at && Date.now() - new Date(t.started_at).getTime() > 60 * 60 * 1000,
  );

  const byAgent = new Map<string, number>();
  for (const t of [...running, ...pending]) {
    byAgent.set(t.agent_key, (byAgent.get(t.agent_key) ?? 0) + 1);
  }
  const maxLoad = Math.max(1, ...byAgent.values());

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Orchestrator"
        title="Queue Monitor"
        subtitle="Queue health, per-agent load and long-running work. Refreshes automatically."
        icon={<Gauge className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Queue health" value={`${health}%`} tone={health > 90 ? "success" : "warning"} />
        <StatCard label="Running now" value={running.length} tone="info" />
        <StatCard label="Waiting" value={pending.length} tone="warning" />
        <StatCard label="Stuck > 1h" value={stuck.length} tone={stuck.length ? "danger" : "default"} />
      </div>

      <SectionShell title="Load per agent">
        {byAgent.size ? (
          <ul className="space-y-3">
            {[...byAgent.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => {
                const agent = (agents.data ?? []).find((a) => a.key === key);
                return (
                  <li key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize">{agent?.name ?? key.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{count} task(s)</span>
                    </div>
                    <Progress value={(count / maxLoad) * 100} />
                  </li>
                );
              })}
          </ul>
        ) : (
          <EmptyState title="Queue is empty" hint="No agent currently has pending work." />
        )}
      </SectionShell>

      <SectionShell title="Currently running">
        {running.length ? (
          <ul className="divide-y divide-border/60">
            {running.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.agent_key.replace(/_/g, " ")} · started {fmtDate(t.started_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={t.status} />
                  <span className="text-xs text-muted-foreground">{fmtDuration(taskDuration(t))}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing running" hint="Agents are idle." />
        )}
      </SectionShell>

      <SectionShell title="Recent failures">
        {failed.length ? (
          <ul className="divide-y divide-border/60">
            {failed.slice(0, 20).map((t) => (
              <li key={t.id} className="py-3">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400">{t.error ?? "Unknown error"}</p>
                <p className="text-xs text-muted-foreground">
                  {t.agent_key.replace(/_/g, " ")} · {fmtDate(t.completed_at ?? t.created_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No failures" hint="Every task completed successfully." />
        )}
      </SectionShell>
    </AiShell>
  );
}
