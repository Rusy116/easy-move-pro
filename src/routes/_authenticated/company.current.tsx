import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/company/JobsUI";
import { CurrentJobCard } from "@/components/company/CurrentJobCard";
import { useCompanyJobs, useMyCompany } from "@/lib/company-jobs";
import { isCurrentJob } from "@/lib/company-workflow";

export const Route = createFileRoute("/_authenticated/company/current")({
  head: () => ({
    meta: [
      { title: "Current Jobs — Easy Moving Company CRM" },
      {
        name: "description",
        content:
          "Your company workspace: every claimed move in progress, with countdown timers, customer details and the full job pipeline.",
      },
      { property: "og:title", content: "Current Jobs — Easy Moving Company CRM" },
      {
        property: "og:description",
        content: "Work every claimed move from claim to completion inside your company CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CurrentJobsPage,
});

function CurrentJobsPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { myJobs, loading } = useCompanyJobs(company?.id ?? null);

  const jobs = useMemo(() => myJobs.filter(isCurrentJob), [myJobs]);

  if (loadingCompany || (loading && !myJobs.length)) return <SkeletonRows n={4} />;
  if (!company) {
    return (
      <EmptyState
        title="No company linked"
        body="Your account is not linked to a moving company yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Current Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your daily workspace. Every job you claim lands here automatically and stays until the
          move is completed or cancelled. Contact the customer within 12 hours of claiming.
        </p>
      </header>

      {jobs.length === 0 ? (
        <EmptyState
          title="No active jobs"
          body="Claim a lead in the Marketplace and it will appear here instantly."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <CurrentJobCard key={job.id} job={job} companyName={company.name} />
          ))}
        </div>
      )}
    </div>
  );
}
