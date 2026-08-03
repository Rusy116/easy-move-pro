import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ================================================================== */
/*                              Types                                  */
/* ================================================================== */

export type CommissionStatus =
  | "pending"
  | "invoiced"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

/** Full commission-invoice lifecycle (Easy Move Pro → Moving Company). */
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "invoiced"
  | "partial"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "viewed",
  "invoiced",
  "partial",
  "paid",
  "overdue",
  "void",
  "cancelled",
];

export const COMMISSION_STATUSES: CommissionStatus[] = [
  "pending",
  "invoiced",
  "partial",
  "paid",
  "overdue",
  "cancelled",
];


/** Platform default commission rate. Commission is always auto-calculated. */
export const DEFAULT_COMMISSION_RATE = 0.25;

export type CommissionRow = {
  id: string;
  quote_id: string;
  company_id: string;
  broker_id: string | null;
  customer_id: string | null;
  base_price: number;
  rate: number;
  amount: number;
  currency: string;
  status: CommissionStatus;
  notes: string | null;
  due_date: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionInvoice = {
  id: string;
  number: string;
  commission_id: string;
  company_id: string;
  quote_id: string;
  broker_id: string | null;
  customer_id: string | null;
  final_price: number;
  rate: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  /** Broker share of the platform commission. */
  broker_rate?: number;
  broker_amount?: number;
  amount_paid?: number;
  sent_at?: string | null;
  viewed_at?: string | null;
  voided_at?: string | null;
};


export type FinanceTotals = {
  total: number;
  paid: number;
  outstanding: number;
  overdue: number;
  cancelled: number;
  pending: number;
  count: number;
};

/* ================================================================== */
/*                             Formatting                              */
/* ================================================================== */

export const money = (n: number | null | undefined, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

export const pct = (rate: number | null | undefined) => `${Math.round(Number(rate ?? 0) * 100)}%`;

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-50 text-blue-800 border-blue-300",
  viewed: "bg-indigo-50 text-indigo-800 border-indigo-300",
  invoiced: "bg-sky-50 text-sky-800 border-sky-300",
  partial: "bg-amber-50 text-amber-800 border-amber-300",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-300",
  overdue: "bg-rose-50 text-rose-800 border-rose-300",
  void: "bg-muted text-muted-foreground border-border line-through",
  cancelled: "bg-muted text-muted-foreground border-border line-through",
};


/* ================================================================== */
/*                              Filters                                */
/* ================================================================== */

export type FinanceFilters = {
  search: string;
  status: CommissionStatus | "all";
  companyId: string | "all";
  brokerId: string | "all";
  from: string;
  to: string;
  sort: "newest" | "oldest" | "amount" | "due";
};

export const EMPTY_FILTERS: FinanceFilters = {
  search: "",
  status: "all",
  companyId: "all",
  brokerId: "all",
  from: "",
  to: "",
  sort: "newest",
};

export function applyFinanceFilters(
  rows: CommissionInvoice[],
  f: FinanceFilters,
  meta: Record<string, { quoteNumber?: string | null; moveDate?: string | null }> = {},
) {
  const q = f.search.trim().toLowerCase();
  const out = rows.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.companyId !== "all" && r.company_id !== f.companyId) return false;
    if (f.brokerId !== "all" && (r.broker_id ?? "none") !== f.brokerId) return false;
    if (f.from && r.issue_date < f.from) return false;
    if (f.to && r.issue_date > f.to) return false;
    if (q) {
      const m = meta[r.quote_id] ?? {};
      const hay = [r.number, m.quoteNumber ?? "", m.moveDate ?? ""].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  out.sort((a, b) => {
    switch (f.sort) {
      case "oldest":
        return a.issue_date.localeCompare(b.issue_date);
      case "amount":
        return Number(b.amount) - Number(a.amount);
      case "due":
        return a.due_date.localeCompare(b.due_date);
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return out;
}

export function totalsOf(rows: CommissionInvoice[]): FinanceTotals {
  const sum = (p: (r: CommissionInvoice) => boolean) =>
    rows.filter(p).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  return {
    total: sum((r) => r.status !== "cancelled"),
    paid: sum((r) => r.status === "paid"),
    outstanding: sum((r) => r.status === "invoiced" || r.status === "overdue"),
    overdue: sum((r) => r.status === "overdue"),
    cancelled: sum((r) => r.status === "cancelled"),
    pending: sum((r) => r.status === "invoiced"),
    count: rows.length,
  };
}

/* ================================================================== */
/*                                Hooks                                */
/* ================================================================== */

/** Commission invoices visible to the signed-in actor (RLS enforced). */
export function useCommissionInvoices(companyId?: string | null) {
  const [rows, setRows] = useState<CommissionInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    let query = supabase
      .from("commission_invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    setRows((data ?? []) as unknown as CommissionInvoice[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel(`commission-invoices-${companyId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commission_invoices" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [companyId, reload]);

  const totals = useMemo(() => totalsOf(rows), [rows]);
  return { invoices: rows, loadingInvoices: loading, reloadInvoices: reload, totals };
}

/** Commission records (the ledger behind the invoices). */
export function useCommissionLedger(companyId?: string | null) {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    let query = supabase
      .from("company_commissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    setRows((data ?? []) as unknown as CommissionRow[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { commissions: rows, loadingCommissions: loading, reloadCommissions: reload };
}

/** Quote metadata used for labelling invoice rows. */
export function useQuoteMeta(quoteIds: string[]) {
  const key = quoteIds.slice().sort().join(",");
  const [meta, setMeta] = useState<
    Record<string, { quoteNumber: string | null; moveDate: string | null; city: string | null }>
  >({});

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, quote_number, move_date, final_move_date, origin_city, origin_state")
        .in("id", key.split(","));
      if (cancelled) return;
      const next: typeof meta = {};
      for (const r of data ?? []) {
        next[r.id] = {
          quoteNumber: r.quote_number ?? null,
          moveDate: r.final_move_date ?? r.move_date ?? null,
          city: r.origin_city ? `${r.origin_city}, ${r.origin_state ?? ""}` : null,
        };
      }
      setMeta(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return meta;
}

/** Companies list (admin filters). */
export function useCompanyOptions() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("moving_companies").select("id, name").order("name");
      setRows((data ?? []) as Array<{ id: string; name: string }>);
    })();
  }, []);
  return rows;
}

/* ================================================================== */
/*                          Admin operations                           */
/* ================================================================== */

export async function setCommissionStatus(
  commissionId: string,
  status: CommissionStatus,
  note?: string | null,
) {
  return supabase.rpc("fn_admin_set_commission_status", {
    _commission_id: commissionId,
    _status: status,
    _note: note ?? null,
  } as never);
}

export async function runOverdueSweep() {
  return supabase.rpc("fn_finance_overdue_tick" as never, {} as never);
}

/* ================================================================== */
/*                              Reports                                */
/* ================================================================== */

export type MonthlyRow = {
  month: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  overdue: number;
  cancelled: number;
  invoices: number;
};
export type CompanyRow = {
  company_id: string;
  company_name: string;
  invoices: number;
  total: number;
  paid: number;
  outstanding: number;
  overdue: number;
};
export type BrokerRow = {
  broker_id: string | null;
  broker_name: string;
  invoices: number;
  total: number;
  paid: number;
  outstanding: number;
};

export function useFinanceReports(enabled: boolean) {
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [byCompany, setByCompany] = useState<CompanyRow[]>([]);
  const [byBroker, setByBroker] = useState<BrokerRow[]>([]);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const [m, c, b] = await Promise.all([
      supabase.rpc("fn_finance_monthly_report", { _months: 12 } as never),
      supabase.rpc("fn_finance_company_report" as never, {} as never),
      supabase.rpc("fn_finance_broker_report" as never, {} as never),
    ]);
    setMonthly((m.data ?? []) as unknown as MonthlyRow[]);
    setByCompany((c.data ?? []) as unknown as CompanyRow[]);
    setByBroker((b.data ?? []) as unknown as BrokerRow[]);
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { monthly, byCompany, byBroker, reloadReports: reload };
}

/* ================================================================== */
/*                        Export architecture                          */
/* ================================================================== */

export type ReportKind =
  | "monthly-commission"
  | "company-revenue"
  | "broker-revenue"
  | "outstanding-invoices"
  | "paid-invoices";

export const REPORT_LABELS: Record<ReportKind, string> = {
  "monthly-commission": "Monthly commission report",
  "company-revenue": "Company revenue report",
  "broker-revenue": "Broker revenue report",
  "outstanding-invoices": "Outstanding invoice report",
  "paid-invoices": "Paid invoice report",
};

/** Minimal CSV serializer — the export pipeline other formats plug into. */
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/*                     Payment provider architecture                   */
/*  Interfaces only — no payment processing is implemented today.      */
/*  Customers always pay the moving company directly; the platform     */
/*  only collects its commission.                                      */
/* ================================================================== */

export type PaymentProviderId = "stripe" | "manual";

export type PaymentIntentRequest = {
  invoiceId: string;
  amount: number;
  currency: string;
  description?: string;
};

export type PaymentIntentResult = {
  provider: PaymentProviderId;
  status: "unavailable" | "requires_action" | "succeeded";
  checkoutUrl?: string;
  reference?: string;
  message?: string;
};

export interface PaymentProvider {
  id: PaymentProviderId;
  label: string;
  /** Gated by a feature flag until the provider is wired up. */
  enabled: boolean;
  createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResult>;
}

/** Placeholder provider. Wiring Stripe later only replaces this object. */
export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Stripe",
  enabled: false,
  async createPaymentIntent(req) {
    return {
      provider: "stripe",
      status: "unavailable",
      message: `Online payment is not enabled yet. Invoice ${req.invoiceId} must be settled offline.`,
    };
  },
};

