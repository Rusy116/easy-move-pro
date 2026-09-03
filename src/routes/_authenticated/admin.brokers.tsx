import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, Loader2, ShieldCheck, Ban, RotateCcw, KeyRound, Briefcase } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ViewAsUserButton } from "@/components/admin/ViewAsUserButton";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  adminCreateBroker,
  adminListStaff,
  adminResetPassword,
  adminSetAccountStatus,
  type StaffRow,
} from "@/lib/auth.functions";
import { toast } from "sonner";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/brokers")({
  head: () => ({
    meta: [
      { title: "Brokers — Easy Moving admin" },
      {
        name: "description",
        content:
          "Manage internal broker accounts, access, workload and performance across the Easy Moving lead pipeline.",
      },
    ],
  }),
  component: AdminBrokersPage,
});

type Workload = { open: number; total: number; won: number; revenue: number };

function AdminBrokersPage() {
  const listStaff = useServerFn(adminListStaff);
  const createBroker = useServerFn(adminCreateBroker);
  const setStatus = useServerFn(adminSetAccountStatus);
  const resetPassword = useServerFn(adminResetPassword);
  const t = useT();

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [workload, setWorkload] = useState<Record<string, Workload>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, quotes] = await Promise.all([
        listStaff({}),
        supabase
          .from("quotes")
          .select(
            "assigned_broker_id,lead_phase,status,job_status,final_accepted_price,final_price,estimated_high",
          )
          .not("assigned_broker_id", "is", null)
          .limit(2000),
      ]);
      setRows(staff);
      const map: Record<string, Workload> = {};
      for (const q of (quotes.data ?? []) as Record<string, unknown>[]) {
        const id = q.assigned_broker_id as string;
        const w = (map[id] ??= { open: 0, total: 0, won: 0, revenue: 0 });
        w.total += 1;
        const closed = q.lead_phase === "closed" || q.status === "cancelled";
        if (!closed) w.open += 1;
        const price =
          (q.final_accepted_price as number) ?? (q.final_price as number) ?? null;
        if (price) {
          w.won += 1;
          w.revenue += price;
        }
      }
      setWorkload(map);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.brokers.toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [listStaff]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const brokers = useMemo(() => rows.filter((r) => r.role === "broker"), [rows]);
  const admins = useMemo(() => rows.filter((r) => r.role === "admin"), [rows]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createBroker({ data: { ...form, status: "active" } });
      toast.success(t("admin.brokers.toast.created"));
      setForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.brokers.toast.createError"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row: StaffRow) {
    const next = row.status === "disabled" ? "active" : "disabled";
    try {
      await setStatus({ data: { userId: row.id, status: next } });
      toast.success(next === "active" ? t("admin.brokers.toast.enabled") : t("admin.brokers.toast.disabled"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.brokers.toast.statusError"));
    }
  }

  async function onResetPassword(row: StaffRow) {
    const password = window.prompt(t("admin.brokers.promptNewPassword", { email: row.email }));
    if (!password) return;
    try {
      await resetPassword({ data: { userId: row.id, password } });
      toast.success(t("admin.brokers.toast.passwordUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.brokers.toast.passwordError"));
    }
  }

  function renderRow(row: StaffRow) {
    const w = workload[row.id];
    return (
      <article key={row.id} className="card-premium flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {[row.first_name, row.last_name].filter(Boolean).join(" ") ||
                row.full_name ||
                row.email}
            </span>
            <Badge variant={row.role === "admin" ? "default" : "outline"}>
              {row.role === "admin" ? t("admin.brokers.role.administrator") : t("admin.brokers.role.broker")}
            </Badge>
            {row.status === "disabled" ? (
              <Badge className="border border-destructive/30 bg-destructive/10 text-destructive">
                {t("admin.brokers.status.disabled")}
              </Badge>
            ) : (
              <Badge className="border border-emerald-600/30 bg-emerald-500/10 text-emerald-700">
                <ShieldCheck className="mr-1 h-3 w-3" /> {t("admin.brokers.status.active")}
              </Badge>
            )}
          </div>
          <div className="mt-1 truncate text-sm text-muted-foreground">
            {row.email}
            {row.phone ? ` · ${row.phone}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {t("admin.brokers.stat.openLeads")} <span className="font-semibold text-foreground">{w?.open ?? 0}</span>
            </span>
            <span>
              {t("admin.brokers.stat.totalAssigned")} <span className="font-semibold text-foreground">{w?.total ?? 0}</span>
            </span>
            <span>
              {t("admin.brokers.stat.booked")} <span className="font-semibold text-foreground">{w?.won ?? 0}</span>
            </span>
            <span>
              {t("admin.brokers.stat.revenue")}{" "}
              <span className="font-semibold text-foreground">
                {(w?.revenue ?? 0).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Contextual impersonation lives here, inside the broker profile row. */}
          <ViewAsUserButton userId={row.id} disabled={row.status === "disabled"} />
          {row.role === "broker" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => onResetPassword(row)}
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {t("admin.brokers.action.password")}
              </Button>
              <Button
                variant={row.status === "disabled" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => toggleStatus(row)}
              >
                {row.status === "disabled" ? (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t("admin.brokers.action.enable")}
                  </>
                ) : (
                  <>
                    <Ban className="mr-1.5 h-3.5 w-3.5" /> {t("admin.brokers.action.disable")}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </article>
    );
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        <PageHeader
          eyebrow={t("admin.brokers.eyebrow")}
          title={t("admin.brokers.title")}
          subtitle={t("admin.brokers.subtitle")}
          icon={<Briefcase className="h-5 w-5" />}
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <UserPlus className="mr-1.5 h-4 w-4" /> {t("admin.brokers.createBroker")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.brokers.dialog.createTitle")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onCreate} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">{t("admin.brokers.field.firstName")}</Label>
                      <Input
                        id="firstName"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t("admin.brokers.field.lastName")}</Label>
                      <Input
                        id="lastName"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("admin.brokers.field.phone")}</Label>
                    <Input
                      id="phone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("admin.brokers.field.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{t("admin.brokers.field.password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      minLength={8}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={busy} className="rounded-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("admin.brokers.createBroker")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mt-8 grid gap-3">
          {loading ? (
            <SkeletonRows n={3} />
          ) : brokers.length === 0 ? (
            <div className="card-premium p-10 text-center text-sm text-muted-foreground">
              {t("admin.brokers.emptyState")}
            </div>
          ) : (
            brokers.map(renderRow)
          )}
        </div>

        {admins.length > 0 && (
          <>
            <h2 className="mt-12 font-serif text-2xl">{t("admin.brokers.administratorsHeading")}</h2>
            <div className="mt-4 grid gap-3">{admins.map(renderRow)}</div>
          </>
        )}
      </section>
    </AdminShell>
  );
}
