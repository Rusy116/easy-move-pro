import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserPlus, Loader2, ShieldCheck, Ban, RotateCcw, KeyRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ViewAsUserButton } from "@/components/admin/ViewAsUserButton";
import { AccountDirectory } from "@/components/admin/AccountDirectory";
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

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Team & brokers — Admin" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const listStaff = useServerFn(adminListStaff);
  const createBroker = useServerFn(adminCreateBroker);
  const setStatus = useServerFn(adminSetAccountStatus);
  const resetPassword = useServerFn(adminResetPassword);

  const [rows, setRows] = useState<StaffRow[]>([]);
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
      setRows(await listStaff({}));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load accounts");
    } finally {
      setLoading(false);
    }
  }, [listStaff]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createBroker({ data: { ...form, status: "active" } });
      toast.success("Broker created and active.");
      setForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create broker");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row: StaffRow) {
    const next = row.status === "disabled" ? "active" : "disabled";
    try {
      await setStatus({ data: { userId: row.id, status: next } });
      toast.success(next === "active" ? "Account re-enabled." : "Account disabled.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update account");
    }
  }

  async function onResetPassword(row: StaffRow) {
    const password = window.prompt(`New password for ${row.email} (min 8 characters)`);
    if (!password) return;
    try {
      await resetPassword({ data: { userId: row.id, password } });
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    }
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-14">
        <PageHeader
          eyebrow="Platform administration"
          title="Team & brokers"
          subtitle="Broker accounts are created here. Brokers can never register themselves."
          icon={<Users className="h-5 w-5" />}
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <UserPlus className="mr-1.5 h-4 w-4" /> Create broker
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create broker account</DialogTitle>
                </DialogHeader>
                <form onSubmit={onCreate} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
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
                    Create broker
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mt-8 grid gap-3">
          {loading ? (
            <SkeletonRows n={3} />
          ) : rows.length === 0 ? (
            <div className="card-premium p-10 text-center text-sm text-muted-foreground">
              No administrator or broker accounts yet.
            </div>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="card-premium flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {[row.first_name, row.last_name].filter(Boolean).join(" ") ||
                        row.full_name ||
                        row.email}
                    </span>
                    <Badge variant={row.role === "admin" ? "default" : "outline"}>
                      {row.role === "admin" ? "Administrator" : "Broker"}
                    </Badge>
                    {row.status === "disabled" ? (
                      <Badge className="border border-destructive/30 bg-destructive/10 text-destructive">
                        Disabled
                      </Badge>
                    ) : (
                      <Badge className="border border-emerald-600/30 bg-emerald-500/10 text-emerald-700">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ViewAsUserButton userId={row.id} disabled={row.status === "disabled"} />
                </div>
                {row.role === "broker" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => onResetPassword(row)}
                    >
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Password
                    </Button>
                    <Button
                      variant={row.status === "disabled" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleStatus(row)}
                    >
                      {row.status === "disabled" ? (
                        <>
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Enable
                        </>
                      ) : (
                        <>
                          <Ban className="mr-1.5 h-3.5 w-3.5" /> Disable
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <h2 className="mt-12 font-serif text-2xl">All platform accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search every customer, broker, moving company and administrator, and open their
          workspace with View as User.
        </p>
        <div className="mt-4">
          <AccountDirectory />
        </div>
      </section>
    </AdminShell>
  );
}
