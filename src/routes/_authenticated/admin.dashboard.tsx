import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Inbox,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Target,
  Bell,
  Trophy,
  XCircle,
  Ban,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: DashboardPage,
});

type QuoteLite = {
  id: string;
  created_at: string;
  status: string;
  accepted_at: string | null;
  estimated_low: number;
  estimated_high: number;
  origin_state: string | null;
  destination_state: string | null;
};

type Company = { id: string; name: string };
type Assignment = { quote_id: string; company_id: string };

const STATUS_KEYS = [
  "new",
  "contacted",
  "scheduled",
  "quoted",
  "accepted",
  "won",
  "lost",
  "cancelled",
] as const;

const STATUS_META: Record<
  (typeof STATUS_KEYS)[number],
  { label: string; tone: "default" | "info" | "success" | "warning" | "danger"; icon: React.ReactNode }
> = {
  new: { label: "New", tone: "info", icon: <Bell className="h-4 w-4" /> },
  contacted: { label: "Contacted", tone: "info", icon: <Inbox className="h-4 w-4" /> },
  scheduled: { label: "Scheduled", tone: "info", icon: <ClipboardList className="h-4 w-4" /> },
  quoted: { label: "Quoted", tone: "warning", icon: <ClipboardList className="h-4 w-4" /> },
  accepted: { label: "Accepted", tone: "success", icon: <CheckCircle2 className="h-4 w-4" /> },
  won: { label: "Won", tone: "success", icon: <Trophy className="h-4 w-4" /> },
  lost: { label: "Lost", tone: "danger", icon: <XCircle className="h-4 w-4" /> },
  cancelled: { label: "Cancelled", tone: "default", icon: <Ban className="h-4 w-4" /> },
};

function DashboardPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteLite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return setIsAdmin(false);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const [q, a, c] = await Promise.all([
        supabase
          .from("quotes")
          .select("id,created_at,status,accepted_at,estimated_low,estimated_high,origin_state,destination_state")
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase.from("quote_assignments").select("quote_id,company_id"),
        supabase.from("moving_companies").select("id,name"),
      ]);
      setQuotes((q.data ?? []) as QuoteLite[]);
      setAssignments((a.data ?? []) as Assignment[]);
      setCompanies((c.data ?? []) as Company[]);
      setLoading(false);
    })();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(STATUS_KEYS.map((s) => [s, 0]));
    let revLow = 0;
    let revHigh = 0;
    let estSum = 0;
    let estN = 0;
    for (const q of quotes) {
      if (q.status in counts) counts[q.status]++;
      if (q.accepted_at) counts.accepted++;
      const mid = (Number(q.estimated_low) + Number(q.estimated_high)) / 2;
      if (mid > 0) { estSum += mid; estN++; }
      if (q.status === "won") {
        revLow += Number(q.estimated_low || 0);
        revHigh += Number(q.estimated_high || 0);
      }
    }
    const total = quotes.length;
    const closed = counts.won + counts.lost + counts.cancelled;
    const conversion = closed > 0 ? (counts.won / closed) * 100 : 0;
    return {
      total,
      counts,
      revLow,
      revHigh,
      avgEstimate: estN > 0 ? estSum / estN : 0,
      conversion,
    };
  }, [quotes]);

  const quotesByDay = useMemo(() => {
    const days = 30;
    const buckets: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.date, i]));
    for (const q of quotes) {
      const key = q.created_at.slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) buckets[i].count++;
    }
    return buckets;
  }, [quotes]);

  const byState = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of quotes) {
      const s = (q.origin_state || "—").toUpperCase();
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [quotes]);

  const revenueByMonth = useMemo(() => {
    const months: { key: string; label: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        revenue: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const q of quotes) {
      if (q.status !== "won") continue;
      const key = q.created_at.slice(0, 7);
      const i = idx.get(key);
      if (i !== undefined) {
        months[i].revenue += (Number(q.estimated_low) + Number(q.estimated_high)) / 2;
      }
    }
    return months;
  }, [quotes]);

  const topCompanies = useMemo(() => {
    const nameById = new Map(companies.map((c) => [c.id, c.name]));
    const m = new Map<string, number>();
    for (const a of assignments) {
      m.set(a.company_id, (m.get(a.company_id) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([id, count]) => ({ name: nameById.get(id) ?? "Unknown", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [assignments, companies]);

  if (isAdmin === null) {
    return <AdminShell><div className="p-16 text-center text-muted-foreground">Loading…</div></AdminShell>;
  }
  if (!isAdmin) {
    return (
      <AdminShell>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">
            ← Back
          </Link>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/30 to-background">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
          <PageHeader
            eyebrow="Admin CRM"
            title="Dashboard"
            subtitle={`${stats.total.toLocaleString()} total quotes · last 30 days trend`}
            icon={<BarChart3 className="h-5 w-5" />}
          />

          {loading ? (
            <div className="mt-8"><SkeletonRows n={4} /></div>
          ) : (
            <>
              {/* KPI row */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label="Total quotes" value={stats.total.toLocaleString()} icon={<Inbox className="h-4 w-4" />} />
                <StatCard
                  label="Revenue (won)"
                  value={stats.counts.won === 0 ? "—" : `$${Math.round(stats.revLow / 1000)}k–$${Math.round(stats.revHigh / 1000)}k`}
                  tone="success"
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <StatCard
                  label="Avg estimate"
                  value={stats.avgEstimate > 0 ? `$${Math.round(stats.avgEstimate).toLocaleString()}` : "—"}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <StatCard
                  label="Conversion rate"
                  value={`${stats.conversion.toFixed(1)}%`}
                  hint="won / (won + lost + cancelled)"
                  tone="info"
                  icon={<Target className="h-4 w-4" />}
                />
              </div>

              {/* Status pipeline */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {STATUS_KEYS.map((k) => (
                  <StatCard
                    key={k}
                    label={STATUS_META[k].label}
                    value={(stats.counts[k] ?? 0).toLocaleString()}
                    tone={STATUS_META[k].tone}
                    icon={STATUS_META[k].icon}
                  />
                ))}
              </div>

              {/* Charts */}
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <ChartCard title="Quotes by day" subtitle="Last 30 days">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={quotesByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue by month" subtitle="Won quotes, last 12 months">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        width={44}
                        tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                      />
                      <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Quotes by origin state" subtitle="Top 10">
                  {byState.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={byState} layout="vertical" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="state" type="category" tick={{ fontSize: 11 }} width={40} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard title="Top moving companies" subtitle="By assigned leads">
                  {topCompanies.length === 0 ? (
                    <EmptyChart message="No assignments yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topCompanies} layout="vertical" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="font-serif text-lg font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
