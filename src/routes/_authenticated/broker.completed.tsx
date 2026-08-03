import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrokerShell } from "@/components/broker/BrokerShell";
import { PageHeader, SectionShell, StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { PipelineStrip } from "@/components/crm/PipelineStrip";
import {
  money,
  pct,
  STATUS_STYLES,
  INVOICE_STATUS_LABEL,
  type CommissionInvoice,
} from "@/lib/finance";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/broker/completed")({
  head: () => ({
    meta: [
      { title: "Completed jobs — Easy Move Pro Broker" },
      {
        name: "description",
        content:
          "Read-only record of completed moves you brokered: customer, moving company, final price, platform and broker commission, and payment status.",
      },
      { property: "og:title", content: "Completed jobs — Easy Move Pro Broker" },
      {
        property: "og:description",
        content: "Your completed moves with commission and payment status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerCompletedPage,
});

type Quote = Record<string, unknown> & { id: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const numOf = (v: unknown) => (v == null ? 0 : Number(v));

function BrokerCompletedPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<CommissionInvoice[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return setLoading(false);

      const { data: qs } = await supabase
        .from("quotes")
        .select("*")
        .eq("assigned_broker_id", uid)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(500);
      const quotes = (qs ?? []) as Quote[];
      setRows(quotes);

      const ids = quotes.map((q) => q.id);
      if (ids.length) {
        const { data: inv } = await supabase
          .from("commission_invoices")
          .select("*")
          .in("quote_id", ids);
        setInvoices((inv ?? []) as unknown as CommissionInvoice[]);
        const companyIds = [
          ...new Set(quotes.map((q) => str(q.assigned_company_id)).filter(Boolean) as string[]),
        ];
        if (companyIds.length) {
          const { data: cs } = await supabase
            .from("moving_companies")
            .select("id,name")
            .in("id", companyIds);
          setCompanies(
            Object.fromEntries(((cs ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name])),
          );
        }
      }
      setLoading(false);
    })();
  }, []);

  const invoiceOf = (quoteId: string) => invoices.find((i) => i.quote_id === quoteId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        str(r.quote_number),
        str(r.contact_email),
        str(r.contact_phone),
        companies[String(r.assigned_company_id)] ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search, companies]);

  const totals = useMemo(() => {
    const platform = invoices.reduce((s, i) => s + numOf(i.amount), 0);
    const broker = invoices.reduce((s, i) => s + numOf(i.broker_amount), 0);
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + numOf(i.broker_amount), 0);
    return { platform, broker, paid, jobs: rows.length };
  }, [invoices, rows]);

  return (
    <BrokerShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Broker"
          title="Completed jobs"
          subtitle="Read-only. A job becomes completed only when the moving company completes the move — brokers cannot mark completion."
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Completed moves" value={String(totals.jobs)} />
          <StatCard label="Platform commission" value={money(totals.platform)} />
          <StatCard label="Your commission" value={money(totals.broker)} tone="success" />
          <StatCard label="Paid to date" value={money(totals.paid)} />
        </div>

        <SectionShell
          title="Completed move records"
          right={
            <Badge variant="outline" className="rounded-full">
              {filtered.length}
            </Badge>
          }
        >
          <Input
            className="mb-4 max-w-sm"
            placeholder="Search job, customer or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <SkeletonRows n={4} />
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed jobs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const inv = invoiceOf(r.id);
                const details = (r.details ?? {}) as Record<string, unknown>;
                return (
                  <div key={r.id} className="space-y-3 rounded-2xl border border-border/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{str(r.quote_number) ?? "Job"}</span>
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-800"
                          >
                            Completed
                          </Badge>
                          {inv && (
                            <Badge
                              variant="outline"
                              className={`rounded-full ${STATUS_STYLES[inv.status]}`}
                            >
                              {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Completed{" "}
                          {str(r.completed_at)
                            ? new Date(String(r.completed_at)).toLocaleDateString()
                            : "—"}{" "}
                          · Invoice {inv?.number ?? "pending"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-lg tabular-nums">
                          {money(numOf(r.final_price) || numOf(r.final_accepted_price))}
                        </div>
                        <div className="text-xs text-muted-foreground">Final move price</div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Row
                        label="Customer"
                        value={str(details.full_name) ?? str(details.name) ?? "—"}
                      />
                      <Row label="Phone" value={str(r.contact_phone) ?? "—"} />
                      <Row label="Email" value={str(r.contact_email) ?? "—"} />
                      <Row
                        label="Moving company"
                        value={companies[String(r.assigned_company_id)] ?? "—"}
                      />
                      <Row
                        label="Pickup"
                        value={str(r.origin_address) ?? str(r.origin_zip) ?? "—"}
                      />
                      <Row
                        label="Delivery"
                        value={str(r.destination_address) ?? str(r.destination_zip) ?? "—"}
                      />
                      <Row
                        label="Move date"
                        value={str(r.final_move_date) ?? str(r.move_date) ?? "—"}
                      />
                      <Row
                        label="Platform commission"
                        value={inv ? `${money(inv.amount)} (${pct(inv.rate)})` : "—"}
                      />
                      <Row
                        label="Broker commission"
                        value={inv ? money(numOf(inv.broker_amount)) : "—"}
                      />
                      <Row
                        label="Payment status"
                        value={inv ? (INVOICE_STATUS_LABEL[inv.status] ?? inv.status) : "—"}
                      />
                      <Row label="Notes" value={str(r.broker_notes) ?? "—"} />
                    </div>

                    <PipelineStrip quote={r as never} />
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Brokers see Easy Move Pro commission information only. Invoices between the customer
            and the moving company are not part of the platform.
          </p>
        </SectionShell>
      </div>
    </BrokerShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words">{value}</div>
    </div>
  );
}
