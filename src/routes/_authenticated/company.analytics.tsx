import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  XCircle,
  Truck,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/company/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Company Portal" }] }),
  component: AnalyticsPage,
});

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function AnalyticsPage() {
  const { loading, company, merged, reload } = useMoverPortal();

  const kpis = useMemo(() => {
    const rows = merged.filter((r) => r.assignment);
    const total = rows.length;
    const won = rows.filter(
      (r) => r.assignment && ["accepted", "won"].includes(r.assignment.state),
    );
    const lost = rows.filter(
      (r) =>
        r.assignment && ["lost", "declined", "expired", "withdrawn"].includes(r.assignment.state),
    );
    const quoted = rows.filter(
      (r) => r.assignment && ["quoted", "accepted", "won"].includes(r.assignment.state),
    );
    const revenue = won.reduce(
      (s, r) => s + Number(r.assignment?.quoted_amount ?? r.lead.estimated_high),
      0,
    );
    const avgJob = won.length ? revenue / won.length : 0;
    const winRate = total ? (won.length / total) * 100 : 0;
    const closeRate = quoted.length ? (won.length / quoted.length) * 100 : 0;
    const estimateAcceptance = quoted.length
      ? (won.filter((r) => r.assignment && ["accepted", "won"].includes(r.assignment.state))
          .length /
          quoted.length) *
        100
      : 0;
    const conversion = total ? (quoted.length / total) * 100 : 0;
    const cancelled = rows.filter((r) => r.assignment?.state === "withdrawn").length;
    const cancellationRate = total ? (cancelled / total) * 100 : 0;

    // Response time (invited_at → contacted_at) avg minutes
    const responses = rows
      .filter((r) => r.assignment?.invited_at && r.assignment.contacted_at)
      .map(
        (r) =>
          (new Date(r.assignment!.contacted_at!).getTime() -
            new Date(r.assignment!.invited_at).getTime()) /
          60000,
      );
    const avgResponse = responses.length
      ? responses.reduce((a, b) => a + b, 0) / responses.length
      : 0;

    // Jobs windows
    const now = Date.now();
    const inLastDays = (days: number) =>
      won.filter((r) => {
        const t = r.lead.move_date
          ? new Date(r.lead.move_date).getTime()
          : new Date(r.lead.created_at).getTime();
        return t >= now - days * 86400000 && t <= now + days * 86400000;
      }).length;
    const jobsThisWeek = inLastDays(7);
    const jobsThisMonth = inLastDays(30);
    const activeCrews = won.filter(
      (r) => r.lead.move_date && new Date(r.lead.move_date) >= new Date(),
    ).length;

    return {
      total,
      won: won.length,
      lost: lost.length,
      revenue,
      avgJob,
      winRate,
      closeRate,
      estimateAcceptance,
      conversion,
      cancellationRate,
      avgResponse,
      jobsThisWeek,
      jobsThisMonth,
      activeCrews,
    };
  }, [merged]);

  const trends = useMemo(() => {
    const buckets: Array<{
      day: string;
      leads: number;
      jobs: number;
      revenue: number;
      estimates: number;
    }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ day: key.slice(5), leads: 0, jobs: 0, revenue: 0, estimates: 0 });
    }
    const map = new Map(buckets.map((b, i) => [buckets[i].day, i] as const));
    for (const r of merged) {
      if (!r.assignment) continue;
      const created = r.assignment.invited_at ?? r.lead.created_at;
      const dayKey = new Date(created).toISOString().slice(5, 10);
      const idx = map.get(dayKey);
      if (idx == null) continue;
      buckets[idx].leads += 1;
      if (["quoted", "accepted", "won"].includes(r.assignment.state)) buckets[idx].estimates += 1;
      if (["accepted", "won"].includes(r.assignment.state)) {
        buckets[idx].jobs += 1;
        buckets[idx].revenue += Number(r.assignment.quoted_amount ?? r.lead.estimated_high);
      }
    }
    return buckets;
  }, [merged]);

  const lostReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of merged) {
      const a = r.assignment;
      if (!a) continue;
      if (!["lost", "declined", "expired", "withdrawn"].includes(a.state)) continue;
      const k = a.decline_reason?.trim() || a.state;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [merged]);

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  const stats: Array<{ label: string; value: string; icon: React.ReactNode; hint?: string }> = [
    {
      label: "Revenue (won)",
      value: `$${Math.round(kpis.revenue).toLocaleString()}`,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: "Win rate",
      value: `${kpis.winRate.toFixed(1)}%`,
      icon: <Award className="h-4 w-4" />,
      hint: `${kpis.won} of ${kpis.total}`,
    },
    {
      label: "Lead conversion",
      value: `${kpis.conversion.toFixed(1)}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      hint: "Quoted / total",
    },
    {
      label: "Response time",
      value: `${Math.round(kpis.avgResponse)} min`,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Avg job value",
      value: `$${Math.round(kpis.avgJob).toLocaleString()}`,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: "Close rate",
      value: `${kpis.closeRate.toFixed(1)}%`,
      icon: <Target className="h-4 w-4" />,
      hint: "Won / quoted",
    },
    {
      label: "Active crews",
      value: kpis.activeCrews.toString(),
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: "Jobs this week",
      value: kpis.jobsThisWeek.toString(),
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Jobs this month",
      value: kpis.jobsThisMonth.toString(),
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Estimate acceptance",
      value: `${kpis.estimateAcceptance.toFixed(1)}%`,
      icon: <Award className="h-4 w-4" />,
    },
    {
      label: "Cancellation rate",
      value: `${kpis.cancellationRate.toFixed(1)}%`,
      icon: <XCircle className="h-4 w-4" />,
    },
    {
      label: "Total leads",
      value: kpis.total.toString(),
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card-premium p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{s.label}</span>
              <span className="text-primary">{s.icon}</span>
            </div>
            <div className="font-serif text-2xl mt-1">{s.value}</div>
            {s.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-premium p-4">
          <div className="text-sm font-semibold mb-3">Revenue (last 30 days)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium p-4">
          <div className="text-sm font-semibold mb-3">Leads · Estimates · Jobs</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="leads" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="estimates" fill="hsl(var(--primary))" />
                <Bar dataKey="jobs" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card-premium p-4">
        <div className="text-sm font-semibold mb-3">Top loss reasons</div>
        {lostReasons.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No lost leads yet.</div>
        ) : (
          <div className="space-y-2">
            {lostReasons.map((r) => {
              const max = lostReasons[0].count;
              return (
                <div key={r.reason}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize">{r.reason.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                  <div className="h-2 rounded bg-muted overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${(r.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
