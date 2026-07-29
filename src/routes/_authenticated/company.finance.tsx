import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard, SectionShell, SkeletonRows, PageHeader } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, Download, Receipt, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  useCommissionInvoices, useCommissionLedger, useQuoteMeta, applyFinanceFilters,
  totalsOf, money, pct, STATUS_STYLES, EMPTY_FILTERS, COMMISSION_STATUSES,
  downloadCsv, activePaymentProvider, DEFAULT_COMMISSION_RATE,
  type FinanceFilters,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/company/finance")({
  head: () => ({
    meta: [
      { title: "Commissions & Finance — Company Portal" },
      {
        name: "description",
        content:
          "Track Easy Moving commission invoices, outstanding balance and payment history for your moving company.",
      },
      { property: "og:title", content: "Commissions & Finance — Company Portal" },
      {
        property: "og:description",
        content: "Commission invoices, outstanding balance and payment history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyFinancePage,
});

function CompanyFinancePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("moving_companies").select("id").limit(1);
      setCompanyId((data?.[0]?.id as string) ?? null);
    })();
  }, []);

  const { invoices, loadingInvoices } = useCommissionInvoices(companyId);
  const { commissions } = useCommissionLedger(companyId);
  const meta = useQuoteMeta(invoices.map((i) => i.quote_id));
  const [filters, setFilters] = useState<FinanceFilters>(EMPTY_FILTERS);

  const rows = useMemo(
    () => applyFinanceFilters(invoices, filters, meta),
    [invoices, filters, meta],
  );
  const totals = useMemo(() => totalsOf(invoices), [invoices]);
  const pendingCommission = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  const provider = activePaymentProvider();

  function exportCsv() {
    downloadCsv(
      `commission-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        invoice: r.number,
        quote: meta[r.quote_id]?.quoteNumber ?? r.quote_id,
        move_date: meta[r.quote_id]?.moveDate ?? "",
        final_price: r.final_price,
        rate: r.rate,
        commission: r.amount,
        status: r.status,
        issued: r.issue_date,
        due: r.due_date,
        paid: r.paid_at ?? "",
      })),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Commissions & invoices"
        subtitle={`Easy Moving charges ${pct(DEFAULT_COMMISSION_RATE)} of the final move price. Customers always pay you directly.`}
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <Button variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding balance"
          value={money(totals.outstanding)}
          hint="Invoiced + overdue"
          tone={totals.outstanding > 0 ? "warning" : "default"}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Overdue"
          value={money(totals.overdue)}
          tone={totals.overdue > 0 ? "danger" : "default"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Paid to date"
          value={money(totals.paid)}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Pending commission"
          value={money(pendingCommission)}
          hint="Not invoiced yet"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <SectionShell
        title="Commission invoices"
        right={<Badge variant="outline" className="rounded-full">{rows.length}</Badge>}
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Invoice or quote number"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v as FinanceFilters["status"] })}
          >
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {COMMISSION_STATUSES.filter((s) => s !== "pending").map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters({ ...filters, sort: v as FinanceFilters["sort"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="amount">Highest amount</SelectItem>
              <SelectItem value="due">Due date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingInvoices ? (
          <SkeletonRows n={4} />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No commission invoices yet. One is created automatically when you confirm a final price.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.number}</span>
                    <Badge variant="outline" className={`rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {meta[r.quote_id]?.quoteNumber ?? "Lead"} ·{" "}
                    Move {meta[r.quote_id]?.moveDate ?? "—"} · Issued {r.issue_date} · Due {r.due_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg font-medium tabular-nums">
                    {money(r.amount, r.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pct(r.rate)} of {money(r.final_price, r.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell title="How settlement works">
        <p className="text-sm text-muted-foreground">
          Easy Moving never processes the customer's moving payment — the customer pays you
          directly. We only invoice our {pct(DEFAULT_COMMISSION_RATE)} commission on the confirmed
          final price. Current settlement method: <strong>{provider.label}</strong>. Online card
          payment is not enabled yet.
        </p>
      </SectionShell>
    </div>
  );
}
