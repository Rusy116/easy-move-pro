import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SectionShell, StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { FileText, Download, Mail, Ban, CheckCircle2, Clock, Send } from "lucide-react";
import {
  useCommissionInvoices,
  useQuoteMeta,
  useCompanyOptions,
  useCommissionPayments,
  adminInvoiceAction,
  downloadCommissionInvoicePdf,
  emailCommissionInvoice,
  balanceOf,
  money,
  pct,
  totalsOf,
  STATUS_STYLES,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUSES,
  type CommissionInvoice,
  type InvoiceAction,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  head: () => ({
    meta: [
      { title: "Invoice Center — Easy Move Pro Admin" },
      {
        name: "description",
        content:
          "Every Easy Move Pro commission invoice: search, filter, mark paid or partial, void, download PDF, email and review payment history.",
      },
      { property: "og:title", content: "Invoice Center — Easy Move Pro Admin" },
      {
        property: "og:description",
        content: "Manage platform commission invoices issued to moving companies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminInvoicesPage,
});

function AdminInvoicesPage() {
  const { t } = useI18n();
  const { invoices, loadingInvoices, reloadInvoices } = useCommissionInvoices(null);
  const meta = useQuoteMeta(invoices.map((i) => i.quote_id));
  const companies = useCompanyOptions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [partial, setPartial] = useState("");

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? t("admin.invoices.defaultCompanyName");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (companyId !== "all" && r.company_id !== companyId) return false;
      if (!q) return true;
      const hay = [r.number, companyName(r.company_id), meta[r.quote_id]?.quoteNumber ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, search, status, companyId, meta, companies]);

  const totals = useMemo(() => totalsOf(invoices), [invoices]);

  async function act(inv: CommissionInvoice, action: InvoiceAction, amount?: number) {
    setBusy(inv.id);
    const { error } = await adminInvoiceAction(inv.id, action, { amount });
    setBusy(null);
    if (error) {
      toast.error(t("admin.invoices.updateError"), { description: error.message });
      return;
    }
    toast.success(t("admin.invoices.updated", { number: inv.number }));
    setPartial("");
    await reloadInvoices();
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("admin.invoices.eyebrow")}
          title={t("admin.invoices.title")}
          subtitle={t("admin.invoices.subtitle")}
          icon={<FileText className="h-5 w-5" />}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t("admin.invoices.kpi.invoiced")} value={money(totals.total)} />
          <StatCard label={t("admin.invoices.kpi.paid")} value={money(totals.paid)} tone="success" />
          <StatCard label={t("admin.invoices.kpi.outstanding")} value={money(totals.outstanding)} tone="warning" />
          <StatCard label={t("admin.invoices.kpi.overdue")} value={money(totals.overdue)} tone="danger" />
        </div>

        <SectionShell
          title={t("admin.invoices.sectionTitle")}
          right={
            <Badge variant="outline" className="rounded-full">
              {rows.length}
            </Badge>
          }
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <Input
              placeholder={t("admin.invoices.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.invoices.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.invoices.allStatuses")}</SelectItem>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INVOICE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.invoices.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.invoices.allCompanies")}</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingInvoices ? (
            <SkeletonRows n={5} />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.invoices.noInvoices")}
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{inv.number}</span>
                        <Badge
                          variant="outline"
                          className={`rounded-full ${STATUS_STYLES[inv.status]}`}
                        >
                          {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {companyName(inv.company_id)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {meta[inv.quote_id]?.quoteNumber ?? t("admin.invoices.job")} · {t("admin.invoices.move")}{" "}
                        {meta[inv.quote_id]?.moveDate ?? "—"} · Issued {inv.issue_date} · Due{" "}
                        {inv.due_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-lg tabular-nums">
                        {money(inv.amount, inv.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("admin.invoices.ofAmount", { amount: pct(inv.rate) + " " + money(inv.final_price, inv.currency) })} · {t("admin.invoices.balance", { amount: "" })}{" "}
                        {money(balanceOf(inv), inv.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === inv.id}
                      onClick={() => void act(inv, "paid")}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === inv.id}
                      onClick={() => void act(inv, "overdue")}
                    >
                      <Clock className="mr-1.5 h-3.5 w-3.5" /> Mark overdue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === inv.id}
                      onClick={() => void act(inv, "send")}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Mark sent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === inv.id}
                      onClick={() => void act(inv, "void")}
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" /> Void
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        void downloadCommissionInvoicePdf(inv, {
                          companyName: companyName(inv.company_id),
                          quoteNumber: meta[inv.quote_id]?.quoteNumber,
                          moveDate: meta[inv.quote_id]?.moveDate,
                        })
                      }
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        emailCommissionInvoice(inv, {
                          companyName: companyName(inv.company_id),
                        })
                      }
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" /> Email
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setOpenId(openId === inv.id ? null : inv.id)}
                    >
                      {openId === inv.id ? "Hide" : "Payment history"}
                    </Button>
                    <Link
                      to="/admin/job/$quoteId"
                      params={{ quoteId: inv.quote_id }}
                      className="text-xs underline underline-offset-4 text-muted-foreground"
                    >
                      Open job record
                    </Link>
                  </div>

                  {openId === inv.id && (
                    <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="h-8 w-40"
                          inputMode="decimal"
                          placeholder="Partial amount"
                          value={partial}
                          onChange={(e) => setPartial(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="rounded-full"
                          disabled={busy === inv.id || !Number(partial)}
                          onClick={() => void act(inv, "partial", Number(partial))}
                        >
                          Record partial payment
                        </Button>
                      </div>
                      <PaymentHistory invoiceId={inv.id} currency={inv.currency} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </AdminShell>
  );
}

function PaymentHistory({ invoiceId, currency }: { invoiceId: string; currency: string }) {
  const { payments, loadingPayments } = useCommissionPayments(invoiceId);
  if (loadingPayments) return <SkeletonRows n={2} />;
  if (payments.length === 0)
    return <p className="text-xs text-muted-foreground">No payments recorded yet.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {new Date(p.paid_at).toLocaleString()} · {p.method}
            {p.reference ? ` · ${p.reference}` : ""}
          </span>
          <span className="tabular-nums font-medium">{money(p.amount, currency)}</span>
        </li>
      ))}
    </ul>
  );
}
