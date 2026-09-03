import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Play, Pause, RotateCcw, Plus, Loader2, CheckCircle2, XCircle, Rocket, Circle } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  enqueueProduction,
  productionTick,
  productionStats,
  controlProduction,
  enqueuePilotBatch,
  pilotStatus,
  preparePhase9,
  enqueueMassBatch,
} from "@/lib/city-production.functions";
import { workerStatus, setWorkerSettings, runWorkerNow } from "@/lib/city-worker.functions";
import { PRODUCTION_STAGES, TOTAL_STAGES } from "@/lib/city-production/stages";
import { useT } from "@/i18n";

type WorkerRun = {
  id: string;
  created_at: string;
  trigger: string;
  jobs_processed: number;
  published: number;
  failed: number;
  refilled: number;
  error: string | null;
};

import { PILOT_CITIES } from "@/lib/city-production/pilot";
import {
  BATCH_SIZES,
  WORKER_OPTIONS,
  ROLLOUT_STATES,
  AUTOPILOT_STORAGE_KEY,
} from "@/lib/city-production/mass";

export const Route = createFileRoute("/_authenticated/ai/production")({
  head: () => ({
    meta: [
      { title: "City Production Factory — 12-Stage Pipeline | Easy Moving" },
      {
        name: "description",
        content:
          "Autonomous production line that takes every US city through data, calculator, SEO, links, images, content, quality and publishing.",
      },
    ],
  }),
  component: ProductionPage,
});

const BATCHES = [...BATCH_SIZES];

function ms(v: number) {
  if (!v) return "—";
  return v > 60000 ? `${(v / 60000).toFixed(1)} min` : `${(v / 1000).toFixed(1)}s`;
}

