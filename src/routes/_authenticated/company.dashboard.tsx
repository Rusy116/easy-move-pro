import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CompanyHeader, NoCompanyScreen, StatusBanner, useMoverPortal } from "@/components/company/portal-shared";
import { StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { useCompanyJobs, type JobStatus } from "@/lib/company-jobs";
import { Inbox, Lock, Globe, CheckCircle2, XCircle, Clock, Send, TrendingUp, Truck } from "lucide-react";


export const Route = createFileRoute("/_authenticated/company/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Company Portal" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { loading, company, merged, reload } = useMoverPortal();
  const { available, myJobs } = useCompanyJobs(company?.id ?? null);

  const jobStats = useMemo(() => {
    const closed: JobStatus[] = ["completed", "cancelled", "rejected", "expired"];
    return {
      available: available.length,
      active: myJobs.filter((j) => !closed.includes(j.job_status as JobStatus)).length,
      awaitingResponse: myJobs.filter((j) => j.job_status === "claimed").length,
      booked: myJobs.filter((j) => j.job_status === "booked").length,
    };
  }, [available, myJobs]);


  const stats = useMemo(() => {
    const total = merged.length;
    const exclusive = merged.filter((r) => r.bucket === "exclusive").length;
    const openMarket = merged.filter((r) => r.bucket === "open_market").length;
    const active = merged.filter((r) => r.bucket === "active").length;
    const won = merged.filter((r) => r.bucket === "won").length;
    const lost = merged.filter((r) => r.bucket === "lost").length;
    const scheduled = merged.filter((r) => r.assignment && ["quoted", "accepted"].includes(r.assignment.state)).length;

    const decided = won + lost;
    const acceptance = decided > 0 ? Math.round((won / decided) * 100) : 0;

    // Avg response time = viewed_at - invited_at for assignments that have both
    const responded = merged
      .map((r) => r.assignment)
      .filter((a) => a?.viewed_at && a?.invited_at)
      .map((a) => new Date(a!.viewed_at!).getTime() - new Date(a!.invited_at).getTime());
    const avgMs = responded.length > 0 ? responded.reduce((s, v) => s + v, 0) / responded.length : 0;
    const avgHours = avgMs / (1000 * 60 * 60);
    const avgResponse = avgHours >= 1
      ? `${avgHours.toFixed(1)}h`
      : avgMs > 0 ? `${Math.round(avgMs / (1000 * 60))}m` : "—";

    // Revenue = sum of quoted_amount on won assignments
    const revenue = merged
      .filter((r) => r.assignment && ["won", "accepted"].includes(r.assignment.state))
      .reduce((s, r) => s + Number(r.assignment?.quoted_amount ?? 0), 0);

    return { total, exclusive, openMarket, active, won, lost, scheduled, acceptance, avgResponse, revenue };
  }, [merged]);

  if (loading && !company) return <SkeletonRows n={5} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total leads"     value={stats.total}      icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Exclusive"       value={stats.exclusive}  icon={<Lock className="h-4 w-4" />} />
        <StatCard label="Open marketplace" value={stats.openMarket} icon={<Globe className="h-4 w-4" />} />
        <StatCard label="Active"          value={stats.active}     icon={<Send className="h-4 w-4" />} />
        <StatCard label="Scheduled jobs"  value={stats.scheduled}  icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Completed"       value={stats.won}        icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Lost"            value={stats.lost}       icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Revenue"         value={`$${stats.revenue.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Acceptance rate" value={`${stats.acceptance}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Avg response"    value={stats.avgResponse} icon={<Clock className="h-4 w-4" />} />
      </div>
    </div>
  );
}
