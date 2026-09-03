import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState, Progress } from "@/components/ai/blocks";
import { listAgents } from "@/lib/ai/api";
import { fmtDuration, listQueue, taskDuration } from "@/lib/ai/orchestrator";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/performance")({
  head: () => ({
    meta: [
      { title: "Agent Performance — Easy Moving" },
      { name: "description", content: "Success rate, throughput and runtime per AI agent." },
      { property: "og:title", content: "Agent Performance — Easy Moving" },
      { property: "og:description", content: "Performance reporting for the orchestrated AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  const tr = useT();
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents });
  const tasks = useQuery({ queryKey: ["ai", "queue"], queryFn: () => listQueue({ limit: 400 }) });

  const all = tasks.data ?? [];
  const rows = (agents.data ?? []).map((a) => {
    const mine = all.filter((t) => t.agent_key === a.key);
    const done = mine.filter((t) => t.status === "completed");
    const failed = mine.filter((t) => t.status === "failed");
    const durations = done.map(taskDuration).filter((d): d is number => !!d);
    const avg = durations.length ? durations.reduce((x, y) => x + y, 0) / durations.length : a.avg_runtime_ms;
    const total = done.length + failed.length;
    const rate = total ? (done.length / total) * 100 : Number(a.success_rate ?? 0);
    return { agent: a, done: done.length, failed: failed.length, avg, rate };
  });

  const totalDone = rows.reduce((s, r) => s + r.done, 0);
  const totalFailed = rows.reduce((s, r) => s + r.failed, 0);
  const overall = totalDone + totalFailed ? (totalDone / (totalDone + totalFailed)) * 100 : 100;

  // Simple 14-day throughput series from completed task timestamps.
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const count = all.filter(
      (t) => t.status === "completed" && (t.completed_at ?? "").slice(0, 10) === key,
    ).length;
    return { key, label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), count };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai2.performance.eyebrow")}
        title={tr("admin.ai2.performance.title")}
        subtitle={tr("admin.ai2.performance.subtitle")}
        icon={<LineChart className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai2.performance.stat.overallSuccess")} value={`${overall.toFixed(1)}%`} tone="success" />
        <StatCard label={tr("admin.ai2.performance.stat.tasksCompleted")} value={totalDone} />
        <StatCard label={tr("admin.ai2.performance.stat.tasksFailed")} value={totalFailed} tone="danger" />
        <StatCard
          label={tr("admin.ai2.performance.stat.agentsMeasured")}
          value={rows.filter((r) => r.done + r.failed > 0).length}
          tone="info"
        />
      </div>

      <SectionShell title={tr("admin.ai2.performance.throughput.title")}>
        <div className="flex h-40 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-sage to-ochre"
                style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? "4px" : "2px" }}
                title={`${d.count} completed`}
              />
              <span className="text-[9px] text-muted-foreground">{d.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai2.performance.perAgent.title")}>
        {rows.length ? (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.agent.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{r.agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tr("admin.ai2.performance.perAgent.summary", {
                      rate: r.rate.toFixed(1),
                      done: r.done,
                      failed: r.failed,
                      avg: fmtDuration(r.avg),
                    })}
                  </span>
                </div>
                <Progress value={r.rate} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={tr("admin.ai2.performance.perAgent.emptyTitle")} />
        )}
      </SectionShell>
    </AiShell>
  );
}
