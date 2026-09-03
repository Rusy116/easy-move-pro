import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Receipt, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SectionShell, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listStoreOrders,
  refundStoreOrder,
  resendOrderLinks,
  type AdminOrderList,
} from "@/lib/store/admin-orders.functions";
import { money } from "@/lib/pdf-store/catalog";
import { useT } from "@/i18n";

const STATUSES = ["all", "paid", "pending", "failed", "refunded", "disputed"] as const;

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Store orders — Easy Moving admin" },
      { name: "description", content: "Digital store orders, refunds and download link resends." },
    ],
  }),
  component: AdminOrdersPage,
});

function statusTone(status: string) {
  if (status === "paid") return "bg-sage/15 text-sage-foreground";
  if (status === "pending") return "bg-amber-100 text-amber-900";
  if (status === "failed") return "bg-muted text-muted-foreground";
  return "bg-destructive/10 text-destructive";
}

function AdminOrdersPage() {
  const t = useT();
  const [data, setData] = useState<AdminOrderList | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      setData(await listStoreOrders({ data: { search, status } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.orders.toast.loadFailed"));
      setData({ rows: [], totals: { paidCount: 0, grossCents: 0, refundedCents: 0 } });
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refund(id: string, orderNumber: string) {
    if (!window.confirm(t("admin.orders.confirmRefund", { orderNumber }))) return;
    setBusyId(id);
    try {
      const res = await refundStoreOrder({ data: { orderId: id } });
      if ("error" in res) throw new Error(res.error);
      toast.success(t("admin.orders.toast.refunded"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.orders.toast.refundFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function resend(id: string) {
    setBusyId(id);
    try {
      const res = await resendOrderLinks({ data: { orderId: id } });
      if ("error" in res) throw new Error(res.error);
      toast.success(
        t("admin.orders.toast.sentLinks", { count: res.sent, plural: res.sent === 1 ? "" : "s" }),
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.orders.toast.resendFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("admin.orders.eyebrow")}
        title={t("admin.orders.title")}
        subtitle={t("admin.orders.subtitle")}
        icon={<Receipt className="h-5 w-5" />}
      />

      {data && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("admin.orders.kpi.paidOrders")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{data.totals.paidCount}</p>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("admin.orders.kpi.gross")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {money(data.totals.grossCents)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("admin.orders.kpi.refundedDisputed")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {money(data.totals.refundedCents)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <SectionShell>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.orders.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            {STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                className="rounded-full capitalize"
                onClick={() => setStatus(s)}
              >
                {t(`admin.orders.status.${s}`)}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4">
            {!data ? (
              <SkeletonRows n={4} />
            ) : data.rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("admin.orders.noOrdersFound")}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.rows.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-start gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">{o.orderNumber}</span>
                        <Badge className={`rounded-full capitalize ${statusTone(o.status)}`}>
                          {t(`admin.orders.status.${o.status}`)}
                        </Badge>
                        {o.environment !== "live" && (
                          <Badge variant="outline" className="rounded-full">
                            {t("admin.orders.testBadge")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm">
                        {o.buyerName || t("admin.orders.guest")} · {o.email}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {o.items.map((i) => i.title).join(", ")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()} ·{" "}
                        {o.emailSentAt ? t("admin.orders.linkEmailed") : t("admin.orders.emailNotSent")}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{money(o.amountCents)}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={o.status !== "paid" || busyId === o.id}
                        onClick={() => void resend(o.id)}
                      >
                        {busyId === o.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">{t("admin.orders.resend")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-destructive"
                        disabled={o.status !== "paid" || busyId === o.id}
                        onClick={() => void refund(o.id, o.orderNumber)}
                      >
                        <Undo2 className="h-4 w-4" />
                        <span className="ml-1.5 hidden sm:inline">{t("admin.orders.refund")}</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionShell>
      </div>
    </AdminShell>
  );
}
