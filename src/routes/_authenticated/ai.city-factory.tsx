import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Send, Radar, Sparkles, Loader2 } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  auditFactoryBatch,
  submitForIndexing,
  runFactoryMonitor,
  runSelfImprovement,
  cityFactoryStats,
} from "@/lib/city-factory.functions";

export const Route = createFileRoute("/_authenticated/ai/city-factory")({
  head: () => ({
    meta: [
      { title: "Autonomous City Factory — Audit, Index, Monitor | Easy Moving" },
      {
        name: "description",
        content:
          "Run the SEO quality audit, submit new city URLs for indexing, monitor rankings and auto-improve underperforming city pages.",
      },
    ],
  }),
  component: CityFactoryPage,
});

type Line = { t: string; msg: string };

function CityFactoryPage() {
  const qc = useQueryClient();
  const [log, setLog] = useState<Line[]>([]);
  const push = (msg: string) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg }, ...l].slice(0, 40));

  const stats = useQuery({
    queryKey: ["city-factory-stats"],
    queryFn: () => cityFactoryStats({ data: {} as never }),
    refetchInterval: 20000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["city-factory-stats"] });

  const audit = useMutation({
    mutationFn: () => auditFactoryBatch({ data: { limit: 25 } }),
    onSuccess: (r) => {
      push(`Audit — ${r.audited} pages, ${r.passed} passed, ${r.returned} returned (threshold ${r.threshold}).`);
      toast.success(`Audited ${r.audited} pages`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const index = useMutation({
    mutationFn: () => submitForIndexing({ data: { limit: 100 } }),
    onSuccess: (r) => {
      push(`Indexing — ${r.submittedPages} pages, ${r.urls} URLs submitted${r.indexingEnabled ? `, ${r.pinged} engines pinged` : " (indexing disabled, queued)"}.`);
      toast.success("Indexing submission complete");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monitor = useMutation({
    mutationFn: () => runFactoryMonitor({ data: { limit: 200 } }),
    onSuccess: (r) => {
      push(`Monitor — ${r.monitored} pages: ${r.healthy} healthy, ${r.watch} watch, ${r.degraded} degraded, ${r.notIndexed} not indexed.`);
      toast.success("Monitoring pass complete");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const improve = useMutation({
    mutationFn: () => runSelfImprovement({ data: { limit: 20 } }),
    onSuccess: (r) => {
      push(`Self-improvement — ${r.improved}/${r.candidates} pages regenerated and republished.`);
      toast.success(`Improved ${r.improved} pages`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = stats.data;
  const busy = audit.isPending || index.isPending || monitor.isPending || improve.isPending;

  return (
    <AiShell>
      <PageHeader
        title="Autonomous City Factory"
        subtitle="Steps 9–13: SEO quality audit, publish gate, indexing, monitoring and self-improvement."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calculators published" value={String(s?.calculatorsPublished ?? "—")} />
        <StatCard label="SEO pages published" value={String(s?.seoPublished ?? "—")} />
        <StatCard label="Avg audit score" value={String(s?.avgAuditScore ?? "—")} />
        <StatCard label="Awaiting audit" value={String(s?.awaitingAudit ?? "—")} />
        <StatCard label="Passing ≥ 95" value={String(s?.passingAudit ?? "—")} />
        <StatCard label="Returned for correction" value={String(s?.returnedForCorrection ?? "—")} />
        <StatCard label="Submitted to engines" value={String(s?.submitted ?? "—")} />
        <StatCard label="Auto-improvements" value={String(s?.improvements ?? "—")} />
      </div>

      <SectionShell title="Agents">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => audit.mutate()} disabled={busy} className="justify-start gap-2">
            {audit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Run SEO audit
          </Button>
          <Button onClick={() => index.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {index.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for indexing
          </Button>
          <Button onClick={() => monitor.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {monitor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            Run monitoring
          </Button>
          <Button onClick={() => improve.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {improve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Self-improve pages
          </Button>
        </div>
        {s && !s.indexingEnabled && (
          <p className="mt-3 text-xs text-muted-foreground">
            Site-wide indexing is currently off. URLs are queued and will be submitted once indexing is enabled.
          </p>
        )}
      </SectionShell>

      <SectionShell title="Health">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Healthy" value={String(s?.healthy ?? "—")} />
          <StatCard label="Watch" value={String(s?.watch ?? "—")} />
          <StatCard label="Degraded" value={String(s?.degraded ?? "—")} />
        </div>
      </SectionShell>

      <SectionShell title="Agent log">
        {log.length === 0 ? (
          <EmptyState title="No runs yet" hint="Start with the SEO audit — pages scoring under 95 are returned for correction." />
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border px-3 py-2">
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
