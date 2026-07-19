import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { attachMemberByEmail } from "@/lib/companies.functions";
import { Plus, UserPlus, Building2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  head: () => ({ meta: [{ title: "Moving Companies — Admin" }] }),
  component: CompaniesAdmin,
});

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  dot_number: string | null;
  mc_number: string | null;
  service_states: string[];
  phone: string | null;
  email: string | null;
  rating: number | null;
  license_status: string;
  active: boolean;
};

const LICENSE_STATUSES = ["active", "pending", "suspended", "expired"] as const;

function CompaniesAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [addingMemberFor, setAddingMemberFor] = useState<Company | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setIsAdmin(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("moving_companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCompanies((data ?? []) as Company[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (isAdmin === null) {
    return (
      <SiteLayout>
        <div className="p-16 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (!isAdmin) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <Link
            to="/dashboard"
            className="mt-6 inline-block text-primary hover:underline"
          >
            ← Back to dashboard
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
              Admin
            </span>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl font-medium">
              Moving Companies
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {companies.length} partner companies
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin">← Quotes</Link>
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New company
                </Button>
              </DialogTrigger>
              <CompanyFormDialog
                onSaved={() => {
                  setCreateOpen(false);
                  void load();
                }}
              />
            </Dialog>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {loading && companies.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">
              Loading…
            </div>
          )}
          {!loading && companies.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No companies yet. Create the first partner to start assigning leads.
            </div>
          )}
          {companies.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg font-medium">{c.name}</h3>
                    <Badge
                      variant="outline"
                      className={
                        c.license_status === "active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }
                    >
                      {c.license_status}
                    </Badge>
                    {!c.active && (
                      <Badge variant="outline" className="bg-neutral-100 text-neutral-700">
                        inactive
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    {c.dot_number && <div>DOT #{c.dot_number}</div>}
                    {c.mc_number && <div>MC #{c.mc_number}</div>}
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {c.service_states.length > 0 && (
                      <div>Serves: {c.service_states.join(", ")}</div>
                    )}
                    {c.rating !== null && <div>★ {Number(c.rating).toFixed(1)}</div>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAddingMemberFor(c)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add member
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-200"
                  onClick={async () => {
                    if (!confirm(`Delete ${c.name}? All lead assignments for this company will be removed.`)) return;
                    await supabase.from("quote_assignments").delete().eq("company_id", c.id);
                    await supabase.from("company_members").delete().eq("company_id", c.id);
                    const { error } = await supabase.from("moving_companies").delete().eq("id", c.id);
                    if (error) { toast.error(error.message); return; }
                    toast.success("Company deleted");
                    void load();
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              </div>

            </div>
          ))}
        </div>
      </section>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <CompanyFormDialog
            initial={editing}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
          />
        </Dialog>
      )}

      {addingMemberFor && (
        <Dialog open onOpenChange={(o) => !o && setAddingMemberFor(null)}>
          <AddMemberDialog
            company={addingMemberFor}
            onDone={() => setAddingMemberFor(null)}
          />
        </Dialog>
      )}
    </SiteLayout>
  );
}

function CompanyFormDialog({
  initial,
  onSaved,
}: {
  initial?: Company;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    logo_url: initial?.logo_url ?? "",
    dot_number: initial?.dot_number ?? "",
    mc_number: initial?.mc_number ?? "",
    service_states: initial?.service_states.join(", ") ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    rating: initial?.rating?.toString() ?? "",
    license_status: initial?.license_status ?? "pending",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      logo_url: form.logo_url.trim() || null,
      dot_number: form.dot_number.trim() || null,
      mc_number: form.mc_number.trim() || null,
      service_states: form.service_states
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      rating: form.rating ? Number(form.rating) : null,
      license_status: form.license_status,
      active: form.active,
    };
    const { error } = initial
      ? await supabase.from("moving_companies").update(payload).eq("id", initial.id)
      : await supabase.from("moving_companies").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial ? "Company updated" : "Company created");
    onSaved();
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit company" : "New moving company"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <Field label="Company name *">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Logo URL">
          <Input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="DOT number">
            <Input
              value={form.dot_number}
              onChange={(e) => setForm({ ...form, dot_number: e.target.value })}
            />
          </Field>
          <Field label="MC number">
            <Input
              value={form.mc_number}
              onChange={(e) => setForm({ ...form, mc_number: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Service states (comma-separated, e.g. NY, NJ, PA)">
          <Input
            value={form.service_states}
            onChange={(e) => setForm({ ...form, service_states: e.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rating (0–5)">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            />
          </Field>
          <Field label="License status">
            <Select
              value={form.license_status}
              onValueChange={(v) => setForm({ ...form, license_status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Create company"}
        </Button>
      </div>
    </DialogContent>
  );
}

function AddMemberDialog({ company, onDone }: { company: Company; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const attach = useServerFn(attachMemberByEmail);

  async function submit() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await attach({ data: { email: email.trim(), companyId: company.id } });
      toast.success("Member added — they can now log in and view assigned leads");
      setEmail("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add member to {company.name}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Enter the email of an existing Easy Moving account. They'll be granted the
        Moving Company role and linked to this company.
      </p>
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="mover@company.com"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={submit} disabled={busy || !email.trim()}>
          {busy ? "Adding…" : "Add member"}
        </Button>
      </div>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
