import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  HeartPulse,
  FileBarChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState, fmtDate } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  supervisorTick,
  supervisorStats,
  supervisorHealth,
  supervisorControl,
  supervisorRefill,
  generateSupervisorReports,
  listSupervisorReports,
} from "@/lib/ai-supervisor.functions";
import {
  SUPERVISOR_CHAIN,
  STATE_TONE,
  SUPERVISOR_STATES,
  HEALTH_LABELS,
  REPORT_LABELS,
  SUPERVISOR_STORAGE_KEY,
  type HealthCheckKey,
  type ReportKind,
} from "@/lib/ai/supervisor";
import { ROLLOUT_STATES, WORKER_OPTIONS } from "@/lib/city-production/mass";

export const Route = createFileRoute("/_authenticated/ai/supervisor")({
  head: () => ({
    meta: [
      { title: "AI Supervisor — Mass Production Orchestrator | Easy Moving" },
      {
        name: "description",
        content:
          "Master AI Supervisor that plans, assigns, monitors and retries every city production agent, with health monitoring and batch reports.",
      },
      { property: "og:title", content: "AI Supervisor — Mass Production Orchestrator" },
      {
        property: "og:description",
        content: "Coordinate every production agent from one supervisor console: queue, health, throughput and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupervisorPage,
});

function ms(v: number) {
  if (!v) return "—";
  return v > 60000 ? `${(v / 60000).toFixed(1)} min` : `${(v / 1000).toFixed(1)}s`;
}

const HEALTH_TONE: Record<string, string> = {
  ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  down: "bg-destructive/12 text-destructive",
};

function SupervisorPage() {
  const qc = useQueryClient();
  const [auto, setAuto] = useState(false);
  const [workers, setWorkers] = useState(2);
  const [stateCode, setStateCode] = useState("CA");
  const [log, setLog] = useState<{ t: string; msg: string; ok: boolean }[]>([]);
  const busy = useRef(false);

  const stats = useQuery({ queryKey: ["supervisor-stats"], queryFn: () => supervisorStats({ data: {} }) });
  const health = useQuery({
    queryKey: ["supervisor-health"],
    queryFn: () => supervisorHealth({ data: {} }),
    refetchInterval: 60_000,
  });
  const reports = useQuery({ queryKey: ["supervisor-reports"], queryFn: () => listSupervisorReports({ data: {} }) });

  // Autopilot survives reloads — production never stops unless paused.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SUPERVISOR_STORAGE_KEY);
    if (saved) {
      try {
        const v = JSON.parse(saved) as { auto?: boolean; workers?: number; stateCode?: string };
        if (v.auto) setAuto(true);
        if (v.workers) setWorkers(v.workers);
        if (v.stateCode) setStateCode(v.stateCode);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify({ auto, workers, stateCode }));
  }, [auto, workers, stateCode]);

  const addLog = (msg: string, ok = true) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg, ok }, ...l].slice(0, 60));

  const tick = useMutation({
    mutationFn: () => supervisorTick({ data: { workers } }),
    onSuccess: (r) => {
      for (const res of r.results) {
        addLog(`${res.worker} · ${res.agent} · ${res.city} — ${res.summary}`, res.ok);
      }
      if (r.staleReclaimed) addLog(`${r.staleReclaimed} stalled leases reclaimed`, false);
      if (r.skipped) addLog(`${r.skipped} broken pages skipped — queue continues`, false);
      if (!r.assigned) addLog("No city available — refilling queue", false);
      qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
    },
    onError: (e) => addLog(e instanceof Error ? e.message : "Supervisor tick failed", false),
  });

  const refill = useMutation({
    mutationFn: () => supervisorRefill({ data: { stateCode, count: 100 } }),
    onSuccess: (r) => {
      if (r.exhausted) addLog("All rollout states exhausted", false);
      else {
        if (r.rolledOver) setStateCode(r.stateCode);
        addLog(`${r.queued} cities loaded for ${r.stateCode}${r.rolledOver ? " (next state)" : ""}`);
      }
      qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Refill failed"),
  });

  const control = useMutation({
    mutationFn: (action: "pause_all" | "resume_all" | "requeue_failed" | "clear_skipped") =>
      supervisorControl({ data: { action } }),
    onSuccess: () => {
      toast.success("Queue updated");
      qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
    },
  });

  const makeReports = useMutation({
    mutationFn: () => generateSupervisorReports({ data: { stateCode } }),
    onSuccess: (r) => {
      toast.success(`${r.created} reports stored`);
      qc.invalidateQueries({ queryKey: ["supervisor-reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Report generation failed"),
  });

  // Autopilot loop: keeps producing, refills the queue when it runs dry.
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const r = await supervisorTick({ data: { workers } });
        if (cancelled) return;
        for (const res of r.results) addLog(`${res.worker} · ${res.agent} · ${res.city} — ${res.summary}`, res.ok);
        if (!r.assigned) {
          const f = await supervisorRefill({ data: { stateCode, count: 100 } });
          if (f.exhausted) addLog("All rollout states exhausted — autopilot idle", false);
          else {
            if (f.rolledOver) setStateCode(f.stateCode);
            addLog(`Queue refilled: ${f.queued} cities in ${f.stateCode}`);
          }
        }
        qc.invalidateQueries({ queryKey: ["supervisor-stats"] });
      } catch (e) {
        addLog(e instanceof Error ? e.message : "Supervisor error", false);
      } finally {
        busy.current = false;
      }
    };
    void run();
    const id = window.setInterval(run, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [auto, workers, stateCode, qc]);

  const s = stats.data;

  return (
    <AiShell>
      <PageHeader
        icon={Brain}
        title="AI Supervisor"
        subtitle="Master orchestrator — plans, assigns, monitors and retries every production agent. It never writes content itself."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={auto ? "destructive" : "default"} onClick={() => setAuto((v) => !v)}>
              {auto ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
              {auto ? "Pause supervisor" : "Start supervisor"}
            </Button>
            <Button variant="outline" onClick={() => tick.mutate()} disabled={tick.isPending}>
              {tick.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
              Single tick
            </Button>
            <Button variant="outline" onClick={() => refill.mutate()} disabled={refill.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> Refill queue
            </Button>
          </div>
        }
      />

      {/* Throughput */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Current city" value={s?.currentCity ?? "—"} />
        <StatCard label="Current agent" value={s?.currentAgent ?? "Idle"} />
        <StatCard label="Pages / hour" value={s?.perHour ?? 0} />
        <StatCard label="Cities / day" value={s?.perDay ?? 0} />
        <StatCard label="Avg processing" value={ms(s?.avgMs ?? 0)} />
        <StatCard label="Published today" value={s?.publishedToday ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Failures" value={s?.failures ?? 0} />
        <StatCard label="Retries" value={s?.retries ?? 0} />
        <StatCard label="Publish count" value={s?.publishedTotal ?? 0} />
        <StatCard label="Index count" value={s?.indexCount ?? 0} />
        <StatCard label="Avg SEO score" value={s?.avgSeoScore ?? "—"} />
        <StatCard label="Images created" value={s?.imagesCreated ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Blog articles" value={s?.blogCount ?? 0} />
        <StatCard label="Digital products" value={s?.productCount ?? 0} />
        <StatCard label="Revenue events" value={s?.revenueEvents ?? 0} />
        <StatCard label="Lead events today" value={s?.leadEvents ?? 0} />
      </div>

      {/* Controls */}
      <SectionShell title="Workload balancing" description="Workers share the queue; a city is leased to exactly one worker at a time.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Workers</span>
            {WORKER_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWorkers(w)}
                className={`h-8 w-8 rounded-lg border text-xs font-semibold ${
                  workers === w ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">State</span>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            >
              {ROLLOUT_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => control.mutate("pause_all")}>
              <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause all
            </Button>
            <Button size="sm" variant="outline" onClick={() => control.mutate("resume_all")}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> Resume all
            </Button>
            <Button size="sm" variant="outline" onClick={() => control.mutate("requeue_failed")}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Requeue failed
            </Button>
            <Button size="sm" variant="outline" onClick={() => control.mutate("clear_skipped")}>
              Restore skipped
            </Button>
          </div>
        </div>
      </SectionShell>

      {/* Queue states */}
      <SectionShell title="Production queue" description="Every city carries one supervisor state at all times.">
        <div className="mb-4 flex flex-wrap gap-2">
          {SUPERVISOR_STATES.map((st) => (
            <span key={st} className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${STATE_TONE[st]}`}>
              {st} · {s?.states?.[st] ?? 0}
            </span>
          ))}
        </div>
        {!s?.queue?.length ? (
          <EmptyState title="Queue is empty" hint="Refill the queue or start the supervisor to load the next cities." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">City</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Agent</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Attempts</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {s.queue.map((j) => (
                  <tr key={j.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{j.city}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATE_TONE[j.state]}`}>
                        {j.state}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{j.agent}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{j.stage}/12</td>
                    <td className="py-2 pr-3 text-muted-foreground">{j.worker ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{j.attempts}</td>
                    <td className="py-2 max-w-[280px] truncate text-xs text-muted-foreground">
                      {j.skipped_reason ?? j.last_error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      {/* Agent chain */}
      <SectionShell title="Agent chain" description="Fixed order — each city walks the chain top to bottom, one agent at a time.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SUPERVISOR_CHAIN.map((a) => {
            const active = s?.currentAgent === a.name;
            return (
              <div
                key={a.key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                  active ? "border-foreground bg-foreground/[0.04]" : "border-border"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-semibold">
                  {a.order}
                </span>
                <span className="truncate">{a.name}</span>
                {active && <span className="ml-auto text-[11px] font-semibold text-ochre">running</span>}
              </div>
            );
          })}
        </div>
      </SectionShell>

      {/* Health */}
      <SectionShell
        title="Health monitor"
        description="Swept every minute: agents, memory, queue, database, API, publishing, indexing and images."
        actions={
          <Button size="sm" variant="outline" onClick={() => health.refetch()}>
            <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> Run check
          </Button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(health.data?.checks ?? []).map((c) => (
            <div key={c.key} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{HEALTH_LABELS[c.key as HealthCheckKey] ?? c.key}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${HEALTH_TONE[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Incident log</h4>
          {!health.data?.incidents?.length ? (
            <EmptyState title="No incidents recorded" hint="Crashes, stalled workers and skipped pages appear here." />
          ) : (
            <ul className="space-y-1.5">
              {health.data.incidents.map((i) => (
                <li key={i.id} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                  <AlertTriangle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      i.severity === "critical" || i.severity === "error" ? "text-destructive" : "text-amber-500"
                    }`}
                  />
                  <span className="flex-1">{i.message}</span>
                  <span className="shrink-0 text-muted-foreground">{fmtDate(i.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionShell>

      {/* Reports */}
      <SectionShell
        title="Batch reports"
        description="Production, SEO, Publishing, Quality and Revenue reports stored in the AI Growth Center."
        actions={
          <Button size="sm" onClick={() => makeReports.mutate()} disabled={makeReports.isPending}>
            {makeReports.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileBarChart className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate reports
          </Button>
        }
      >
        {!reports.data?.length ? (
          <EmptyState title="No reports yet" hint="Generate a batch report after a production run." />
        ) : (
          <div className="space-y-2">
            {reports.data.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {REPORT_LABELS[r.kind as ReportKind] ?? r.kind}
                    {r.state_code ? ` · ${r.state_code}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.summary}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{r.batch_label}</p>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* Live log */}
      <SectionShell title="Supervisor log" description="Live assignment stream from the current session.">
        {!log.length ? (
          <EmptyState title="No activity yet" hint="Start the supervisor to watch agents get assigned." />
        ) : (
          <ul className="space-y-1 font-mono text-[11px]">
            {log.map((l, i) => (
              <li key={i} className="flex items-start gap-2">
                {l.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                )}
                <span className="text-muted-foreground">{l.t}</span>
                <span className="flex-1">{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </AiShell>
  );
}
