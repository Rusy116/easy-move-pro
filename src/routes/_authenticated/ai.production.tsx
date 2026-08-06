import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Play, Pause, RotateCcw, Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
} from "@/lib/city-production.functions";
import { PRODUCTION_STAGES, TOTAL_STAGES } from "@/lib/city-production/stages";

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

const BATCHES = [10, 100, 1000, 10000, 100000];

function ms(v: number) {
  if (!v) return "—";
  return v > 60000 ? `${(v / 60000).toFixed(1)} min` : `${(v / 1000).toFixed(1)}s`;
}

function ProductionPage() {
  const qc = useQueryClient();
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<{ t: string; msg: string; ok: boolean }[]>([]);
  const running = useRef(false);

  const push = (msg: string, ok = true) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg, ok }, ...l].slice(0, 60));

  const stats = useQuery({
    queryKey: ["city-production-stats"],
    queryFn: () => productionStats({ data: {} as never }),
    refetchInterval: 6000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["city-production-stats"] });

  const enqueue = useMutation({
    mutationFn: (count: number) => enqueueProduction({ data: { count } }),
    onSuccess: (r) => {
      push(`Queued ${r.queued} cities by priority (metro → large → medium → small).`);
      toast.success(`${r.queued} cities queued`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: () => productionTick({ data: { jobs: 1, stagesPerJob: 12 } }),
    onSuccess: (r) => {
      for (const s of r.results) push(`${s.city} — stage ${s.stage}/12: ${s.summary}`, s.ok);
      refresh();
    },
    onError: (e: Error) => {
      push(e.message, false);
      setAuto(false);
    },
  });

  const retryAll = useMutation({
    mutationFn: () => controlProduction({ data: { action: "retry_all_failed" } }),
    onSuccess: () => {
      push("All failed cities requeued.");
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
  const jobs = s?.jobs ?? [];

  return (
    <AiShell>
      <PageHeader
        title="City Production Factory"
        subtitle="Phase 7 — every city passes all 12 agent stages before it can be published."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="In queue" value={String(s?.queued ?? "—")} />
        <StatCard label="Currently producing" value={s?.currentCity ?? "Idle"} />
        <StatCard label="Completed today" value={String(s?.completedToday ?? "—")} />
        <StatCard label="Failed" value={String(s?.failed ?? "—")} />
        <StatCard label="Avg production time" value={ms(s?.avgProductionMs ?? 0)} />
        <StatCard label="Publishing speed" value={s?.perHour ? `${s.perHour}/hr` : "—"} />
        <StatCard
          label="Estimated completion"
          value={s?.etaHours == null ? "—" : s.etaHours < 1 ? `${Math.round(s.etaHours * 60)} min` : `${s.etaHours.toFixed(1)} h`}
        />
        <StatCard label="Agent working" value={s?.currentStage?.name ?? "—"} />
      </div>

      <SectionShell title="Factory controls">
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
              <Plus className="h-4 w-4" /> Queue {n.toLocaleString()}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setAuto((v) => !v)} className="gap-2">
            {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {auto ? "Stop autopilot" : "Start autopilot"}
          </Button>
          <Button variant="outline" onClick={() => tick.mutate()} disabled={tick.isPending || auto} className="gap-2">
            {tick.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
            Produce next city
          </Button>
          <Button variant="outline" onClick={() => retryAll.mutate()} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Retry failed
          </Button>
        </div>
      </SectionShell>

      <SectionShell title="Production line">
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

      <SectionShell title="Queue">
        {jobs.length === 0 ? (
          <EmptyState title="Queue is empty" hint="Queue a batch of cities to start the production line." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">City</th>
                  <th>Tier</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Time</th>
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
                        {j.status}
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

      <SectionShell title="Factory log">
        {log.length === 0 ? (
          <EmptyState title="No production runs yet" hint="Start the autopilot — each city walks all 12 stages before publishing." />
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
