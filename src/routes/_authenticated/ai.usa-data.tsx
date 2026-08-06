import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2 } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { StatusPill, EmptyState, fmtDate } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  importUsaCities,
  processUsaQueue,
  controlUsaRun,
  requeueFailedUsaCities,
  usaEngineStats,
} from "@/lib/usa-cities.functions";
import { catalogSize } from "@/lib/usa-cities/dataset";
import { landingPathForSlug, moversPathForSlug } from "@/lib/city-landing/data";

export const Route = createFileRoute("/_authenticated/ai/usa-data")({
  head: () => ({
    meta: [
      { title: "USA Data Engine — Master City Database | Easy Moving" },
      {
        name: "description",
        content:
          "Import, validate and queue every USA city into the production pipeline that publishes calculators and SEO pages.",
      },
    ],
  }),
  component: UsaDataEngine,
});

type CityRow = {
  id: string;
  city_name: string;
  state_code: string;
  county: string | null;
  population: number;
  timezone: string | null;
  demand_score: number;
  seo_priority: number;
  pipeline_status: string;
  calculator_status: string;
  seo_page_status: string;
  calculator_slug: string | null;
  seo_slug: string | null;
  attempts: number;
  last_error: string | null;
  last_published_at: string | null;
  updated_at: string;
};

type RunRow = {
  id: string;
  scope: string;
  state_code: string | null;
  requested: number;
  cursor: number;
  imported: number;
  skipped: number;
  processed: number;
  completed: number;
  failed: number;
  status: string;
  avg_ms: number;
  last_error: string | null;
  created_at: string;
};

const BATCHES = [10, 100, 1000, 10000] as const;

