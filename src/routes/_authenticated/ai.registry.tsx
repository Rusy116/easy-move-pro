import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookUser,
  Play,
  Pause,
  RotateCcw,
  Square,
  PlayCircle,
  Power,
  Loader2,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ai/blocks";
import {
  AGENT_STATUS_TONE,
  agentHistory,
  agentLogs,
  controlAgent,
  dependencyState,
  fmtMs,
  fmtWhen,
  listRegistryAgents,
  queueAgentTask,
  recordRun,
  summarize,
  type AgentControl,
  type RegistryAgent,
} from "@/lib/ai/agent-registry";
import { AGENT_RUNNERS, hasRunner } from "@/lib/ai/agent-runners";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/registry")({
  head: () => ({
    meta: [
      { title: "AI Agent Registry — Easy Moving" },
      {
        name: "description",
        content:
          "Every AI agent registered as a real system component: status, queue, runtime, success rate, retries, dependencies, logs and history.",
      },
      { property: "og:title", content: "AI Agent Registry — Easy Moving" },
      {
        property: "og:description",
        content: "Start, pause, retry and monitor every registered AI agent from one console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistryPage,
});

function RegistryPage() {
  const tr = useT();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  const registry = useQuery({
    queryKey: ["ai", "registry", "v2"],
    queryFn: listRegistryAgents,
    refetchInterval: 20000,
  });

  const agents = useMemo(() => registry.data ?? [], [registry.data]);
  const stats = useMemo(() => summarize(agents), [agents]);
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(agents.map((a) => a.category))).sort()],
    [agents],
  );
  const visible = category === "all" ? agents : agents.filter((a) => a.category === category);

  const refresh = () => qc.invalidateQueries({ queryKey: ["ai"] });

  async function control(agent: RegistryAgent, action: AgentControl) {
    try {
      await controlAgent(agent, action);
      toast.success(tr("admin.ai4.reg.actionToast", { agent: agent.name, action }));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai4.reg.actionFailed"));
    }
  }

  async function runAgent(agent: RegistryAgent) {
    setBusy(agent.key);
    const started = performance.now();
    try {
      await controlAgent(agent, "start");
      const runner = AGENT_RUNNERS[agent.key];
      if (!runner) {
        await queueAgentTask(agent);
        toast.success(tr("admin.ai4.reg.queuedToast", { agent: agent.name }));
      } else {
        const summary = await runner();
        await recordRun(agent, { ok: true, ms: Math.round(performance.now() - started), summary });
        toast.success(tr("admin.ai4.reg.runToast", { agent: agent.name, summary }));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("admin.ai4.reg.runFailed");
      await recordRun(agent, {
        ok: false,
        ms: Math.round(performance.now() - started),
        error: message,
      });
      toast.error(tr("admin.ai4.reg.actionToast", { agent: agent.name, action: message }));
    } finally {
      setBusy(null);
      refresh();
    }
  }

  async function runSelected() {
    const list = agents.filter((a) => selected.includes(a.key));
    for (const a of list) await runAgent(a);
    setSelected([]);
  }

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai4.reg.eyebrow")}
        title={tr("admin.ai4.reg.title")}
        subtitle={tr("admin.ai4.reg.subtitle")}
        icon={<BookUser className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runSelected} disabled={!selected.length || !!busy}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {tr("admin.ai4.reg.runSelected", { n: String(selected.length) })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(visible.map((a) => a.key))}
              disabled={!visible.length}
            >
              {tr("admin.ai4.reg.selectAll")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={tr("admin.ai4.reg.statTotal")} value={stats.total} />
        <StatCard label={tr("admin.ai4.reg.statOnline")} value={stats.online} tone="success" />
        <StatCard label={tr("admin.ai4.reg.statRunning")} value={stats.running} tone="success" />
        <StatCard label={tr("admin.ai4.reg.statWaiting")} value={stats.waiting} />
        <StatCard label={tr("admin.ai4.reg.statFailed")} value={stats.failed} tone="danger" />
        <StatCard label={tr("admin.ai4.reg.statAvgRuntime")} value={fmtMs(stats.avgRuntimeMs)} />
        <StatCard label={tr("admin.ai4.reg.statAvgSuccess")} value={`${stats.avgSuccessRate}%`} />
        <StatCard label={tr("admin.ai4.reg.statTasksCompleted")} value={stats.tasksCompleted} tone="success" />
        <StatCard label={tr("admin.ai4.reg.statTasksFailed")} value={stats.tasksFailed} tone="danger" />
        <StatCard label={tr("admin.ai4.reg.statQueueLength")} value={stats.queueLength} />
      </div>

      <SectionShell
        title={tr("admin.ai4.reg.sectionAgents")}
        right={
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? tr("admin.ai4.reg.allCategories") : c}
              </option>
            ))}
          </select>
        }
      >
        {registry.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {tr("admin.ai4.reg.loading")}
          </div>
        ) : visible.length ? (
          <div className="space-y-3">
            {visible.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                all={agents}
                selected={selected.includes(a.key)}
                onToggle={() => toggle(a.key)}
                open={openKey === a.key}
                onOpen={() => setOpenKey(openKey === a.key ? null : a.key)}
                busy={busy === a.key}
                onControl={control}
                onRun={runAgent}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={tr("admin.ai4.reg.emptyTitle")}
            hint={tr("admin.ai4.reg.emptyHint")}
          />
        )}
      </SectionShell>
    </AiShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-xs">{value}</p>
    </div>
  );
}

