import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Brain, Save } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import { listAgents, listContent, listProducts, listLogs } from "@/lib/ai/api";
import {
  DEFAULT_ORCHESTRATOR_SETTINGS,
  fmtDuration,
  isToday,
  listQueue,
  loadOrchestratorSettings,
  saveOrchestratorSettings,
  taskDuration,
  type OrchestratorSettings,
} from "@/lib/ai/orchestrator";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/orchestrator")({
  head: () => ({
    meta: [
      { title: "AI Orchestrator — Easy Moving" },
      {
        name: "description",
        content: "The CEO agent: creates, assigns and schedules work across every AI agent.",
      },
      { property: "og:title", content: "AI Orchestrator — Easy Moving" },
      {
        property: "og:description",
        content: "Command center for AI agents, task queues and execution policy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrchestratorPage,
});

function OrchestratorPage() {
  const tr = useT();
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents });
  const tasks = useQuery({ queryKey: ["ai", "queue"], queryFn: () => listQueue({ limit: 400 }) });
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const products = useQuery({ queryKey: ["ai", "products"], queryFn: listProducts });
  const logs = useQuery({ queryKey: ["ai", "logs", "orchestrator"], queryFn: () => listLogs({ limit: 20 }) });
  const settingsQuery = useQuery({
    queryKey: ["ai", "orchestrator-settings"],
    queryFn: loadOrchestratorSettings,
  });

  const [form, setForm] = useState<OrchestratorSettings>(DEFAULT_ORCHESTRATOR_SETTINGS);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const all = agents.data ?? [];
  const q = tasks.data ?? [];
  const items = content.data ?? [];
  const prods = products.data ?? [];

  const completed = q.filter((t) => t.status === "completed");
  const durations = completed.map(taskDuration).filter((d): d is number => !!d);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const revenue = prods.reduce((s, p) => s + (p.revenue_cents ?? 0), 0) / 100;

  async function save() {
    setSaving(true);
    try {
      await saveOrchestratorSettings(form);
      toast.success(tr("admin.ai2.orchestrator.toast.saved"));
      qc.invalidateQueries({ queryKey: ["ai", "orchestrator-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai2.orchestrator.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const num = (k: keyof OrchestratorSettings, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type="number"
        min={0}
        value={String(form[k])}
        onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
      />
    </div>
  );

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai2.orchestrator.eyebrow")}
        title={tr("admin.ai2.orchestrator.title")}
        subtitle={tr("admin.ai2.orchestrator.subtitle")}
        icon={<Brain className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai2.orchestrator.stat.totalAgents")} value={all.length} />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.activeAgents")}
          value={all.filter((a) => a.enabled && a.status === "running").length}
          tone="success"
        />
        <StatCard label={tr("admin.ai2.orchestrator.stat.runningTasks")} value={q.filter((t) => t.status === "running").length} tone="info" />
        <StatCard label={tr("admin.ai2.orchestrator.stat.completedTasks")} value={completed.length} tone="success" />
        <StatCard label={tr("admin.ai2.orchestrator.stat.failedTasks")} value={q.filter((t) => t.status === "failed").length} tone="danger" />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.queueSize")}
          value={q.filter((t) => ["pending", "queued", "waiting", "scheduled"].includes(t.status)).length}
          tone="warning"
        />
        <StatCard label={tr("admin.ai2.orchestrator.stat.avgExecTime")} value={fmtDuration(avg)} />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.pagesToday")}
          value={items.filter((i) => i.kind.includes("page") && isToday(i.created_at)).length}
        />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.productsToday")}
          value={prods.filter((p) => isToday(p.created_at)).length}
        />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.articlesToday")}
          value={items.filter((i) => i.kind.includes("article") && isToday(i.created_at)).length}
        />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.imagesToday")}
          value={
            q.filter((t) => t.capability.includes("cover") || t.capability.includes("preview"))
              .filter((t) => isToday(t.created_at)).length
          }
        />
        <StatCard
          label={tr("admin.ai2.orchestrator.stat.revenue")}
          value={revenue.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          tone="success"
        />
      </div>

      <SectionShell title={tr("admin.ai2.orchestrator.policy.title")}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {num("maxConcurrentTasks", tr("admin.ai2.orchestrator.policy.maxConcurrentTasks"))}
          {num("retryLimit", tr("admin.ai2.orchestrator.policy.retryLimit"))}
          {num("retryBackoffMinutes", tr("admin.ai2.orchestrator.policy.retryBackoff"))}
          {num("dailyTaskLimit", tr("admin.ai2.orchestrator.policy.dailyTaskLimit"))}
          {num("taskTimeoutMinutes", tr("admin.ai2.orchestrator.policy.taskTimeout"))}
          <div className="space-y-1.5">
            <Label htmlFor="whs">{tr("admin.ai2.orchestrator.policy.workingHoursStart")}</Label>
            <Input
              id="whs"
              type="time"
              value={form.workingHoursStart}
              onChange={(e) => setForm({ ...form, workingHoursStart: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whe">{tr("admin.ai2.orchestrator.policy.workingHoursEnd")}</Label>
            <Input
              id="whe"
              type="time"
              value={form.workingHoursEnd}
              onChange={(e) => setForm({ ...form, workingHoursEnd: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lvl">{tr("admin.ai2.orchestrator.policy.loggingLevel")}</Label>
            <select
              id="lvl"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.loggingLevel}
              onChange={(e) =>
                setForm({ ...form, loggingLevel: e.target.value as OrchestratorSettings["loggingLevel"] })
              }
            >
              {["debug", "info", "warn", "error"].map((l) => (
                <option key={l} value={l}>
                  {tr(`admin.ai2.orchestrator.loggingLevel.${l}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? tr("admin.ai2.orchestrator.policy.saving") : tr("admin.ai2.orchestrator.policy.save")}
          </Button>
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai2.orchestrator.log.title")}>
        {(logs.data ?? []).length ? (
          <ul className="divide-y divide-border/60">
            {(logs.data ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{l.message}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {l.agent_key.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={l.level} />
                  <span className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={tr("admin.ai2.orchestrator.log.emptyTitle")} hint={tr("admin.ai2.orchestrator.log.emptyHint")} />
        )}
      </SectionShell>
    </AiShell>
  );
}
