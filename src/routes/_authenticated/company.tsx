import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, Mail, MapPin, Calendar, RefreshCw, ArrowRight, Truck, ClipboardList } from "lucide-react";
import { StatCard, SkeletonRows } from "@/components/dashboard/DashboardChrome";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Moving Company Portal — Easy Moving" }] }),
  component: CompanyPortal,
});

const ASSIGN_STATUSES = ["assigned", "contacted", "quoted", "won", "lost"] as const;
type AssignStatus = (typeof ASSIGN_STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-800 border-blue-300",
  contacted: "bg-amber-100 text-amber-800 border-amber-300",
  quoted: "bg-purple-100 text-purple-800 border-purple-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
};

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
};

type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  status: string;
  notes: string | null;
  contacted_at: string | null;
  created_at: string;
  quote: {
    id: string;
    quote_number: string | null;
    created_at: string;
    origin_city: string | null;
    origin_zip: string;
    destination_city: string | null;
    destination_zip: string;
    move_date: string | null;
    preferred_time: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    estimated_low: number;
    estimated_high: number;
    property_type: string | null;
    details: Record<string, unknown> | null;
  } | null;
};

function CompanyPortal() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Assignment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    const { data: companies } = await supabase.from("moving_companies").select("*").limit(1);
    setCompany((companies?.[0] as Company) ?? null);

    const { data: rows, error } = await supabase
      .from("quote_assignments")
      .select(
        `id, quote_id, company_id, status, notes, contacted_at, created_at,
         quote:quotes ( id, quote_number, created_at, origin_city, origin_zip,
           destination_city, destination_zip, move_date, preferred_time,
           contact_phone, contact_email, estimated_low, estimated_high,
           property_type, details )`,
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setAssignments((rows ?? []) as unknown as Assignment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("company_assignments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quote_assignments" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  async function updateStatus(a: Assignment, next: AssignStatus) {
    const patch: { status: AssignStatus; contacted_at?: string } = { status: next };
    if (next === "contacted" && !a.contacted_at) patch.contacted_at = new Date().toISOString();
    const { error } = await supabase.from("quote_assignments").update(patch).eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${next}`);
    setAssignments((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, ...patch, status: next } : x)),
    );
    if (selected?.id === a.id) setSelected({ ...a, ...patch, status: next } as Assignment);
  }

  async function saveNotes(a: Assignment, notes: string) {
    const { error } = await supabase.from("quote_assignments").update({ notes }).eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssignments((prev) => prev.map((x) => (x.id === a.id ? { ...x, notes } : x)));
    toast.success("Notes saved");
  }

  const filtered = assignments.filter((a) =>
    filter === "all" ? true : a.status === filter,
  );

  if (loading) {
    return (
      <SiteLayout>
        <div className="p-16 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }

  if (!company) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-serif text-4xl">Company account required</h1>
          <p className="mt-4 text-muted-foreground">
            This portal is for moving companies partnered with Easy Moving. Your account
            isn't linked to a company yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact your Easy Moving administrator to get access.
          </p>
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

  const counts = ASSIGN_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = assignments.filter((a) => a.status === s).length;
    return acc;
  }, {});

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        {/* Company header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-14 w-14 rounded-xl object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 font-serif text-2xl text-primary">
                {company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-medium">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {company.dot_number && <span>DOT #{company.dot_number}</span>}
                {company.mc_number && <span>· MC #{company.mc_number}</span>}
                <Badge
                  variant="outline"
                  className={
                    company.license_status === "active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }
                >
                  {company.license_status}
                </Badge>
                {company.rating !== null && (
                  <span className="text-foreground">★ {Number(company.rating).toFixed(1)}</span>
                )}
              </div>
              {company.service_states.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Serves: {company.service_states.join(", ")}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>

        {/* Stat pills */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              filter === "all" ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="text-xs text-muted-foreground">All</div>
            <div className="font-semibold">{assignments.length}</div>
          </button>
          {ASSIGN_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-xl border px-3 py-2 text-left capitalize transition ${
                filter === s ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="text-xs text-muted-foreground">{s}</div>
              <div className="font-semibold">{counts[s] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Assignments */}
        <div className="mt-6 space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No leads {filter === "all" ? "yet" : `in "${filter}"`}. New leads assigned to
              you will appear here instantly.
            </div>
          )}
          {filtered.map((a) => {
            const q = a.quote;
            if (!q) return null;
            const name =
              (q.details as { fullName?: string } | null)?.fullName?.trim() || "Customer";
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-border bg-card p-4 md:p-5 hover:shadow-sm transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-medium">{name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.quote_number ?? q.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`capitalize ${STATUS_STYLES[a.status] ?? ""}`}
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {q.origin_city ?? q.origin_zip} → {q.destination_city ?? q.destination_zip}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {q.move_date ?? "TBD"} {q.preferred_time && `· ${q.preferred_time}`}
                      </div>
                      <div className="font-medium text-foreground">
                        ${Number(q.estimated_low).toLocaleString()} – $
                        {Number(q.estimated_high).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {q.contact_phone && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${q.contact_phone}`}>
                          <Phone className="mr-1.5 h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    )}
                    {q.contact_email && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${q.contact_email}`}>
                          <Mail className="mr-1.5 h-4 w-4" />
                          Email
                        </a>
                      </Button>
                    )}
                    <Select
                      value={a.status}
                      onValueChange={(v) => void updateStatus(a, v as AssignStatus)}
                    >
                      <SelectTrigger className="w-[140px] capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGN_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setSelected(a)}>
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selected && (
        <AssignmentDetail
          assignment={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onSaveNotes={saveNotes}
        />
      )}
    </SiteLayout>
  );
}

function AssignmentDetail({
  assignment,
  onClose,
  onStatusChange,
  onSaveNotes,
}: {
  assignment: Assignment;
  onClose: () => void;
  onStatusChange: (a: Assignment, s: AssignStatus) => Promise<void>;
  onSaveNotes: (a: Assignment, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(assignment.notes ?? "");
  const [saving, setSaving] = useState(false);
  const q = assignment.quote;
  if (!q) return null;
  const details = (q.details as Record<string, unknown> | null) ?? {};
  const name = (details.fullName as string | undefined)?.trim() || "Customer";

  async function handleSave() {
    setSaving(true);
    await onSaveNotes(assignment, notes);
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>{name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {q.quote_number ?? q.id.slice(0, 8)}
            </span>
            <Badge
              variant="outline"
              className={`capitalize ${STATUS_STYLES[assignment.status] ?? ""}`}
            >
              {assignment.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Estimated cost
          </div>
          <div className="mt-1 font-serif text-2xl">
            ${Number(q.estimated_low).toLocaleString()} – $
            {Number(q.estimated_high).toLocaleString()}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Info label="Move date" value={q.move_date} />
          <Info label="Preferred time" value={q.preferred_time} />
          <Info label="Property" value={q.property_type} />
          <Info label="Phone" value={q.contact_phone} />
          <Info label="Email" value={q.contact_email} />
          <Info
            label="Contact method"
            value={(details.contactMethod as string) ?? null}
          />
          <Info label="Origin" value={`${q.origin_city ?? ""} ${q.origin_zip}`.trim()} />
          <Info
            label="Destination"
            value={`${q.destination_city ?? ""} ${q.destination_zip}`.trim()}
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Your notes (private to your company)
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Call outcome, quote sent, follow-up date…"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Select
              value={assignment.status}
              onValueChange={(v) => void onStatusChange(assignment, v as AssignStatus)}
            >
              <SelectTrigger className="w-[160px] capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
