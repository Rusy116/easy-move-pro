import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState, MyJobCard } from "@/components/company/JobsUI";
import { useCompanyJobs, useMyCompany, JOB_STATUS_LABEL, type JobStatus } from "@/lib/company-jobs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/company/myjobs")({
  head: () => ({
    meta: [
      { title: "My Jobs — Easy Moving Company Portal" },
      {
        name: "description",
        content: "Track claimed moving jobs, response deadlines and customer contact details.",
      },
    ],
  }),
  component: MyJobsPage,
});

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
  { key: "claimed", label: JOB_STATUS_LABEL.claimed },
  { key: "contacted", label: JOB_STATUS_LABEL.contacted },
  { key: "final_quote_sent", label: JOB_STATUS_LABEL.final_quote_sent },
  { key: "booked", label: JOB_STATUS_LABEL.booked },
  { key: "completed", label: JOB_STATUS_LABEL.completed },
];

const CLOSED: JobStatus[] = ["completed", "cancelled", "rejected", "expired"];

function MyJobsPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { myJobs, loading } = useCompanyJobs(company?.id ?? null);
  const [filter, setFilter] = useState("active");

  const jobs = useMemo(() => {
    if (filter === "all") return myJobs;
    if (filter === "active")
      return myJobs.filter((j) => !CLOSED.includes(j.job_status as JobStatus));
    return myJobs.filter((j) => j.job_status === filter);
  }, [myJobs, filter]);

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
        <h1 className="text-2xl font-semibold tracking-tight">My jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs your company owns. Respond within 12 hours or the job returns to the marketplace.
        </p>
      </header>

      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Claim a job from Available jobs to see it in this list."
        />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <MyJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