/** Offline settlement — the only supported path today. */
export const manualProvider: PaymentProvider = {
  id: "manual",
  label: "Bank transfer / offline",
  enabled: true,
  async createPaymentIntent() {
    return {
      provider: "manual",
      status: "requires_action",
      message: "Settle this invoice offline. An admin marks it paid once received.",
    };
  },
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [manualProvider, stripeProvider];

export function activePaymentProvider(): PaymentProvider {
  return PAYMENT_PROVIDERS.find((p) => p.enabled) ?? manualProvider;
}

/* ================================================================== */
/*                    Commission invoice center                        */
/*  Easy Move Pro issues exactly ONE invoice per completed move:       */
/*  Easy Move Pro -> Moving Company, for the platform commission.      */
/*  Customer <-> Moving Company invoices are never stored here.        */
/* ================================================================== */

export type InvoiceAction = "send" | "view" | "paid" | "partial" | "overdue" | "void";

export type CommissionPayment = {
  id: string;
  invoice_id: string;
  commission_id: string | null;
  company_id: string | null;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  note: string | null;
  paid_at: string;
  created_at: string;
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  invoiced: "Sent",
  partial: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  cancelled: "Void",
};

/** Admin-only invoice state change / payment recording. */
export async function adminInvoiceAction(
  invoiceId: string,
  action: InvoiceAction,
  opts: { amount?: number; note?: string; reference?: string } = {},
) {
  return supabase.rpc("fn_admin_invoice_action", {
    _invoice_id: invoiceId,
    _action: action,
    _amount: opts.amount ?? null,
    _note: opts.note ?? null,
    _reference: opts.reference ?? null,
  } as never);
}

/** Payment history for one invoice (or every invoice when id is null). */
export function useCommissionPayments(invoiceId: string | null) {
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    let q = supabase
      .from("commission_payments")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(500);
    if (invoiceId) q = q.eq("invoice_id", invoiceId);
    const { data } = await q;
    setPayments((data ?? []) as unknown as CommissionPayment[]);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { payments, loadingPayments: loading, reloadPayments: reload };
}

export function balanceOf(inv: CommissionInvoice) {
  return Math.max(Number(inv.amount ?? 0) - Number(inv.amount_paid ?? 0), 0);
}

/** Commission invoice PDF (platform -> moving company). */
export async function downloadCommissionInvoicePdf(
  inv: CommissionInvoice,
  ctx: { companyName: string; quoteNumber?: string | null; moveDate?: string | null },
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const L = 16;
  doc.setFontSize(20);
  doc.text("EASY MOVE PRO", L, 22);
  doc.setFontSize(10);
  doc.text("Moving marketplace & broker platform", L, 28);
  doc.setFontSize(16);
  doc.text("COMMISSION INVOICE", L, 44);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${inv.number}`, 140, 22);
  doc.text(`Issued: ${inv.issue_date}`, 140, 28);
  doc.text(`Due: ${inv.due_date}`, 140, 34);
  doc.text(`Status: ${INVOICE_STATUS_LABEL[inv.status] ?? inv.status}`, 140, 40);

  doc.text("Bill to:", L, 58);
  doc.text(ctx.companyName, L, 64);

  let y = 82;
  const line = (k: string, v: string) => {
    doc.text(k, L, y);
    doc.text(v, 120, y);
    y += 7;
  };
  line("Job / quote", ctx.quoteNumber ?? "—");
  line("Move date", ctx.moveDate ?? "—");
  line("Final move price", money(inv.final_price, inv.currency));
  line("Platform commission rate", pct(inv.rate));
  line("Commission due", money(inv.amount, inv.currency));
  line("Amount paid", money(inv.amount_paid ?? 0, inv.currency));
  line("Balance", money(balanceOf(inv), inv.currency));

  doc.setFontSize(9);
  doc.text(
    "Easy Move Pro is a broker platform, not a moving company. This invoice covers the platform",
    L,
    y + 10,
  );
  doc.text(
    "commission only. The moving service invoice is issued directly by the moving company to the customer.",
    L,
    y + 15,
  );
  doc.save(`${inv.number}.pdf`);
}

/** Email the invoice to the moving company (mail client hand-off). */
export function emailCommissionInvoice(
  inv: CommissionInvoice,
  ctx: { companyName: string; email?: string | null },
) {
  if (typeof window === "undefined") return;
  const subject = `Easy Move Pro commission invoice ${inv.number}`;
  const body = [
    `Hello ${ctx.companyName},`,
    "",
    `Commission invoice ${inv.number} is ${INVOICE_STATUS_LABEL[inv.status] ?? inv.status}.`,
    `Move price: ${money(inv.final_price, inv.currency)}`,
    `Platform commission (${pct(inv.rate)}): ${money(inv.amount, inv.currency)}`,
    `Balance due: ${money(balanceOf(inv), inv.currency)}`,
    `Due date: ${inv.due_date}`,
    "",
    "Easy Move Pro",
  ].join("\n");
  window.location.href = `mailto:${ctx.email ?? ""}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
