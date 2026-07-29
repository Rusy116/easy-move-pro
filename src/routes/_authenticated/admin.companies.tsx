import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
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
import { adminSetCompanyStatus, type CompanyStatus } from "@/lib/partners.functions";
import {
  Plus,
  UserPlus,
  Building2,
  Trash2,
  FileCheck2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RotateCcw,
  Download,
} from "lucide-react";

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
  status: CompanyStatus;
  rejection_reason: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  website: string | null;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  insurance_carrier: string | null;
  insurance_policy: string | null;
  insurance_expires: string | null;
  fleet_size: number | null;
  movers_count: number | null;
  service_cities: string[] | null;
  services_offered: string[] | null;
  created_at: string;
};

const LICENSE_STATUSES = ["active", "pending", "suspended", "expired"] as const;

const STATUS_TABS = [
  { key: "pending", label: "Pending approval" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

const STATUS_STYLE: Record<CompanyStatus, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-300",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  suspended: "bg-orange-50 text-orange-800 border-orange-300",
  rejected: "bg-rose-50 text-rose-800 border-rose-300",
};

function CompaniesAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [addingMemberFor, setAddingMemberFor] = useState<Company | null>(null);
  const [reviewing, setReviewing] = useState<Company | null>(null);
  const [rejecting, setRejecting] = useState<Company | null>(null);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const setStatus = useServerFn(adminSetCompanyStatus);

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

  const visible = useMemo(
    () => (tab === "all" ? companies : companies.filter((c) => c.status === tab)),
    [companies, tab],
  );

  const changeStatus = useCallback(
    async (c: Company, status: CompanyStatus, reason?: string) => {
      try {
        await setStatus({ data: { companyId: c.id, status, reason } });
        toast.success(`${c.name} — status set to ${status}`);
        void load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update status");
      }
    },
    [setStatus, load],
  );

  if (isAdmin === null) {
    return (
      <AdminShell>
        <div className="p-16 text-center text-muted-foreground">Loading…</div>
      </AdminShell>
    );
  }
  if (!isAdmin) {
    return (
      <AdminShell>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Admin access required</h1>
          <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
              Admin
            </span>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl font-medium">Moving Companies</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {companies.filter((c) => c.status === "pending").length} awaiting approval ·{" "}
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

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => {
            const count =
              t.key === "all"
                ? companies.length
                : companies.filter((c) => c.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  tab === t.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {loading && companies.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-12">Loading…</div>
          )}
          {!loading && visible.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No companies in this view.
            </div>
          )}
          {visible.map((c) => (
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
                    <Badge variant="outline" className={STATUS_STYLE[c.status] ?? ""}>
                      {c.status === "pending" ? "pending approval" : c.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        c.license_status === "active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }
                    >
                      license: {c.license_status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    {(c.owner_first_name || c.owner_last_name) && (
                      <div>
                        Owner: {[c.owner_first_name, c.owner_last_name].filter(Boolean).join(" ")}
                      </div>
                    )}
                    {c.dot_number && <div>DOT #{c.dot_number}</div>}
                    {c.mc_number && <div>MC #{c.mc_number}</div>}
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {c.website && <div>{c.website}</div>}
                    {(c.address_city || c.address_state) && (
                      <div>
                        {[c.address_line1, c.address_city, c.address_state, c.address_zip]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                    {c.insurance_carrier && (
                      <div>
                        Insurance: {c.insurance_carrier}
                        {c.insurance_policy ? ` · ${c.insurance_policy}` : ""}
                        {c.insurance_expires ? ` · expires ${c.insurance_expires}` : ""}
                      </div>
                    )}
                    {(c.fleet_size || c.movers_count) && (
                      <div>
                        Fleet: {c.fleet_size ?? "—"} trucks · {c.movers_count ?? "—"} movers
                      </div>
                    )}
                    {c.service_states.length > 0 && (
                      <div>Serves: {c.service_states.join(", ")}</div>
                    )}
                    {(c.service_cities?.length ?? 0) > 0 && (
                      <div>Cities: {c.service_cities!.slice(0, 8).join(", ")}</div>
                    )}
                    {(c.services_offered?.length ?? 0) > 0 && (
                      <div>Services: {c.services_offered!.join(", ")}</div>
                    )}
                    {c.rating !== null && <div>★ {Number(c.rating).toFixed(1)}</div>}
                    {c.status === "rejected" && c.rejection_reason && (
                      <div className="text-rose-700">Rejected: {c.rejection_reason}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setReviewing(c)}>
                  <FileCheck2 className="mr-1.5 h-4 w-4" />
                  Review documents
                </Button>
                {c.status !== "approved" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => void changeStatus(c, "approved")}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {c.status === "suspended" || c.status === "rejected" ? "Restore" : "Approve"}
                  </Button>
                )}
                {c.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setRejecting(c)}>
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Reject
                  </Button>
                )}
                {c.status === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void changeStatus(c, "suspended")}
                  >
                    <PauseCircle className="mr-1.5 h-4 w-4" />
                    Suspend
                  </Button>
                )}
                {c.status === "suspended" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void changeStatus(c, "pending")}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Back to pending
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
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
                    if (
                      !confirm(
                        `Delete ${c.name}? All lead assignments for this company will be removed.`,
                      )
                    )
                      return;
                    await supabase.from("quote_assignments").delete().eq("company_id", c.id);
                    await supabase.from("company_members").delete().eq("company_id", c.id);
                    const { error } = await supabase
                      .from("moving_companies")
                      .delete()
                      .eq("id", c.id);
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
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

      {reviewing && (
        <Dialog open onOpenChange={(o) => !o && setReviewing(null)}>
          <CompanyDocumentsDialog company={reviewing} />
        </Dialog>
      )}

      {rejecting && (
        <Dialog open onOpenChange={(o) => !o && setRejecting(null)}>
          <RejectDialog
            company={rejecting}
            onReject={async (reason) => {
              await changeStatus(rejecting, "rejected", reason);
              setRejecting(null);
            }}
          />
        </Dialog>
      )}

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
          <AddMemberDialog company={addingMemberFor} onDone={() => setAddingMemberFor(null)} />
        </Dialog>
      )}
    </AdminShell>
  );
}

function CompanyFormDialog({ initial, onSaved }: { initial?: Company; onSaved: () => void }) {
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
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
        Enter the email of an existing Easy Moving account. They'll be granted the Moving Company
        role and linked to this company.
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
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type CompanyDoc = {
  id: string;
  kind: string;
  name: string;
  storage_path: string | null;
  external_url: string | null;
  size_bytes: number | null;
  created_at: string;
};

function CompanyDocumentsDialog({ company }: { company: Company }) {
  const [docs, setDocs] = useState<CompanyDoc[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("id, kind, name, storage_path, external_url, size_bytes, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setDocs((data ?? []) as CompanyDoc[]);
    })();
  }, [company.id]);

  async function open(d: CompanyDoc) {
    if (d.external_url) {
      window.open(d.external_url, "_blank");
      return;
    }
    if (!d.storage_path) return;
    const { data, error } = await supabase.storage
      .from("company-documents")
      .createSignedUrl(d.storage_path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open the document");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Documents — {company.name}</DialogTitle>
      </DialogHeader>
      {docs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {docs?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This company has not uploaded any documents yet.
        </p>
      )}
      <div className="grid gap-2">
        {(docs ?? []).map((d) => (
          <button
            key={d.id}
            onClick={() => void open(d)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm hover:border-primary/50"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{d.name}</span>
              <span className="text-xs text-muted-foreground">
                {d.kind} · {new Date(d.created_at).toLocaleDateString()}
              </span>
            </span>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </DialogContent>
  );
}

function RejectDialog({
  company,
  onReject,
}: {
  company: Company;
  onReject: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(company.rejection_reason ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Reject {company.name}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        The company keeps portal access and can correct its information and documents, then request
        a new review.
      </p>
      <div className="grid gap-2">
        <Label>Rejection reason</Label>
        <Textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Insurance certificate expired — please upload a current COI."
        />
      </div>
      <div className="flex justify-end">
        <Button
          disabled={busy || reason.trim().length < 5}
          onClick={async () => {
            setBusy(true);
            try {
              await onReject(reason.trim());
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Rejecting…" : "Reject application"}
        </Button>
      </div>
    </DialogContent>
  );
}
