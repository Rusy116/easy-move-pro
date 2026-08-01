import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, FileText, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/scheduled")({
  head: () => ({
    meta: [
      { title: "Scheduled Jobs — Company Portal" },
      {
        name: "description",
        content: "Jobs booked from accepted estimates, with invoices and bills of lading.",
      },
    ],
  }),
  component: ScheduledJobsPage,
});

type JobRow = {
  id: string;
  job_number: string;
  quote_id: string;
  status: string;
  scheduled_date: string | null;
  arrival_window: string | null;
  crew_size: number | null;
  truck_size: string | null;
  final_price: number;
  broker_commission: number;
  gross_profit: number;
  created_at: string;
};

type CustomerRow = { quote_id: string | null; full_name: string | null; phone: string | null };
type BolRow = { quote_id: string; number: string };
type InvoiceRow = { quote_id: string | null; number: string; total: number; status: string };

function ScheduledJobsPage() {
  const { loading, company, reload } = useMoverPortal();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [bols, setBols] = useState<BolRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    void (async () => {
      const [j, c, b, i] = await Promise.all([
        supabase
          .from("jobs")
          .select("*")
          .eq("company_id", company.id)
          .order("scheduled_date", { ascending: true }),
        supabase.from("customers").select("quote_id, full_name, phone").eq("company_id", company.id),
        supabase.from("bills_of_lading").select("quote_id, number").eq("company_id", company.id),
        supabase
          .from("company_invoices")
          .select("quote_id, number, total, status")
          .eq("company_id", company.id),
      ]);
      if (cancelled) return;
      setJobs((j.data ?? []) as unknown as JobRow[]);
      setCustomers((c.data ?? []) as unknown as CustomerRow[]);
      setBols((b.data ?? []) as unknown as BolRow[]);
      setInvoices((i.data ?? []) as unknown as InvoiceRow[]);
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [company]);

  const totals = useMemo(
    () => ({
      count: jobs.length,
      revenue: jobs.reduce((s, j) => s + Number(j.final_price), 0),
      profit: jobs.reduce((s, j) => s + Number(j.gross_profit), 0),
      commission: jobs.reduce((s, j) => s + Number(j.broker_commission), 0),
    }),
    [jobs],
  );

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Scheduled jobs", value: String(totals.count) },
          { label: "Booked revenue", value: `$${totals.revenue.toLocaleString()}` },
          { label: "Gross profit", value: `$${totals.profit.toLocaleString()}` },
          { label: "Broker commission", value: `$${totals.commission.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="card-premium p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 font-serif text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-premium p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <h1 className="font-serif text-xl">Scheduled jobs</h1>
        </div>
        {busy && <SkeletonRows n={3} />}
        {!busy && jobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No jobs yet — a job is created automatically when a customer accepts your estimate.
          </div>
        )}
        <div className="space-y-2">
          {jobs.map((j) => {
            const cust = customers.find((c) => c.quote_id === j.quote_id);
            const bol = bols.find((b) => b.quote_id === j.quote_id);
            const inv = invoices.find((i) => i.quote_id === j.quote_id);
            return (
              <div key={j.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{j.job_number}</span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-800 border-emerald-300 capitalize"
                    >
                      {j.status}
                    </Badge>
                    <span className="text-muted-foreground">{cust?.full_name ?? "Customer"}</span>
                  </div>
                  <div className="font-serif text-lg">${Number(j.final_price).toLocaleString()}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{j.scheduled_date ?? "Date to confirm"}</span>
                  <span>{j.arrival_window ?? "Window to confirm"}</span>
                  <span>{j.crew_size ? `${j.crew_size} movers` : "Crew TBD"}</span>
                  <span>{j.truck_size ?? "Truck TBD"}</span>
                  <span>profit ${Number(j.gross_profit).toLocaleString()}</span>
                  <span>commission ${Number(j.broker_commission).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {inv && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                      <Receipt className="h-3.5 w-3.5" /> Invoice {inv.number} · {inv.status}
                    </span>
                  )}
                  {bol && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                      <FileText className="h-3.5 w-3.5" /> Bill of lading {bol.number}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
