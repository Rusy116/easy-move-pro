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
import { useI18n } from "@/i18n";

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
  const { t } = useI18n();
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
    if (!id) return t("admin.job.unassignedBroker");
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
        <p className="text-sm text-muted-foreground">{t("admin.job.notFound")}</p>
      </AdminShell>
    );
  }

  const details = (quote.details ?? {}) as Record<string, unknown>;
  const customer =
    str(details.full_name) ?? str(details.name) ?? str(quote.contact_email) ?? t("admin.job.defaultCustomer");
  const services = Array.isArray(quote.job_services) ? (quote.job_services as string[]) : [];
  const finalPrice = num(quote.final_price) ?? num(quote.final_accepted_price) ?? 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("admin.job.eyebrow")}
          title={str(quote.quote_number) ?? t("admin.job.defaultTitle")}
          subtitle={t("admin.job.subtitle")}
          icon={<Briefcase className="h-5 w-5" />}
          actions={
            <Link to="/admin/invoices">
              <Button variant="outline" size="sm" className="rounded-full">
                {t("admin.job.invoiceCenter")}
              </Button>
            </Link>
          }
        />

        <SectionShell title={t("admin.job.pipelineTitle")}>
          <PipelineStrip
            quote={quote as never}
            note={t("admin.job.pipelineNote")}
          />
        </SectionShell>

        <SectionShell title={t("admin.job.identityTitle")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("admin.job.jobId")} value={<span className="font-mono text-xs">{quote.id}</span>} />
            <Fact label={t("admin.job.quoteNumber")} value={str(quote.quote_number)} />
            <Fact label={t("admin.job.customer")} value={customer} />
            <Fact label={t("admin.job.phone")} value={str(quote.contact_phone)} />
            <Fact label={t("admin.job.email")} value={str(quote.contact_email)} />
            <Fact label={t("admin.job.broker")} value={brokerName} />
            <Fact label={t("admin.job.movingCompany")} value={company?.name ?? t("admin.job.unassignedCompany")} />
            <Fact
              label={t("admin.job.completionDate")}
              value={
                str(quote.completed_at)
                  ? new Date(String(quote.completed_at)).toLocaleString()
                  : null
              }
            />
          </div>
        </SectionShell>

        <SectionShell title={t("admin.job.moveDetailsTitle")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact
              label={t("admin.job.pickupAddress")}
              value={str(quote.origin_address) ?? str(quote.origin_zip)}
            />
            <Fact
              label={t("admin.job.deliveryAddress")}
              value={str(quote.destination_address) ?? str(quote.destination_zip)}
            />
            <Fact label={t("admin.job.moveDate")} value={str(quote.final_move_date) ?? str(quote.move_date)} />
            <Fact label={t("admin.job.arrivalWindow")} value={str(quote.arrival_window)} />
            <Fact label={t("admin.job.crewSize")} value={num(quote.crew_size) ?? num(quote.num_movers)} />
            <Fact label={t("admin.job.truckSize")} value={str(quote.final_truck_size) ?? str(quote.truck_size)} />
            <Fact
              label={t("admin.job.volume")}
              value={
                num(quote.estimated_cubic_feet) ? t("admin.job.volumeUnit", { value: num(quote.estimated_cubic_feet) as number }) : null
              }
            />
            <Fact
              label={t("admin.job.distance")}
              value={num(quote.distance_miles) ? t("admin.job.distanceUnit", { value: num(quote.distance_miles) as number }) : null}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact
              label={t("admin.job.selectedServices")}
              value={services.length ? services.join(", ") : t("admin.job.noneRecorded")}
            />
            <Fact label={t("admin.job.customerNotes")} value={str(quote.inventory_notes)} />
            <Fact label={t("admin.job.internalNotes")} value={str(quote.company_notes)} />
          </div>
        </SectionShell>

        <SectionShell title={t("admin.job.financialsTitle")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("admin.job.finalMovePrice")} value={money(finalPrice)} />
            <Fact label={t("admin.job.deposit")} value={money(num(quote.deposit_amount) ?? 0)} />
            <Fact label={t("admin.job.additionalCharges")} value={money(num(quote.additional_charges) ?? 0)} />
            <Fact
              label={t("admin.job.platformCommission")}
              value={invoice ? `${money(invoice.amount)} (${pct(invoice.rate)})` : "—"}
            />
            <Fact
              label={t("admin.job.brokerCommission")}
              value={invoice ? money(invoice.broker_amount ?? 0) : "—"}
            />
            <Fact
              label={t("admin.job.commissionPaymentStatus")}
              value={
                invoice ? (
                  <Badge
                    variant="outline"
                    className={`rounded-full ${STATUS_STYLES[invoice.status]}`}
                  >
                    {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
                  </Badge>
                ) : (
                  t("admin.job.noInvoiceYet")
                )
              }
            />
            <Fact label={t("admin.job.commissionInvoiceNumber")} value={invoice?.number ?? null} />
            <Fact
              label={t("admin.job.balanceDue")}
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
                    companyName: company?.name ?? t("admin.job.defaultMovingCompany"),
                    quoteNumber: str(quote.quote_number),
                    moveDate: str(quote.final_move_date) ?? str(quote.move_date),
                  })
                }
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> {t("admin.job.commissionInvoicePdf")}
              </Button>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {t("admin.job.commissionFootnote")}
          </p>
        </SectionShell>

        <SectionShell title={t("admin.job.auditTimelineTitle")}>
          <UniversalTimeline quoteId={quoteId} />
        </SectionShell>
      </div>
    </AdminShell>
  );
}
