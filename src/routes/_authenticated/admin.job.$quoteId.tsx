import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBrokers } from "@/components/admin/BrokerSelect";
import { PipelineStrip } from "@/components/crm/PipelineStrip";
import { UniversalTimeline } from "@/components/crm/UniversalTimeline";
import {
  money,
  pct,
  STATUS_STYLES,
  INVOICE_STATUS_LABEL,
  downloadCommissionInvoicePdf,
  balanceOf,
  type CommissionInvoice,
} from "@/lib/finance";
import { Briefcase, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/job/$quoteId")({
  head: () => ({
    meta: [
      { title: "Job record — Easy Move Pro Admin" },
      {
        name: "description",
        content:
          "Full admin job record: customer, broker, moving company, move details, pricing, platform and broker commission, invoice and audit timeline.",
      },
      { property: "og:title", content: "Job record — Easy Move Pro Admin" },
      {
        property: "og:description",
        content: "Complete job, commission and invoice detail for one move.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminJobRecordPage,
});

type Row = Record<string, unknown> & { id: string };

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm">{value ?? "—"}</div>
    </div>
  );
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (v == null ? null : Number(v));

function AdminJobRecordPage() {
  const { quoteId } = Route.useParams();
  const brokers = useBrokers();
  const [quote, setQuote] = useState<Row | null>(null);
  const [company, setCompany] = useState<{ name: string; email: string | null } | null>(null);
  const [invoice, setInvoice] = useState<CommissionInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: q } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
      setQuote((q ?? null) as Row | null);
      if (q?.assigned_company_id) {
        const { data: c } = await supabase
          .from("moving_companies")
          .select("name,email")
          .eq("id", q.assigned_company_id)
          .maybeSingle();
        setCompany((c ?? null) as { name: string; email: string | null } | null);
      }
      const { data: inv } = await supabase
        .from("commission_invoices")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(1);
      setInvoice(((inv ?? [])[0] ?? null) as unknown as CommissionInvoice | null);
      setLoading(false);
    })();
  }, [quoteId]);

  const brokerName = useMemo(() => {
    const id = str(quote?.assigned_broker_id);
    if (!id) return "Unassigned";
    const b = brokers.find((x) => x.id === id);
    return b?.full_name || b?.email || id.slice(0, 8);
  }, [brokers, quote]);

  if (loading) {
    return (
      <AdminShell>
        <SkeletonRows n={6} />
      </AdminShell>
    );
  }
  if (!quote) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Job not found.</p>
      </AdminShell>
    );
  }

  const details = (quote.details ?? {}) as Record<string, unknown>;
  const customer =
    str(details.full_name) ?? str(details.name) ?? str(quote.contact_email) ?? "Customer";
  const services = Array.isArray(quote.job_services) ? (quote.job_services as string[]) : [];
  const finalPrice = num(quote.final_price) ?? num(quote.final_accepted_price) ?? 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin record"
          title={str(quote.quote_number) ?? "Job record"}
          subtitle="Every field for this move: customer, broker, company, pricing, commission and audit trail."
          icon={<Briefcase className="h-5 w-5" />}
          actions={
            <Link to="/admin/invoices">
              <Button variant="outline" size="sm" className="rounded-full">
                Invoice Center
              </Button>
            </Link>
          }
        />

        <SectionShell title="Pipeline">
          <PipelineStrip
            quote={quote as never}
            note="Completion is written only when the moving company completes the job."
          />
        </SectionShell>

        <SectionShell title="Identity & parties">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Job ID" value={<span className="font-mono text-xs">{quote.id}</span>} />
            <Fact label="Quote number" value={str(quote.quote_number)} />
            <Fact label="Customer" value={customer} />
            <Fact label="Phone" value={str(quote.contact_phone)} />
            <Fact label="Email" value={str(quote.contact_email)} />
            <Fact label="Broker" value={brokerName} />
            <Fact label="Moving company" value={company?.name ?? "Unassigned"} />
            <Fact
              label="Completion date"
              value={
                str(quote.completed_at)
                  ? new Date(String(quote.completed_at)).toLocaleString()
                  : null
              }
            />
          </div>
        </SectionShell>

        <SectionShell title="Move details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact
              label="Pickup address"
              value={str(quote.origin_address) ?? str(quote.origin_zip)}
            />
            <Fact
              label="Delivery address"
              value={str(quote.destination_address) ?? str(quote.destination_zip)}
            />
            <Fact label="Move date" value={str(quote.final_move_date) ?? str(quote.move_date)} />
            <Fact label="Arrival window" value={str(quote.arrival_window)} />
            <Fact label="Crew size" value={num(quote.crew_size) ?? num(quote.num_movers)} />
            <Fact label="Truck size" value={str(quote.final_truck_size) ?? str(quote.truck_size)} />
            <Fact
              label="Volume"
              value={
                num(quote.estimated_cubic_feet) ? `${num(quote.estimated_cubic_feet)} cu ft` : null
              }
            />
            <Fact
              label="Distance"
              value={num(quote.distance_miles) ? `${num(quote.distance_miles)} mi` : null}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact
              label="Selected services"
              value={services.length ? services.join(", ") : "None recorded"}
            />
            <Fact label="Customer notes" value={str(quote.inventory_notes)} />
            <Fact label="Internal notes" value={str(quote.company_notes)} />
          </div>
        </SectionShell>

        <SectionShell title="Financials">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Final move price" value={money(finalPrice)} />
            <Fact label="Deposit" value={money(num(quote.deposit_amount) ?? 0)} />
            <Fact label="Additional charges" value={money(num(quote.additional_charges) ?? 0)} />
            <Fact
              label="Platform commission"
              value={invoice ? `${money(invoice.amount)} (${pct(invoice.rate)})` : "—"}
            />
            <Fact
              label="Broker commission"
              value={invoice ? money(invoice.broker_amount ?? 0) : "—"}
            />
            <Fact
              label="Commission payment status"
              value={
                invoice ? (
                  <Badge
                    variant="outline"
                    className={`rounded-full ${STATUS_STYLES[invoice.status]}`}
                  >
                    {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
                  </Badge>
                ) : (
                  "No invoice yet"
                )
              }
            />
            <Fact label="Commission invoice number" value={invoice?.number ?? null} />
            <Fact
              label="Balance due"
              value={invoice ? money(balanceOf(invoice), invoice.currency) : "—"}
            />
          </div>
          {invoice && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  void downloadCommissionInvoicePdf(invoice, {
                    companyName: company?.name ?? "Moving company",
                    quoteNumber: str(quote.quote_number),
                    moveDate: str(quote.final_move_date) ?? str(quote.move_date),
                  })
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Commission invoice PDF
              </Button>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Easy Move Pro is a broker platform. The moving service invoice between customer and
            moving company is never stored here — only the platform commission invoice.
          </p>
        </SectionShell>

        <SectionShell title="Audit timeline">
          <UniversalTimeline quoteId={quoteId} />
        </SectionShell>
      </div>
    </AdminShell>
  );
}
