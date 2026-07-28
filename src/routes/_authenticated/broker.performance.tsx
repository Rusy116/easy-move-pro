import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { BrokerShell } from "@/components/broker/BrokerShell";
import { PageHeader, StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/broker/performance")({
  head: () => ({ meta: [{ title: "Broker performance — Easy Move Pro" }] }),
  component: BrokerPerformancePage,
});

type Row = { status: string; created_at: string; estimated_low: number; estimated_high: number };

function BrokerPerformancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("status, created_at, estimated_low, estimated_high")
        .order("created_at", { ascending: false })
        .limit(1000);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const last30 = rows.filter(
      (r) => now - new Date(r.created_at).getTime() < 30 * 24 * 3600 * 1000,
    );
    const won = rows.filter((r) => r.status === "won");
    const pipeline = rows
      .filter((r) => !["won", "lost", "cancelled"].includes(r.status))
      .reduce((s, r) => s + (Number(r.estimated_low) + Number(r.estimated_high)) / 2, 0);
    const conversion = rows.length ? Math.round((won.length / rows.length) * 100) : 0;
    return {
      last30: last30.length,
      won: won.length,
      conversion,
      pipeline: Math.round(pipeline),
    };
  }, [rows]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = new Date(r.created_at).toISOString().slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [rows]);

  return (
    <BrokerShell>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
        <PageHeader
          eyebrow="Broker workspace"
          title="Performance"
          subtitle="How your lead pipeline is converting."
          icon={<BarChart3 className="h-5 w-5" />}
        />

        {loading ? (
          <div className="mt-8">
            <SkeletonRows n={3} />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Leads (30 days)" value={stats.last30} tone="info" />
              <StatCard label="Won" value={stats.won} tone="success" />
              <StatCard label="Conversion" value={`${stats.conversion}%`} />
              <StatCard label="Open pipeline" value={`$${stats.pipeline.toLocaleString()}`} />
            </div>

            <div className="mt-10 card-premium p-6">
              <h2 className="font-serif text-xl font-medium">Leads by month</h2>
              <ul className="mt-4 space-y-3">
                {byMonth.length === 0 && (
                  <li className="text-sm text-muted-foreground">No leads yet.</li>
                )}
                {byMonth.map(([month, count]) => {
                  const max = Math.max(...byMonth.map(([, c]) => c), 1);
                  return (
                    <li key={month} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm text-muted-foreground">{month}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/5">
                        <div
                          className="h-full rounded-full bg-sage"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </section>
    </BrokerShell>
  );
}