function AgentCard({
  agent,
  all,
  selected,
  onToggle,
  open,
  onOpen,
  busy,
  onControl,
  onRun,
}: {
  agent: RegistryAgent;
  all: RegistryAgent[];
  selected: boolean;
  onToggle: () => void;
  open: boolean;
  onOpen: () => void;
  busy: boolean;
  onControl: (a: RegistryAgent, action: AgentControl) => void;
  onRun: (a: RegistryAgent) => void;
}) {
  const tr = useT();
  const dep = dependencyState(agent, all);

  return (
    <div className="card-premium p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 shrink-0"
            aria-label={tr("admin.ai4.reg.selectAgent", { agent: agent.name })}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{agent.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${AGENT_STATUS_TONE[agent.status]}`}
              >
                {agent.status}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {tr("admin.ai4.reg.versionLine", { version: String(agent.version), queue: agent.queue, priority: String(agent.priority) })}
              </span>
              {!dep.ok && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-600">
                  {tr("admin.ai4.reg.blockedBy", { names: dep.blocked.map((d) => d.name).join(", ") })}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{tr("admin.ai4.reg.idLabel", { id: agent.id })}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" onClick={() => onRun(agent)} disabled={busy || !agent.enabled}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
            {hasRunner(agent.key) ? tr("admin.ai4.reg.start") : tr("admin.ai4.reg.queue")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onControl(agent, agent.status === "paused" ? "resume" : "pause")}
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            {agent.status === "paused" ? tr("admin.ai4.reg.resume") : tr("admin.ai4.reg.pause")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onControl(agent, "retry")}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {tr("admin.ai4.reg.retry")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onControl(agent, "stop")}>
            <Square className="mr-1.5 h-3.5 w-3.5" />
            {tr("admin.ai4.reg.stop")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onControl(agent, agent.enabled ? "disable" : "enable")}
          >
            <Power className="mr-1.5 h-3.5 w-3.5" />
            {agent.enabled ? tr("admin.ai4.reg.disable") : tr("admin.ai4.reg.enable")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onOpen}>
            {open ? tr("admin.ai4.reg.hideDetails") : tr("admin.ai4.reg.details")}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        <Field label={tr("admin.ai4.reg.fieldCategory")} value={agent.category} />
        <Field label={tr("admin.ai4.reg.fieldTrigger")} value={`${agent.trigger_type}${agent.schedule ? ` · ${agent.schedule}` : ""}`} />
        <Field label={tr("admin.ai4.reg.fieldQueueStatus")} value={tr("admin.ai4.reg.queueLength", { n: String(agent.queueLength) })} />
        <Field label={tr("admin.ai4.reg.fieldLastRun")} value={fmtWhen(agent.last_run_at)} />
        <Field label={tr("admin.ai4.reg.fieldNextRun")} value={fmtWhen(agent.next_run_at)} />
        <Field label={tr("admin.ai4.reg.fieldRuntime")} value={fmtMs(agent.last_runtime_ms)} />
        <Field label={tr("admin.ai4.reg.fieldAvgRuntime")} value={fmtMs(agent.avg_runtime_ms)} />
        <Field label={tr("admin.ai4.reg.fieldSuccessRate")} value={`${agent.success_rate}%`} />
        <Field label={tr("admin.ai4.reg.fieldFailures")} value={agent.tasks_failed || agent.error_count} />
        <Field label={tr("admin.ai4.reg.fieldRetries")} value={`${agent.retry_count} / ${agent.max_retries}`} />
        <Field label={tr("admin.ai4.reg.fieldCreated")} value={fmtWhen(agent.created_at)} />
        <Field label={tr("admin.ai4.reg.fieldUpdated")} value={fmtWhen(agent.updated_at)} />
      </div>

      {agent.last_error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {tr("admin.ai4.reg.lastError", { error: agent.last_error })}
        </p>
      )}

      {open && <AgentDetails agent={agent} all={all} />}
    </div>
  );
}

function AgentDetails({ agent, all }: { agent: RegistryAgent; all: RegistryAgent[] }) {
  const tr = useT();
  const history = useQuery({
    queryKey: ["ai", "registry", "history", agent.key],
    queryFn: () => agentHistory(agent.key),
  });
  const logs = useQuery({
    queryKey: ["ai", "registry", "logs", agent.key],
    queryFn: () => agentLogs(agent.key),
  });
  const dep = dependencyState(agent, all);
  const errors = (history.data ?? []).filter((t) => t.status === "failed" || t.error);

  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
      <div className="space-y-3">
        <Block title={tr("admin.ai4.reg.inputTitle")}>
          {agent.inputs.length ? agent.inputs.join(", ") : tr("admin.ai4.reg.noInputs")}
        </Block>
        <Block title={tr("admin.ai4.reg.outputTitle")}>
          {agent.outputs.length ? agent.outputs.join(", ") : tr("admin.ai4.reg.noOutputs")}
        </Block>
        <Block title={tr("admin.ai4.reg.capabilitiesTitle")}>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.length ? (
              agent.capabilities.map((c) => (
                <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  {c}
                </span>
              ))
            ) : (
              <span>{tr("admin.ai4.reg.noCapabilities")}</span>
            )}
          </div>
        </Block>
        <Block title={tr("admin.ai4.reg.dependenciesTitle")}>
          {dep.deps.length ? (
            <ul className="space-y-1">
              {dep.deps.map((d) => (
                <li key={d.key} className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{d.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${AGENT_STATUS_TONE[d.status]}`}>
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            tr("admin.ai4.reg.noDependencies")
          )}
        </Block>
        <Block title={tr("admin.ai4.reg.healthTitle")}>
          {agent.enabled
            ? dep.ok
              ? tr("admin.ai4.reg.healthy", { rate: String(agent.success_rate), runs: String(agent.run_count) })
              : tr("admin.ai4.reg.blocked", { names: dep.blocked.map((d) => d.name).join(", ") })
            : tr("admin.ai4.reg.disabled")}
          {agent.route && (
            <>
              {" · "}
              <Link to={agent.route as "/"} className="text-primary underline">
                {tr("admin.ai4.reg.openPanel")}
              </Link>
            </>
          )}
        </Block>
      </div>

      <div className="space-y-3">
        <Block title={tr("admin.ai4.reg.historyTitle", { n: String(history.data?.length ?? 0) })}>
          {history.data?.length ? (
            <ul className="space-y-1">
              {history.data.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {t.status} · {fmtMs(t.duration_ms)} · {fmtWhen(t.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            tr("admin.ai4.reg.noRuns")
          )}
        </Block>
        <Block title={tr("admin.ai4.reg.logsTitle", { n: String(logs.data?.length ?? 0) })}>
          {logs.data?.length ? (
            <ul className="space-y-1 font-mono text-[11px]">
              {logs.data.slice(0, 8).map((l) => (
                <li key={l.id} className="truncate">
                  [{l.level}] {l.message}
                </li>
              ))}
            </ul>
          ) : (
            tr("admin.ai4.reg.noLogsRecorded")
          )}
        </Block>
        <Block title={tr("admin.ai4.reg.errorsTitle", { n: String(errors.length) })}>
          {errors.length ? (
            <ul className="space-y-1 text-destructive">
              {errors.slice(0, 5).map((e) => (
                <li key={e.id} className="truncate">
                  {e.error ?? e.title}
                </li>
              ))}
            </ul>
          ) : (
            tr("admin.ai4.reg.noErrors")
          )}
        </Block>
        <Block title={tr("admin.ai4.reg.performanceTitle")}>
          {tr("admin.ai4.reg.performanceLine", {
            runs: String(agent.run_count),
            completed: String(agent.tasks_completed),
            failed: String(agent.tasks_failed),
            avg: fmtMs(agent.avg_runtime_ms),
            last: fmtMs(agent.last_runtime_ms),
          })}
        </Block>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="mt-1.5 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}
