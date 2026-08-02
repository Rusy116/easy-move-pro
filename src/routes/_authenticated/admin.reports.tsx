import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Easy Moving admin" },
      {
        name: "description",
        content:
          "Platform reporting: lead volume, conversion, marketplace claim rate, revenue and commission by month.",
      },
    ],
  }),
  component: AdminReportsPage,
});

type Row = {
  created_at: string;
  lead_phase: string;
  status: string;
  job_status: string;
  source: string | null;
  service_type: string | null;
  final_accepted_price: number | null;
  final_price: number | null;
  estimated_high: number | null;
  claimed_at: string | null;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [commission, setCommission] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, c] = await Promise.all([
        supabase
          .from("quotes")
          .select(
            "created_at,lead_phase,status,job_status,source,service_type,final_accepted_price,final_price,estimated_high,claimed_at",
          )
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("company_commissions").select("amount,status"),
      ]);
      if (q.error) throw q.error;
      setRows((q.data ?? []) as unknown as Row[]);
      setCommission(
        ((c.data ?? []) as { amount: number }[]).reduce((s, r) => s + (r.amount ?? 0), 0),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const booked = rows.filter((r) => (r.final_accepted_price ?? r.final_price) != null);
    const revenue = booked.reduce(
      (s, r) => s + (r.final_accepted_price ?? r.final_price ?? 0),
      0,
    );
    const claimed = rows.filter((r) => r.claimed_at).length;
    const bySource = new Map<string, number>();
    const byMonth = new Map<string, { leads: number; revenue: number }>();
    for (const r of rows) {
      const src = r.source ?? "direct";
      bySource.set(src, (bySource.get(src) ?? 0) + 1);
      const m = r.created_at.slice(0, 7);
      const e = byMonth.get(m) ?? { leads: 0, revenue: 0 };
      e.leads += 1;
      e.revenue += r.final_accepted_price ?? r.final_price ?? 0;
      byMonth.set(m, e);
    }
    return {
      leads: rows.length,
      claimed,
      booked: booked.length,
      revenue,
      claimRate: rows.length ? Math.round((claimed / rows.length) * 100) : 0,
      convRate: rows.length ? Math.round((booked.length / rows.length) * 100) : 0,
      avgTicket: booked.length ? revenue / booked.length : 0,
      bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
      byMonth: [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12),
    };
  }, [rows]);

  return (
    <AdminShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <PageHeader
          eyebrow="Business intelligence"
          title="Reports"
          subtitle="Lead volume, marketplace performance, conversion and platform commission."
          icon={<BarChart3 className="h-5 w-5" />}
          actions={
            <Button variant="outline" size="sm" className="rounded-full" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
          }
        />

        {loading ? (
          <div className="mt-8">
            <SkeletonRows n={4} />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total leads", value: stats.leads },
                { label: "Claim rate", value: `${stats.claimRate}%` },
                { label: "Conversion", value: `${stats.convRate}%` },
                { label: "Avg booked ticket", value: money(stats.avgTicket) },
                { label: "Booked jobs", value: stats.booked },
                { label: "Booked revenue", value: money(stats.revenue) },
                { label: "Platform commission", value: money(commission) },
                { label: "Claimed leads", value: stats.claimed },
              ].map((s) => (
                <div key={s.label} className="card-premium p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-1 font-serif text-2xl">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="card-premium p-5">
                <h2 className="font-serif text-xl">Monthly performance</h2>
                <table className="mt-4 w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Month</th>
                      <th className="py-2 text-right">Leads</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byMonth.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No data yet.
                        </td>
                      </tr>
                    )}
                    {stats.byMonth.map(([m, v]) => (
                      <tr key={m} className="border-t border-border">
                        <td className="py-2">{m}</td>
                        <td className="py-2 text-right">{v.leads}</td>
                        <td className="py-2 text-right">{money(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-premium p-5">
                <h2 className="font-serif text-xl">Leads by source</h2>
                <ul className="mt-4 space-y-3">
                  {stats.bySource.length === 0 && (
                    <li className="text-sm text-muted-foreground">No data yet.</li>
                  )}
                  {stats.bySource.map(([src, n]) => (
                    <li key={src}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{src.replace(/_/g, " ")}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${stats.leads ? (n / stats.leads) * 100 : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  );
}
