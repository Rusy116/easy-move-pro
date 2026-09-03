import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress, StatusPill, fmtDate } from "@/components/ai/blocks";
import { listLogs } from "@/lib/ai/api";
import {
  TASK_STATUSES,
  fmtDuration,
  listQueue,
  retryTask,
  setTaskStatus,
  taskDuration,
  type OrchestratorTask,
} from "@/lib/ai/orchestrator";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/queue")({
  head: () => ({
    meta: [
      { title: "Task Queue — Easy Moving" },
      { name: "description", content: "Every AI task, its status, dependencies and execution log." },
      { property: "og:title", content: "Task Queue — Easy Moving" },
      { property: "og:description", content: "Orchestrated AI task queue with retries and dependencies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QueuePage,
});

function statusLabel(tr: ReturnType<typeof useT>, s: string) {
  if (s === "all") return tr("admin.ai3.queue.filterAll");
  const key = `admin.ai3.queue.status.${s}`;
  const label = tr(key);
  return label === key ? s : label;
}

function QueuePage() {
  const tr = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const tasks = useQuery({ queryKey: ["ai", "queue"], queryFn: () => listQueue({ limit: 300 }) });
  const logs = useQuery({ queryKey: ["ai", "logs", "all"], queryFn: () => listLogs({ limit: 300 }) });

  const all = tasks.data ?? [];
  const rows = status === "all" ? all : all.filter((t) => t.status === status);

  async function run(fn: () => Promise<void>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai3.queue.toastActionFailed"));
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai.activity.eyebrow")}
        title={tr("admin.ai3.queue.title")}
        subtitle={tr("admin.ai3.queue.subtitle")}
        icon={<ListOrdered className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai3.queue.statTotal")} value={all.length} />
        <StatCard
          label={tr("admin.ai3.queue.statRunning")}
          value={all.filter((t) => t.status === "running").length}
          tone="info"
        />
        <StatCard
          label={tr("admin.ai3.queue.statWaiting")}
          value={all.filter((t) => t.depends_on?.length && t.status !== "completed").length}
          tone="warning"
        />
        <StatCard
          label={tr("admin.ai3.queue.statFailed")}
          value={all.filter((t) => t.status === "failed").length}
          tone="danger"
        />
      </div>

      <SectionShell title={tr("admin.ai3.queue.queueTitle")}>
        <div className="mb-4 flex flex-wrap gap-2">
          {["all", ...TASK_STATUSES, "scheduled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                status === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {statusLabel(tr, s)}
            </button>
          ))}
        </div>

        {rows.length ? (
          <div className="space-y-2">
            {rows.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                open={openId === t.id}
                onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                logs={(logs.data ?? []).filter((l) => l.task_id === t.id)}
                onRun={run}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={tr("admin.ai3.queue.emptyTitle")} hint={tr("admin.ai3.queue.emptyHint")} />
        )}
      </SectionShell>
    </AiShell>
  );
}

function TaskRow({
  task,
  open,
  onToggle,
  logs,
  onRun,
}: {
  task: OrchestratorTask;
  open: boolean;
  onToggle: () => void;
  logs: { id: string; message: string; level: string; created_at: string }[];
  onRun: (fn: () => Promise<void>, msg: string) => Promise<void>;
}) {
  const tr = useT();
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{task.title}</span>
            <StatusPill status={task.status} />
            {task.retry_count > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                {tr("admin.ai3.queue.retryBadge", { count: task.retry_count, max: task.max_retries })}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {task.id.slice(0, 8)} · {task.agent_key.replace(/_/g, " ")} · {task.capability} ·{" "}
            {tr("admin.ai3.queue.priority", { n: task.priority })}
          </p>
        </button>
        <div className="flex items-center gap-2">
          {task.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRun(() => retryTask(task), tr("admin.ai3.queue.toastRequeued"))}
            >
              {tr("admin.ai3.queue.btnRetry")}
            </Button>
          )}
          {!["completed", "cancelled"].includes(task.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onRun(() => setTaskStatus(task, "cancelled"), tr("admin.ai3.queue.toastCancelled"))
              }
            >
              {tr("admin.ai3.queue.btnCancel")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 w-full max-w-xs">
        <Progress value={task.progress} />
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-xs">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-muted-foreground">
            <span>{tr("admin.ai3.queue.created", { date: fmtDate(task.created_at) })}</span>
            <span>{tr("admin.ai3.queue.started", { date: fmtDate(task.started_at) })}</span>
            <span>{tr("admin.ai3.queue.completed", { date: fmtDate(task.completed_at) })}</span>
            <span>{tr("admin.ai3.queue.runtime", { duration: fmtDuration(taskDuration(task)) })}</span>
          </div>
          <div>
            <p className="font-medium text-foreground">{tr("admin.ai3.queue.dependencies")}</p>
            {task.depends_on?.length ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                {task.depends_on.map((d) => d.slice(0, 8)).join(", ")}
              </p>
            ) : (
              <p className="text-muted-foreground">{tr("admin.ai3.queue.noDeps")}</p>
            )}
          </div>
          {task.error && (
            <p className="text-rose-600 dark:text-rose-400">
              {tr("admin.ai3.queue.error", { error: task.error })}
            </p>
          )}
          <div>
            <p className="font-medium text-foreground">{tr("admin.ai3.queue.executionLog")}</p>
            {logs.length ? (
              <ul className="mt-1 space-y-1">
                {logs.map((l) => (
                  <li key={l.id} className="text-muted-foreground">
                    <span className="font-mono">{fmtDate(l.created_at)}</span> · {l.level} · {l.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{tr("admin.ai3.queue.noLogs")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