function ProductionPage() {
  const tr = useT();
  const qc = useQueryClient();
  const [auto, setAuto] = useState(false);
  const [workers, setWorkers] = useState(1);
  const [stateCode, setStateCode] = useState("CA");
  const [log, setLog] = useState<{ t: string; msg: string; ok: boolean }[]>([]);
  const running = useRef(false);

  // Resume production automatically after an interruption (reload, navigation).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(AUTOPILOT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { auto?: boolean; workers?: number };
      if (parsed.workers) setWorkers(parsed.workers);
      if (parsed.auto) setAuto(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTOPILOT_STORAGE_KEY, JSON.stringify({ auto, workers }));
  }, [auto, workers]);

  const push = (msg: string, ok = true) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg, ok }, ...l].slice(0, 60));

  const stats = useQuery({
    queryKey: ["city-production-stats"],
    queryFn: () => productionStats({ data: {} as never }),
    refetchInterval: 6000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["city-production-stats"] });

  const pilot = useQuery({
    queryKey: ["city-pilot-status"],
    queryFn: () => pilotStatus({ data: {} as never }),
    refetchInterval: 6000,
  });

  // Backend worker (browser-free production service).
  const worker = useQuery({
    queryKey: ["city-worker-status"],
    queryFn: () => workerStatus({ data: {} as never }),
    refetchInterval: 8000,
  });
  const w = worker.data;
  const refreshWorker = () => qc.invalidateQueries({ queryKey: ["city-worker-status"] });

  const toggleWorker = useMutation({
    mutationFn: (enabled: boolean) => setWorkerSettings({ data: { enabled } }),
    onSuccess: (next) => {
      push(`Backend worker ${next.enabled ? tr("admin.ai4.prod.workerToggleStarted") : tr("admin.ai4.prod.workerToggleStopped")}`);
      toast.success(next.enabled ? tr("admin.ai4.prod.workerRunningToast") : tr("admin.ai4.prod.workerPausedToast"));
      refreshWorker();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: () => runWorkerNow({ data: {} as never }),
    onSuccess: (r) => {
      push(tr("admin.ai4.prod.serverTickLog", { processed: String(r.processed), published: String(r.published), failed: String(r.failed) }), r.failed === 0);
      refreshWorker();
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["city-production-stats"] });
    void qc.invalidateQueries({ queryKey: ["city-pilot-status"] });
  };

  const startPilot = useMutation({
    mutationFn: () => enqueuePilotBatch({ data: {} as never }),
    onSuccess: (r) => {
      push(tr("admin.ai4.prod.pilotBatchQueued", { queued: String(r.queued), already: String(r.alreadyQueued) }));
      toast.success(tr("admin.ai4.prod.pilotBatchQueuedToast"));
      setAuto(true);
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const phase9 = useMutation({
    mutationFn: () => preparePhase9({ data: {} as never }),
    onSuccess: (r) => {
      push(tr("admin.ai4.prod.phase9Prepared", { queued: String(r.queued) }));
      toast.success(tr("admin.ai4.prod.californiaQueuedToast", { queued: String(r.queued) }));
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enqueue = useMutation({
    mutationFn: (count: number) => enqueueProduction({ data: { count } }),
    onSuccess: (r) => {
      push(tr("admin.ai4.prod.queuedByPriority", { queued: String(r.queued) }));
      toast.success(tr("admin.ai4.prod.citiesQueuedToast", { queued: String(r.queued) }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const massBatch = useMutation({
    mutationFn: (count: number) => enqueueMassBatch({ data: { stateCode, count } }),
    onSuccess: (r) => {
      push(
        tr("admin.ai4.prod.massBatchLog", { state: r.stateCode, queued: String(r.queued), skipped: String(r.duplicatesSkipped) }),
      );
      toast.success(tr("admin.ai4.prod.massBatchToast", { queued: String(r.queued), state: r.stateCode }));
      setAuto(true);
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: () => productionTick({ data: { jobs: workers, stagesPerJob: 12 } }),
    onSuccess: (r) => {
      for (const s of r.results) push(tr("admin.ai4.prod.stageLog", { city: s.city, stage: String(s.stage), summary: s.summary }), s.ok);
      refreshAll();
    },
    onError: (e: Error) => {
      push(e.message, false);
      setAuto(false);
    },
  });

  const retryAll = useMutation({
    mutationFn: () => controlProduction({ data: { action: "retry_all_failed" } }),
    onSuccess: () => {
      push(tr("admin.ai4.prod.retryAllLog"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Autopilot — one production tick at a time, no overlap.
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        if (!running.current) {
          running.current = true;
          try {
            await tick.mutateAsync();
          } catch {
            break;
          } finally {
            running.current = false;
          }
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const s = stats.data;
  const p = pilot.data;
  const jobs = s?.jobs ?? [];

  return (
    <AiShell>
      <PageHeader
        title={tr("admin.ai4.prod.title")}
        subtitle={tr("admin.ai4.prod.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr("admin.ai4.prod.statQueued")} value={String(s?.queued ?? "—")} />
        <StatCard label={tr("admin.ai4.prod.statCurrentCity")} value={s?.currentCity ?? tr("admin.ai4.prod.idle")} />
        <StatCard label={tr("admin.ai4.prod.statCompletedToday")} value={String(s?.completedToday ?? "—")} />
        <StatCard label={tr("admin.ai4.prod.statFailed")} value={String(s?.failed ?? "—")} />
        <StatCard label={tr("admin.ai4.prod.statAvgTime")} value={ms(s?.avgProductionMs ?? 0)} />
        <StatCard label={tr("admin.ai4.prod.statSpeed")} value={s?.perHour ? `${s.perHour}/hr` : "—"} />
        <StatCard
          label={tr("admin.ai4.prod.statEta")}
          value={s?.etaHours == null ? "—" : s.etaHours < 1 ? `${Math.round(s.etaHours * 60)} min` : `${s.etaHours.toFixed(1)} h`}
        />
        <StatCard label={tr("admin.ai4.prod.statAgentWorking")} value={s?.currentStage?.name ?? "—"} />
        <StatCard label={tr("admin.ai4.prod.statPublishedToday")} value={String(s?.publishedToday ?? "—")} />
        <StatCard label={tr("admin.ai4.prod.statPublishedTotal")} value={String(s?.publishedTotal ?? "—")} />
        <StatCard label={tr("admin.ai4.prod.statAvgSeo")} value={s?.avgQuality ? `${s.avgQuality}/100` : "—"} />
        <StatCard label={tr("admin.ai4.prod.statRetries")} value={String(s?.retries ?? "—")} />
      </div>

      <SectionShell title={tr("admin.ai4.prod.sectionWorker")}>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => toggleWorker.mutate(!(w?.settings.enabled ?? false))}
            disabled={toggleWorker.isPending}
            className="gap-2"
          >
            {w?.settings.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {w?.settings.enabled ? tr("admin.ai4.prod.pauseWorker") : tr("admin.ai4.prod.startWorker")}
          </Button>
          <Button variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending} className="gap-2">
            {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
            {tr("admin.ai4.prod.runOneTick")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {w
              ? tr("admin.ai4.prod.workerStatusLine", {
                  state: w.settings.enabled ? tr("admin.ai4.prod.workerRunning") : tr("admin.ai4.prod.workerPaused"),
                  time: w.lastRunAt ? new Date(w.lastRunAt).toLocaleTimeString() : "—",
                  perHour: String(w.publishedLastHour),
                  remaining: w.remaining.toLocaleString(),
                  total: w.totalCities.toLocaleString(),
                })
              : tr("admin.ai4.prod.workerLoading")}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{tr("admin.ai4.prod.workerNote")}</p>
        <div className="mt-4 space-y-1">
          {((w?.runs ?? []) as WorkerRun[]).map((r) => (
            <div key={r.id} className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="tabular-nums">{new Date(r.created_at).toLocaleTimeString()}</span>
              <span>{r.trigger}</span>
              <span>{r.jobs_processed} jobs</span>
              <span>{r.published} published</span>
              <span>{r.failed} failed</span>
              <span>+{r.refilled} queued</span>
              {r.error ? <span className="text-destructive">{r.error}</span> : null}
            </div>
          ))}
          {!w?.runs?.length ? <span className="text-xs text-muted-foreground">{tr("admin.ai4.prod.noServerRuns")}</span> : null}
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionMass")}>

        <div className="flex flex-wrap items-center gap-2">
          {ROLLOUT_STATES.map((st) => (
            <Button
              key={st.code}
              size="sm"
              variant={stateCode === st.code ? "default" : "outline"}
              onClick={() => setStateCode(st.code)}
            >
              {st.name}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {BATCH_SIZES.map((n) => (
            <Button
              key={n}
              size="sm"
              variant="outline"
              disabled={massBatch.isPending}
              onClick={() => massBatch.mutate(n)}
              className="gap-2"
            >
              {massBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {tr("admin.ai4.prod.produceNCities", { n: n.toLocaleString(), state: stateCode })}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase text-muted-foreground">{tr("admin.ai4.prod.parallelWorkers")}</span>
          {WORKER_OPTIONS.map((w) => (
            <Button key={w} size="sm" variant={workers === w ? "default" : "outline"} onClick={() => setWorkers(w)}>
              {w}
            </Button>
          ))}
          <span className="text-sm text-muted-foreground">
            {tr("admin.ai4.prod.autopilotStatusLine", { state: auto ? tr("admin.ai4.prod.autopilotRunning") : tr("admin.ai4.prod.autopilotStopped") })}
          </span>
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionPilot")}>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => startPilot.mutate()} disabled={startPilot.isPending} className="gap-2">
            {startPilot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {tr("admin.ai4.prod.launchPilot")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {p
              ? tr("admin.ai4.prod.pilotSummary", {
                  completed: String(p.completed),
                  total: String(PILOT_CITIES.length),
                  remaining: String(p.remaining),
                  failed: String(p.failed),
                  published: String(p.published),
                  indexed: String(p.indexed),
                  quality: String(p.avgQuality ?? "—"),
                })
              : tr("admin.ai4.prod.pilotLoading")}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {(p?.cities ?? []).map((c) => (
            <div key={c.landingSlug} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-muted-foreground">#{c.order}</span>
                <span className="font-medium">
                  {c.city}, {c.stateCode}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tr("admin.ai4.prod.stageOf", { stage: String(c.stage), total: String(TOTAL_STAGES) })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : c.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : c.status === "running"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.status.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tr("admin.ai4.prod.qualityLine", { quality: String(c.qualityScore ?? "—"), publishStatus: c.publishStatus, indexStatus: c.indexStatus })}
                </span>
                {c.attempts > 1 && (
                  <span className="text-xs text-muted-foreground">{tr("admin.ai4.prod.retries", { n: String(c.attempts - 1) })}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {c.gate.map((g) => (
                  <span
                    key={g.label}
                    className={`inline-flex items-center gap-1 text-xs ${g.ok ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    {g.ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    {g.label}
                  </span>
                ))}
              </div>
              {c.lastError && <p className="mt-2 text-xs text-destructive">{c.lastError}</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{tr("admin.ai4.prod.phase9Title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {p?.readyForPhase9
              ? tr("admin.ai4.prod.phase9Ready")
              : tr("admin.ai4.prod.phase9Locked", { total: String(PILOT_CITIES.length) })}
          </p>
          <Button
            className="mt-3 gap-2"
            variant={p?.readyForPhase9 ? "default" : "outline"}
            disabled={!p?.readyForPhase9 || phase9.isPending}
            onClick={() => phase9.mutate()}
          >
            {phase9.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {tr("admin.ai4.prod.preparePhase9")}
          </Button>
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionFactory")}>
        <div className="flex flex-wrap gap-2">
          {BATCHES.map((n) => (
            <Button
              key={n}
              size="sm"
              variant="outline"
              disabled={enqueue.isPending}
              onClick={() => enqueue.mutate(n)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> {tr("admin.ai4.prod.queueN", { n: n.toLocaleString() })}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setAuto((v) => !v)} className="gap-2">
            {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {auto ? tr("admin.ai4.prod.stopAutopilot") : tr("admin.ai4.prod.startAutopilot")}
          </Button>
          <Button variant="outline" onClick={() => tick.mutate()} disabled={tick.isPending || auto} className="gap-2">
            {tick.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
            {tr("admin.ai4.prod.produceNextCity")}
          </Button>
          <Button variant="outline" onClick={() => retryAll.mutate()} className="gap-2">
            <RotateCcw className="h-4 w-4" /> {tr("admin.ai4.prod.retryFailed")}
          </Button>
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionLine")}>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTION_STAGES.map((st) => {
            const active = s?.currentStage?.step === st.step;
            return (
              <li
                key={st.key}
                className={`rounded-xl border px-3 py-2 text-sm ${active ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="font-medium">
                  {st.step}. {st.name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{st.description}</p>
              </li>
            );
          })}
        </ol>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionQueueTable")}>
        {jobs.length === 0 ? (
          <EmptyState title={tr("admin.ai4.prod.queueEmptyTitle")} hint={tr("admin.ai4.prod.queueEmptyHint")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">{tr("admin.ai4.prod.colCity")}</th>
                  <th>{tr("admin.ai4.prod.colTier")}</th>
                  <th>{tr("admin.ai4.prod.colStage")}</th>
                  <th>{tr("admin.ai4.prod.colStatus")}</th>
                  <th>{tr("admin.ai4.prod.colTime")}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-border">
                    <td className="py-2 font-medium">
                      {j.city}, {j.state_code}
                    </td>
                    <td className="text-muted-foreground">{j.tier}</td>
                    <td className="text-muted-foreground">
                      {j.stage}/{TOTAL_STAGES}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          j.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : j.status === "failed"
                              ? "bg-destructive/10 text-destructive"
                              : j.status === "running"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {j.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : null}
                        {j.status === "failed" ? <XCircle className="h-3 w-3" /> : null}
                        {tr(`admin.ai4.prod.status${j.status.charAt(0).toUpperCase()}${j.status.slice(1)}`)}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{ms(j.duration_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell title={tr("admin.ai4.prod.sectionLog")}>
        {log.length === 0 ? (
          <EmptyState title={tr("admin.ai4.prod.noRunsTitle")} hint={tr("admin.ai4.prod.noRunsHint")} />
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((l, i) => (
              <li
                key={i}
                className={`flex gap-3 rounded-xl border px-3 py-2 ${l.ok ? "border-border" : "border-destructive/40 bg-destructive/5"}`}
              >
                <span className="shrink-0 text-xs text-muted-foreground">{l.t}</span>
                <span>{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </AiShell>
  );
}
