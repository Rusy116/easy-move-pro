import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PeriodFilter,
  PERIOD_LABEL,
  inPeriod,
  type DashboardPeriod,
} from "@/components/shell/PeriodFilter";
import {
  CompanyHeader,
  NoCompanyScreen,
  StatusBanner,
  useMoverPortal,
} from "@/components/company/portal-shared";
import { StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { useCompanyJobs, type JobStatus } from "@/lib/company-jobs";
import { CompanyWarningsBanner } from "@/components/marketplace/JobOwnership";
import {
  Inbox,
  Lock,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  TrendingUp,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Company Portal" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { loading, company, merged, reload } = useMoverPortal();
  const { available, myJobs } = useCompanyJobs(company?.id ?? null);
  const [period, setPeriod] = useState<DashboardPeriod>("all");

  // Jobs this company claimed inside the selected window.
  const scopedJobs = useMemo(
    () => myJobs.filter((j) => inPeriod(j.claimed_at ?? j.created_at, period)),
    [myJobs, period],
  );

  const jobStats = useMemo(() => {
    const closed: JobStatus[] = ["completed", "cancelled", "rejected", "expired"];
    const completed = scopedJobs.filter((j) => j.job_status === "completed");
    return {
      available: available.length,
      active: scopedJobs.filter((j) => !closed.includes(j.job_status as JobStatus)).length,
      awaitingResponse: scopedJobs.filter((j) => j.job_status === "claimed").length,
      booked: scopedJobs.filter((j) =>
        ["booked", "accepted", "scheduled"].includes(j.job_status ?? ""),
      ).length,
      completed: completed.length,
      completedRevenue: completed.reduce(
        (s, j) => s + Number(j.final_accepted_price ?? j.final_price ?? 0),
        0,
      ),
    };
  }, [available, scopedJobs]);

  const stats = useMemo(() => {
    const total = merged.length;
    const exclusive = merged.filter((r) => r.bucket === "exclusive").length;
    const openMarket = merged.filter((r) => r.bucket === "open_market").length;
    const active = merged.filter((r) => r.bucket === "active").length;
    const won = merged.filter((r) => r.bucket === "won").length;
    const lost = merged.filter((r) => r.bucket === "lost").length;
    const scheduled = merged.filter(
      (r) => r.assignment && ["quoted", "accepted"].includes(r.assignment.state),
    ).length;

    const decided = won + lost;
    const acceptance = decided > 0 ? Math.round((won / decided) * 100) : 0;

    // Avg response time = viewed_at - invited_at for assignments that have both
    const responded = merged
      .map((r) => r.assignment)
      .filter((a) => a?.viewed_at && a?.invited_at)
      .map((a) => new Date(a!.viewed_at!).getTime() - new Date(a!.invited_at).getTime());
    const avgMs =
      responded.length > 0 ? responded.reduce((s, v) => s + v, 0) / responded.length : 0;
    const avgHours = avgMs / (1000 * 60 * 60);
    const avgResponse =
      avgHours >= 1
        ? `${avgHours.toFixed(1)}h`
        : avgMs > 0
          ? `${Math.round(avgMs / (1000 * 60))}m`
          : "—";

    // Revenue = sum of quoted_amount on won assignments
    const revenue = merged
      .filter((r) => r.assignment && ["won", "accepted"].includes(r.assignment.state))
      .reduce((s, r) => s + Number(r.assignment?.quoted_amount ?? 0), 0);

    return {
      total,
      exclusive,
      openMarket,
      active,
      won,
      lost,
      scheduled,
      acceptance,
      avgResponse,
      revenue,
    };
  }, [merged]);

  if (loading && !company) return <SkeletonRows n={5} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />
      <CompanyWarningsBanner companyId={company.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-medium tracking-tight">
          Job activity · {PERIOD_LABEL[period]}
        </h2>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Available jobs"
          value={jobStats.available}
          hint="Live marketplace"
          icon={<Globe className="h-4 w-4" />}
        />
        <StatCard
          label="My active jobs"
          value={jobStats.active}
          icon={<Truck className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting contact"
          value={jobStats.awaitingResponse}
          tone="warning"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Booked"
          value={jobStats.booked}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Completed"
          value={jobStats.completed}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Completed revenue"
          value={
            jobStats.completedRevenue > 0 ? `$${jobStats.completedRevenue.toLocaleString()}` : "—"
          }
          hint="Final contracted price"
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="rounded-full">
          <Link to="/company/jobs">Browse available jobs</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/company/myjobs">My jobs</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total leads" value={stats.total} icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Exclusive" value={stats.exclusive} icon={<Lock className="h-4 w-4" />} />
        <StatCard
          label="Open marketplace"
          value={stats.openMarket}
          icon={<Globe className="h-4 w-4" />}
        />
        <StatCard label="Active" value={stats.active} icon={<Send className="h-4 w-4" />} />
        <StatCard
          label="Scheduled jobs"
          value={stats.scheduled}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard label="Completed" value={stats.won} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Lost" value={stats.lost} icon={<XCircle className="h-4 w-4" />} />
        <StatCard
          label="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Acceptance rate"
          value={`${stats.acceptance}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Avg response"
          value={stats.avgResponse}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
