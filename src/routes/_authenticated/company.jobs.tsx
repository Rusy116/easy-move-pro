import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonRows } from "@/components/shell/Chrome";
import { AvailableJobCard, EmptyState } from "@/components/company/JobsUI";
import {
  MarketplaceFilters,
  useFilteredMarketplace,
  useMarketplaceFilters,
} from "@/components/company/MarketplaceFilters";
import { useCompanyJobs, useMyCompany, logJobView, type AvailableJob } from "@/lib/company-jobs";

export const Route = createFileRoute("/_authenticated/company/jobs")({
  head: () => ({
    meta: [
      { title: "Available Jobs — Easy Moving Company Portal" },
      {
        name: "description",
        content: "Browse qualified moving jobs on the open marketplace and claim them instantly.",
      },
    ],
  }),
  component: AvailableJobsPage,
});

function AvailableJobsPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { available, loading, dropAvailable, reload } = useCompanyJobs(company?.id ?? null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [filters, setFilters] = useMarketplaceFilters();
  const rows = useFilteredMarketplace(available, filters);

  async function claim(job: AvailableJob) {
    if (!company) return;
    setClaimingId(job.id);
    void logJobView(job.id, company.id);
    dropAvailable(job.id); // optimistic
    const { error } = await supabase.rpc("fn_company_claim_job", {
      _quote_id: job.id,
      _company_id: company.id,
    });
    setClaimingId(null);
    if (error) {
      toast.error(error.message || "Could not claim this job.");
      void reload();
      return;
    }
    toast.success(`${job.quote_number ?? "Job"} claimed — open Current Jobs, you have 12 hours to contact the customer.`);
    void reload();
  }

  if (loadingCompany || (loading && !available.length)) return <SkeletonRows n={4} />;
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
        <h1 className="text-2xl font-semibold tracking-tight">Available jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broker-qualified moves open to every approved company. First to claim owns the job for 12
          hours.
        </p>
      </header>

      <MarketplaceFilters jobs={available} value={filters} onChange={setFilters} />

      {rows.length === 0 ? (
        <EmptyState
          title="No jobs on the marketplace right now"
          body="New published leads appear here instantly — no refresh needed."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((job) => (
            <AvailableJobCard
              key={job.id}
              job={job}
              claiming={claimingId === job.id}
              onClaim={claim}
            />
          ))}
        </div>
      )}
    </div>
  );
}
