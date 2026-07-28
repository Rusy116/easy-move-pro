import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Globe, Truck, Users, FileText, Calendar, MessageSquare,
  FolderOpen, Building2, Settings, ArrowRight, Clock, CheckCircle2,
} from "lucide-react";
import {
  CompanyHeader, NoCompanyScreen, StatusBanner, useMoverPortal,
} from "@/components/company/portal-shared";
import { StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { useCompanyJobs, type JobStatus } from "@/lib/company-jobs";

export const Route = createFileRoute("/_authenticated/company/")({
  head: () => ({
    meta: [
      { title: "Company Dashboard — Easy Moving Partner Portal" },
      { name: "description", content: "Your moving company workspace: available jobs, active jobs, customers, estimates, schedule and documents in one place." },
    ],
  }),
  component: CompanyHome,
});

const WORKSPACE = [
  { to: "/company/jobs", label: "Available Jobs", desc: "Claim new open-market jobs first.", icon: Globe },
  { to: "/company/myjobs", label: "My Jobs", desc: "Claimed jobs and 12-hour response timers.", icon: Truck },
  { to: "/company/customers", label: "Customers", desc: "Your customer records and contact history.", icon: Users },
  { to: "/company/estimates", label: "Estimates", desc: "Build and send final quotes.", icon: FileText },
  { to: "/company/schedule", label: "Schedule", desc: "Upcoming moves on a calendar.", icon: Calendar },
  { to: "/company/messages", label: "Messages", desc: "Conversations with customers and the broker.", icon: MessageSquare },
  { to: "/company/documents", label: "Documents", desc: "Insurance, licenses and compliance files.", icon: FolderOpen },
  { to: "/company/profile", label: "Profile", desc: "Company details, DOT/MC and service areas.", icon: Building2 },
  { to: "/company/settings", label: "Settings", desc: "Notifications, team and preferences.", icon: Settings },
] as const;

function CompanyHome() {
  const { loading, company, merged, reload } = useMoverPortal();
  const { available, myJobs } = useCompanyJobs(company?.id ?? null);

  const stats = useMemo(() => {
    const closed: JobStatus[] = ["completed", "cancelled", "rejected", "expired"];
    return {
      available: available.length,
      active: myJobs.filter((j) => !closed.includes(j.job_status as JobStatus)).length,
      awaiting: myJobs.filter((j) => j.job_status === "claimed").length,
      booked: myJobs.filter((j) => j.job_status === "booked").length,
      leads: merged.length,
    };
  }, [available, myJobs, merged]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SkeletonRows n={4} />
      </div>
    );
  }
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <CompanyHeader company={company} onRefresh={reload} />
      <StatusBanner company={company} />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Available jobs" value={stats.available} icon={<Globe className="h-4 w-4" />} tone="info" hint="Open market" />
        <StatCard label="Active jobs" value={stats.active} icon={<Truck className="h-4 w-4" />} hint="Claimed by you" />
        <StatCard label="Awaiting response" value={stats.awaiting} icon={<Clock className="h-4 w-4" />} tone="warning" hint="12-hour timer" />
        <StatCard label="Booked" value={stats.booked} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" hint="Customer accepted" />
      </section>

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Workspace
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSPACE.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="card-premium card-premium-hover group flex items-start gap-3 p-4 transition-colors"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground/80">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