function fmtDuration(ms: number) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function UsaDataEngine() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState(false);
  const loopRef = useRef(false);
  const total = useMemo(() => catalogSize(), []);

  const stats = useQuery({
    queryKey: ["usa-engine", "stats"],
    queryFn: () => usaEngineStats(),
    refetchInterval: 8000,
  });

  const cities = useQuery({
    queryKey: ["usa-engine", "cities"],
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await supabase
        .from("usa_cities")
        .select(
          "id, city_name, state_code, county, population, timezone, demand_score, seo_priority, pipeline_status, calculator_status, seo_page_status, calculator_slug, seo_slug, attempts, last_error, last_published_at, updated_at",
        )
        .order("seo_priority", { ascending: true })
        .order("population", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as unknown as CityRow[];
    },
    refetchInterval: 8000,
  });

  const runs = useQuery({
    queryKey: ["usa-engine", "runs"],
    queryFn: async (): Promise<RunRow[]> => {
      const { data, error } = await supabase
        .from("usa_import_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as RunRow[];
    },
    refetchInterval: 8000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["usa-engine"] });

  async function runImport(limit: number) {
    setBusy(`import-${limit}`);
    try {
      let id: string | null = null;
      let guard = 0;
      // Chunked + resumable: keep calling with the same runId until finished.
      while (guard < 120) {
        const res: { runId: string; imported: number; skipped: number; requested: number } =
          await importUsaCities({ data: { limit, runId: id ?? undefined } });
        id = res.runId;
        setRunId(res.runId);
        const run = runs.data?.find((r) => r.id === res.runId);
        if (res.imported + res.skipped >= Math.min(limit, total) || run?.status === "imported") break;
        guard += 1;
        const { data: check } = await supabase
          .from("usa_import_runs")
          .select("status, cursor, requested")
          .eq("id", res.runId)
          .maybeSingle();
        const c = check as unknown as { status: string; cursor: number; requested: number } | null;
        if (!c || c.status !== "running" || c.cursor >= c.requested) break;
      }
      toast.success("Import finished — cities queued for production");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function processOnce(retryFailed = false) {
    setBusy("process");
    try {
      const res = await processUsaQueue({
        data: { batchSize: 3, runId: runId ?? undefined, retryFailed },
      });
      toast.success(
        res.done
          ? "Queue is empty"
          : `Processed ${res.processed} · completed ${res.completed} · failed ${res.failed}`,
      );
      refresh();
      return res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Processing failed");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function toggleAutopilot() {
    if (autopilot) {
      loopRef.current = false;
      setAutopilot(false);
      return;
    }
    setAutopilot(true);
    loopRef.current = true;
    while (loopRef.current) {
      const res = await processOnce();
      if (!res || res.done) break;
      await new Promise((r) => setTimeout(r, 1200));
    }
    loopRef.current = false;
    setAutopilot(false);
    refresh();
  }

  const s = stats.data;
  const activeRun = runs.data?.[0];

  return (
    <AiShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Phase 5"
          icon={<Database className="h-6 w-6" />}
          title="USA Data Engine"
          subtitle="Master city database — the permanent source for every production pipeline."
          actions={
            <>
              <Button variant="outline" onClick={() => processOnce(true)} disabled={busy !== null}>
                Retry failed
              </Button>
              <Button
                onClick={toggleAutopilot}
                variant={autopilot ? "destructive" : "default"}
                disabled={busy === "process" && !autopilot}
              >
                {autopilot ? "Stop batch" : "Start production"}
              </Button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total USA cities" value={total.toLocaleString()} hint="Catalog available" />
          <StatCard label="Imported" value={(s?.imported ?? 0).toLocaleString()} tone="info" />
          <StatCard label="Queued" value={(s?.queued ?? 0).toLocaleString()} tone="warning" />
          <StatCard label="Processing" value={(s?.processing ?? 0).toLocaleString()} />
          <StatCard label="Completed" value={(s?.completed ?? 0).toLocaleString()} tone="success" />
          <StatCard label="Failed" value={(s?.failed ?? 0).toLocaleString()} tone="danger" />
          <StatCard label="Skipped" value={(s?.skipped ?? 0).toLocaleString()} hint="Duplicates" />
          <StatCard
            label="Average speed"
            value={s?.avgMs ? `${(s.avgMs / 1000).toFixed(1)}s` : "—"}
            hint={`ETA ${fmtDuration(s?.etaMs ?? 0)}`}
          />
        </div>

        <SectionShell
          title="Import engine"
          right={
            <span className="text-xs text-muted-foreground">
              Duplicates are skipped automatically · imports resume where they stopped
            </span>
          }
        >
          <div className="flex flex-wrap gap-2">
            {BATCHES.map((n) => (
              <Button
                key={n}
                variant="outline"
                disabled={busy !== null}
                onClick={() => runImport(n)}
              >
                {busy === `import-${n}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {n.toLocaleString()}
              </Button>
            ))}
            <Button disabled={busy !== null} onClick={() => runImport(total)}>
              {busy === `import-${total}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import entire USA
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Pipeline per city: import → validate data → generate calculator → validate → publish →
            generate SEO page → embed calculator → schema → FAQ → internal links → sitemap → completed.
          </p>
        </SectionShell>

        <SectionShell
          title="Batch control"
          right={
            activeRun ? <StatusPill status={activeRun.status} /> : null
          }
        >
          {!activeRun ? (
            <EmptyState title="No import runs yet" hint="Start with a 10-city import." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div>Requested: <b className="tabular-nums">{activeRun.requested}</b></div>
                <div>Imported: <b className="tabular-nums">{activeRun.imported}</b></div>
                <div>Skipped: <b className="tabular-nums">{activeRun.skipped}</b></div>
                <div>Processed: <b className="tabular-nums">{activeRun.processed}</b></div>
                <div>Completed: <b className="tabular-nums">{activeRun.completed}</b></div>
                <div>Failed: <b className="tabular-nums">{activeRun.failed}</b></div>
              </div>
              {activeRun.last_error && (
                <p className="text-xs text-rose-600">{activeRun.last_error}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy !== null}
                  onClick={async () => {
                    await controlUsaRun({ data: { runId: activeRun.id, action: "pause" } });
                    loopRef.current = false;
                    setAutopilot(false);
                    refresh();
                  }}>
                  Pause
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null}
                  onClick={async () => {
                    await controlUsaRun({ data: { runId: activeRun.id, action: "resume" } });
                    setRunId(activeRun.id);
                    refresh();
                  }}>
                  Resume
                </Button>
                <Button size="sm" variant="outline" disabled={busy !== null}
                  onClick={async () => {
                    const res = await requeueFailedUsaCities({ data: { limit: 500 } });
                    toast.success(`${res.requeued} cities requeued`);
                    refresh();
                  }}>
                  Requeue failed
                </Button>
                <Button size="sm" variant="destructive" disabled={busy !== null}
                  onClick={async () => {
                    await controlUsaRun({ data: { runId: activeRun.id, action: "cancel" } });
                    loopRef.current = false;
                    setAutopilot(false);
                    setRunId(null);
                    refresh();
                  }}>
                  Cancel batch
                </Button>
              </div>
            </div>
          )}
        </SectionShell>

        <SectionShell title="Master city database" right={
          <span className="text-xs text-muted-foreground">{cities.data?.length ?? 0} shown</span>
        }>
          {!cities.data?.length ? (
            <EmptyState title="No cities imported yet" hint="Run an import to populate the master database." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">City</th>
                    <th>County</th>
                    <th className="text-right">Population</th>
                    <th className="text-right">Demand</th>
                    <th className="text-right">Priority</th>
                    <th>Status</th>
                    <th>Calculator</th>
                    <th>SEO page</th>
                    <th>Last published</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.data.map((c) => (
                    <tr key={c.id} className="border-t border-border/60">
                      <td className="py-2 font-medium">
                        {c.city_name}, {c.state_code}
                        {c.last_error && (
                          <div className="text-xs text-rose-600">{c.last_error}</div>
                        )}
                      </td>
                      <td className="text-muted-foreground">{c.county ?? "—"}</td>
                      <td className="text-right tabular-nums">{c.population.toLocaleString()}</td>
                      <td className="text-right tabular-nums">{c.demand_score}</td>
                      <td className="text-right tabular-nums">P{c.seo_priority}</td>
                      <td><StatusPill status={c.pipeline_status} /></td>
                      <td>
                        {c.calculator_status === "published" && c.calculator_slug ? (
                          <a className="text-sky-700 underline" href={landingPathForSlug(c.calculator_slug)} target="_blank" rel="noreferrer">
                            live
                          </a>
                        ) : (
                          <StatusPill status={c.calculator_status} />
                        )}
                      </td>
                      <td>
                        {c.seo_page_status === "published" && c.seo_slug ? (
                          <a className="text-sky-700 underline" href={moversPathForSlug(c.seo_slug)} target="_blank" rel="noreferrer">
                            live
                          </a>
                        ) : (
                          <StatusPill status={c.seo_page_status} />
                        )}
                      </td>
                      <td className="text-muted-foreground">{fmtDate(c.last_published_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>
      </div>
    </AiShell>
  );
}
