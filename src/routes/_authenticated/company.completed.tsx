import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonRows } from "@/components/shell/Chrome";
import { EmptyState, JobStatusBadge } from "@/components/company/JobsUI";
import { Button } from "@/components/ui/button";
import { formatDate, money, place, useCompanyJobs, useMyCompany } from "@/lib/company-jobs";
import { customerName, isCompletedJob } from "@/lib/company-workflow";
import { useCommissions } from "@/lib/company-crm";

export const Route = createFileRoute("/_authenticated/company/completed")({
  head: () => ({
    meta: [
      { title: "Completed Jobs — Easy Moving Company CRM" },
      {
        name: "description",
        content:
          "Every finished move with its invoice, final price, platform commission and payment status.",
      },
      { property: "og:title", content: "Completed Jobs — Easy Moving Company CRM" },
      {
        property: "og:description",
        content: "Archive of finished moves with invoices, commissions and payment tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompletedJobsPage,
});

type InvoiceRow = {
  id: string;
  quote_id: string | null;
  number: string | null;
  total: number | null;
  amount_paid: number | null;
  status: string | null;
};

function CompletedJobsPage() {
  const { company, loading: loadingCompany } = useMyCompany();
  const { myJobs, loading } = useCompanyJobs(company?.id ?? null);
  const { commissions } = useCommissions(company?.id ?? null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("company_invoices")
        .select("id, quote_id, number, total, amount_paid, status")
        .eq("company_id", company.id)
        .limit(500);
      if (!cancelled) setInvoices((data ?? []) as InvoiceRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  const jobs = useMemo(() => myJobs.filter(isCompletedJob), [myJobs]);

  if (loadingCompany || (loading && !myJobs.length)) return <SkeletonRows n={3} />;
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
        <h1 className="text-2xl font-semibold tracking-tight">Completed Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finished moves only, with invoice, final price, platform commission and payment status.
        </p>
      </header>

      {jobs.length === 0 ? (
        <EmptyState
          title="No completed jobs yet"
          body="Press Complete Job inside a current job and it will be archived here with its invoice."
        />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const invoice = invoices.find((i) => i.quote_id === job.id) ?? null;
            const commission = commissions.find((c) => c.quote_id === job.id) ?? null;
            const paid =
              invoice && Number(invoice.amount_paid ?? 0) >= Number(invoice.total ?? 0)
                ? "Paid"
                : (invoice?.status ?? "Awaiting payment");
            return (
              <article key={job.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {job.quote_number ?? job.id.slice(0, 8)}
                    </div>
                    <h3 className="mt-0.5 truncate text-lg font-semibold">
                      {place(job.origin_city, job.origin_state)} →{" "}
                      {place(job.destination_city, job.destination_state)}
                    </h3>
                    <p className="text-sm text-muted-foreground">{customerName(job)}</p>
                  </div>
                  <JobStatusBadge status={job.job_status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Item label="Final price" value={money(job.final_price)} />
                  <Item
                    label="Commission"
                    value={commission ? money(Number(commission.amount)) : "—"}
                  />
                  <Item label="Move date" value={formatDate(job.final_move_date ?? job.move_date)} />
                  <Item label="Invoice" value={invoice?.number ?? "Pending"} />
                  <Item label="Payment" value={<span className="capitalize">{paid}</span>} />
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/company/job/$jobId" params={{ jobId: job.id }}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> Timeline & documents
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/company/invoices">
                      <Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoices
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
