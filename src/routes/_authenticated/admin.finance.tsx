import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useI18n } from "@/i18n";
import { StatCard, SectionShell, SkeletonRows, PageHeader } from "@/components/shell/Chrome";
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
import {
  Banknote,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import {
  useCommissionInvoices,
  useCommissionLedger,
  useQuoteMeta,
  useCompanyOptions,
  useFinanceReports,
  applyFinanceFilters,
  totalsOf,
  money,
  pct,
  STATUS_STYLES,
  EMPTY_FILTERS,
  COMMISSION_STATUSES,
  downloadCsv,
  setCommissionStatus,
  runOverdueSweep,
  REPORT_LABELS,
  type FinanceFilters,
  type ReportKind,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({
    meta: [
      { title: "Finance & Commissions — Easy Moving Admin" },
      {
        name: "description",
        content:
          "Platform revenue, commission invoices, outstanding balances and revenue reports by company and broker.",
      },
      { property: "og:title", content: "Finance & Commissions — Easy Moving Admin" },
      {
        property: "og:description",
        content: "Revenue, commission invoices and outstanding balances.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminFinancePage,
});

function AdminFinancePage() {
  const { t } = useI18n();
  const { invoices, loadingInvoices, reloadInvoices } = useCommissionInvoices(null);
  const { commissions, reloadCommissions } = useCommissionLedger(null);
  const meta = useQuoteMeta(invoices.map((i) => i.quote_id));
  const companies = useCompanyOptions();
  const { monthly, byCompany, byBroker } = useFinanceReports(true);
  const [filters, setFilters] = useState<FinanceFilters>(EMPTY_FILTERS);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(
    () => applyFinanceFilters(invoices, filters, meta),
    [invoices, filters, meta],
  );
  const totals = useMemo(() => totalsOf(invoices), [invoices]);
  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.name ?? t("admin.finance.defaultCompanyName");
  const commissionOf = (invoiceCommissionId: string) =>
    commissions.find((c) => c.id === invoiceCommissionId);

  const brokerOptions = useMemo(
    () => byBroker.map((b) => ({ id: b.broker_id ?? "none", name: b.broker_name })),
    [byBroker],
  );

  async function changeStatus(commissionId: string, status: string) {
    setBusy(commissionId);
    const { error } = await setCommissionStatus(commissionId, status as never);
    setBusy(null);
    if (error) {
      toast.error(t("admin.finance.couldNotUpdate"), { description: error.message });
      return;
    }
    toast.success(t("admin.finance.commissionMarked", { status: t(`admin.finance.status.${status}`) }));
    await Promise.all([reloadInvoices(), reloadCommissions()]);
  }

  async function sweep() {
    setBusy("sweep");
    const { error } = await runOverdueSweep();
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(t("admin.finance.overdueSweepComplete"));
      await reloadInvoices();
    }
  }

  function exportReport(kind: ReportKind) {
    const stamp = new Date().toISOString().slice(0, 10);
    const map: Record<ReportKind, Array<Record<string, unknown>>> = {
      "monthly-commission": monthly as unknown as Array<Record<string, unknown>>,
      "company-revenue": byCompany as unknown as Array<Record<string, unknown>>,
      "broker-revenue": byBroker as unknown as Array<Record<string, unknown>>,
      "outstanding-invoices": rows
        .filter((r) => r.status === "invoiced" || r.status === "overdue")
        .map((r) => ({
          invoice: r.number,
          company: companyName(r.company_id),
          amount: r.amount,
          due: r.due_date,
          status: r.status,
        })),
      "paid-invoices": rows
        .filter((r) => r.status === "paid")
        .map((r) => ({
          invoice: r.number,
          company: companyName(r.company_id),
          amount: r.amount,
          paid_at: r.paid_at,
        })),
    };
    const data = map[kind];
    if (!data || data.length === 0) {
      toast.info(t("admin.finance.nothingToExport"));
      return;
    }
    downloadCsv(`${kind}-${stamp}.csv`, data);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={t("admin.finance.eyebrow")}
          title={t("admin.finance.title")}
          subtitle={t("admin.finance.subtitle")}
          icon={<Banknote className="h-5 w-5" />}
          actions={
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy === "sweep"}
              onClick={sweep}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${busy === "sweep" ? "animate-spin" : ""}`} />
              {t("admin.finance.runOverdueCheck")}
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label={t("admin.finance.totalRevenue")}
            value={money(totals.total)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label={t("admin.finance.paid")}
            value={money(totals.paid)}
            tone="success"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard label={t("admin.finance.outstanding")} value={money(totals.outstanding)} tone="warning" />
          <StatCard
            label={t("admin.finance.overdue")}
            value={money(totals.overdue)}
            tone="danger"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label={t("admin.finance.cancelled")}
            value={money(totals.cancelled)}
            icon={<Hourglass className="h-4 w-4" />}
          />
        </div>

        <SectionShell
          title={t("admin.finance.commissionInvoices")}
          right={
            <Badge variant="outline" className="rounded-full">
              {rows.length}
            </Badge>
          }
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <Input
              placeholder={t("admin.finance.searchPlaceholder")}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Select
              value={filters.companyId}
              onValueChange={(v) => setFilters({ ...filters, companyId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.finance.companyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.finance.allCompanies")}</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.brokerId}
              onValueChange={(v) => setFilters({ ...filters, brokerId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.finance.brokerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.finance.allBrokers")}</SelectItem>
                {brokerOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters({ ...filters, status: v as FinanceFilters["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.finance.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.finance.allStatuses")}</SelectItem>
                {COMMISSION_STATUSES.filter((s) => s !== "pending").map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`admin.finance.status.${s}`)}
                  </SelectItem>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("admin.finance.sortNewest")}</SelectItem>
                <SelectItem value="oldest">{t("admin.finance.sortOldest")}</SelectItem>
                <SelectItem value="amount">{t("admin.finance.sortAmount")}</SelectItem>
                <SelectItem value="due">{t("admin.finance.sortDue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingInvoices ? (
            <SkeletonRows n={5} />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.finance.noInvoices")}
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const c = commissionOf(r.commission_id);
                return (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.number}</span>
                        <Badge
                          variant="outline"
                          className={`rounded-full ${STATUS_STYLES[r.status]}`}
                        >
                          {t(`admin.finance.status.${r.status}`)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {companyName(r.company_id)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                        <span>{meta[r.quote_id]?.quoteNumber ?? t("admin.finance.lead")}</span>
                        <span>· {t("admin.finance.move")} {meta[r.quote_id]?.moveDate ?? "—"}</span>
                        <span>
                          · {t("admin.finance.issued")} {r.issue_date} · {t("admin.finance.due")}{" "}
                          {r.due_date}
                        </span>
                        {r.paid_at ? (
                          <span>
                            · {t("admin.finance.paidOn")} {new Date(r.paid_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-serif text-lg font-medium tabular-nums">
                          {money(r.amount, r.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pct(r.rate)} {t("admin.finance.ofAmount", { amount: money(r.final_price, r.currency) })}
                        </div>
                      </div>
                      <Select
                        value={c?.status ?? r.status}
                        disabled={busy === r.commission_id}
                        onValueChange={(v) => void changeStatus(r.commission_id, v)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMISSION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`admin.finance.status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionShell>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionShell title={t("admin.finance.topCompanies")}>
            {byCompany.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.finance.noRevenueYet")}</p>
            ) : (
              <div className="space-y-2">
                {byCompany.slice(0, 8).map((c) => (
                  <div
                    key={c.company_id}
                    className="flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">{c.company_name}</span>
                    <span className="tabular-nums">
                      {money(c.total)}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({money(c.outstanding)} {t("admin.finance.open")})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>

          <SectionShell title={t("admin.finance.topBrokers")}>
            {byBroker.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.finance.noBrokerRevenueYet")}</p>
            ) : (
              <div className="space-y-2">
                {byBroker.slice(0, 8).map((b) => (
                  <div
                    key={b.broker_id ?? "none"}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">{b.broker_name}</span>
                    <span className="tabular-nums">{money(b.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>
        </div>

        <SectionShell title={t("admin.finance.monthlyTrend")}>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.finance.noInvoicesIssuedYet")}</p>
          ) : (
            <div className="space-y-2">
              {monthly.map((m) => {
                const max = Math.max(...monthly.map((x) => Number(x.invoiced ?? 0)), 1);
                const w = (Number(m.invoiced ?? 0) / max) * 100;
                return (
                  <div key={m.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {new Date(m.month).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="tabular-nums">
                        {money(m.invoiced)} · {t("admin.finance.paidLower")} {money(m.paid)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionShell>

        <SectionShell title={t("admin.finance.reports")}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REPORT_LABELS) as ReportKind[]).map((k) => (
              <Button
                key={k}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => exportReport(k)}
              >
                <Download className="mr-1.5 h-4 w-4" /> {t(`admin.finance.report.${k}`)}
              </Button>
            ))}
          </div>
        </SectionShell>
      </div>
    </AdminShell>
  );
}
