import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Globe,
  Truck,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  FolderOpen,
  Building2,
  Settings,
  ArrowRight,
  Clock,
  CheckCircle2,
  History,
  DollarSign,
} from "lucide-react";
import {
  CompanyHeader,
  NoCompanyScreen,
  StatusBanner,
  useMoverPortal,
} from "@/components/company/portal-shared";
import { StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { useCompanyJobs, ACTIVITY_LABEL, money, timeAgo, type JobStatus } from "@/lib/company-jobs";
import { useCommissions, useCompanyRecentActivity } from "@/lib/company-crm";

export const Route = createFileRoute("/_authenticated/company/")({
  head: () => ({
    meta: [
      { title: "Company Dashboard — Easy Moving Partner Portal" },
      {
        name: "description",
        content:
          "Your moving company workspace: available jobs, active jobs, customers, estimates, schedule and documents in one place.",
      },
    ],
  }),
  component: CompanyHome,
});

const WORKSPACE = [
  {
    to: "/company/jobs",
    label: "Available Jobs",
    desc: "Claim new open-market jobs first.",
    icon: Globe,
  },
  {
    to: "/company/myjobs",
    label: "My Jobs",
    desc: "Claimed jobs and 12-hour response timers.",
    icon: Truck,
  },
  {
    to: "/company/history",
    label: "Job History",
    desc: "Claimed, active, completed and cancelled moves.",
    icon: History,
  },
  {
    to: "/company/customers",
    label: "Customers",
    desc: "Your customer records and contact history.",
    icon: Users,
  },
  {
    to: "/company/estimates",
    label: "Estimates",
    desc: "Build and send final quotes.",
    icon: FileText,
  },
  {
    to: "/company/schedule",
    label: "Schedule",
    desc: "Upcoming moves on a calendar.",
    icon: Calendar,
  },
  {
    to: "/company/messages",
    label: "Messages",
    desc: "Conversations with customers and the broker.",
    icon: MessageSquare,
  },
  {
    to: "/company/documents",
    label: "Documents",
    desc: "Insurance, licenses and compliance files.",
    icon: FolderOpen,
  },
  {
    to: "/company/profile",
    label: "Profile",
    desc: "Company details, DOT/MC and service areas.",
    icon: Building2,
  },
  {
    to: "/company/settings",
    label: "Settings",
    desc: "Notifications, team and preferences.",
    icon: Settings,
  },
] as const;

function CompanyHome() {
  const { loading, company, merged, reload } = useMoverPortal();
  const { available, myJobs } = useCompanyJobs(company?.id ?? null);
  const { pendingTotal } = useCommissions(company?.id ?? null);
  const { activity } = useCompanyRecentActivity(company?.id ?? null);

  const stats = useMemo(() => {
    const closed: JobStatus[] = ["completed", "cancelled", "rejected", "expired"];
    return {
      claimed: myJobs.filter((j) => j.job_status === "claimed").length,
      active: myJobs.filter((j) => !closed.includes(j.job_status as JobStatus)).length,
      awaiting: myJobs.filter((j) => j.lead_status === "price_confirmed").length,
      completed: myJobs.filter((j) => j.job_status === "completed").length,
      available: available.length,
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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label="New claimed leads"
          value={stats.claimed}
          icon={<Clock className="h-4 w-4" />}
          tone="warning"
          hint="Awaiting first contact"
        />
        <StatCard
          label="Active jobs"
          value={stats.active}
          icon={<Truck className="h-4 w-4" />}
          hint="In progress"
        />
        <StatCard
          label="Awaiting customer"
          value={stats.awaiting}
          icon={<Globe className="h-4 w-4" />}
          tone="info"
          hint="Price confirmed"
        />
        <StatCard
          label="Completed moves"
          value={stats.completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
          hint="Delivered"
        />
        <StatCard
          label="Commission pending"
          value={money(pendingTotal)}
          icon={<DollarSign className="h-4 w-4" />}
          hint="Not yet processed"
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No activity yet — claim a job to get started.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm">
                  {ACTIVITY_LABEL[a.action] ?? a.action.replace(/_/g, " ")}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(a.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
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
