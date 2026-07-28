import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Phone, Mail, MapPin, Calendar, RefreshCw, Truck, ClipboardList,
  Lock, Globe, CheckCircle2, XCircle, Eye, Send, ShieldAlert,
} from "lucide-react";
import { SlaCountdown } from "@/components/admin/SlaCountdown";
import { LeadPhaseBadge } from "@/components/admin/LeadPhaseBadge";
import {
  moverOpenAssignment, moverMarkContacted, moverDecline, moverClaimOpenMarket,
} from "@/lib/mover.functions";

/* ================================================================== */
/*                              Types                                  */
/* ================================================================== */

export type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  dot_number: string | null;
  mc_number: string | null;
  service_states: string[] | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  license_status: string;
  approved: boolean | null;
  status: "pending" | "approved" | "rejected" | "suspended" | null;
  rejection_reason: string | null;
  suspended: boolean | null;
  settings: Record<string, unknown> | null;
};

export type MoverLead = {
  id: string;
  quote_number: string | null;
  lead_phase: "unassigned" | "exclusive" | "open_market" | "closed";
  move_type: string | null;
  move_date: string | null;
  preferred_time: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_zip: string;
  destination_city: string | null;
  destination_state: string | null;
  destination_zip: string;
  distance_miles: number | null;
  estimated_cubic_feet: number | null;
  estimated_weight_lbs: number | null;
  truck_size: string | null;
  num_movers: number | null;
  property_type: string | null;
  origin_stairs: number | null;
  origin_elevator: boolean | null;
  destination_stairs: number | null;
  destination_elevator: boolean | null;
  origin_long_carry: boolean | null;
  destination_long_carry: boolean | null;
  packing: boolean | null;
  storage: boolean | null;
  assembly: boolean | null;
  heavy_items: boolean | null;
  piano: boolean | null;
  insurance_tier: string | null;
  inventory: Array<{ id: string; quantity: number }> | null;
  estimated_low: number;
  estimated_high: number;
  exclusive_expires_at: string | null;
  exclusive_paused_at: string | null;
  open_market_opened_at: string | null;
  created_at: string;
  full_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  origin_address: string | null;
  destination_address: string | null;
};

export type AssignmentState =
  | "invited" | "active" | "quoted" | "accepted"
  | "won" | "lost" | "declined" | "withdrawn" | "expired";

export type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  state: AssignmentState;
  is_exclusive: boolean;
  invited_at: string;
  viewed_at: string | null;
  contacted_at: string | null;
  quoted_at: string | null;
  closed_at: string | null;
  sla_due_at: string | null;
  notes: string | null;
  quoted_amount: number | null;
  decline_reason: string | null;
};

export type Bucket = "exclusive" | "active" | "open_market" | "won" | "lost";

export type MergedLead = {
  lead: MoverLead;
  assignment: Assignment | null;
  bucket: Bucket;
};

/* ================================================================== */
/*                           useMoverPortal                            */
/* ================================================================== */

const TERMINAL: AssignmentState[] = ["won", "lost", "declined", "withdrawn", "expired"];
const ORDER: AssignmentState[] = [
  "invited", "active", "quoted", "accepted", "won", "lost", "declined", "withdrawn", "expired",
];

export function useMoverPortal() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<MoverLead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }

    const { data: companies } = await supabase.from("moving_companies").select("*").limit(1);
    const co = (companies?.[0] as Company) ?? null;
    setCompany(co);
    if (!co) { setLeads([]); setAssignments([]); setLoading(false); return; }

    const [{ data: viewRows, error: e1 }, { data: assignRows, error: e2 }] = await Promise.all([
      supabase.from("mover_lead_view").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("quote_assignments").select("*").eq("company_id", co.id).order("created_at", { ascending: false }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setLeads((viewRows ?? []) as MoverLead[]);
    setAssignments((assignRows ?? []) as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("mover_portal")
      .on("postgres_changes", { event: "*", schema: "public", table: "quote_assignments" }, () => void load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" },       () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const merged: MergedLead[] = useMemo(() => {
    if (!company) return [];
    const byQuote = new Map<string, Assignment>();
    for (const a of assignments) {
      const prev = byQuote.get(a.quote_id);
      if (!prev) { byQuote.set(a.quote_id, a); continue; }
      const isT = (s: AssignmentState) => TERMINAL.includes(s);
      if (isT(prev.state) && !isT(a.state)) byQuote.set(a.quote_id, a);
      else if (ORDER.indexOf(a.state) < ORDER.indexOf(prev.state)) byQuote.set(a.quote_id, a);
    }
    const rows: MergedLead[] = [];
    for (const l of leads) {
      const a = byQuote.get(l.id) ?? null;
      let bucket: Bucket;
      if (a?.state === "won" || a?.state === "accepted") bucket = "won";
      else if (a && ["lost", "declined", "withdrawn", "expired"].includes(a.state)) bucket = "lost";
      else if (a?.is_exclusive && (a.state === "invited" || a.state === "active" || a.state === "quoted")) bucket = "exclusive";
      else if (a && (a.state === "invited" || a.state === "active" || a.state === "quoted")) bucket = "active";
      else if (l.lead_phase === "open_market") bucket = "open_market";
      else continue;
      rows.push({ lead: l, assignment: a, bucket });
    }
    return rows;
  }, [leads, assignments, company]);

  const canClaim = !!company && company.suspended !== true && company.approved !== false;

  return { loading, company, merged, reload: load, canClaim };
}

/* ================================================================== */
/*                            Helpers                                  */
/* ================================================================== */

export function customerName(l: MoverLead): string {
  return l.full_name?.trim() || "Customer (contact hidden)";
}

export const BUCKET_META: Record<Bucket, { label: string; icon: React.ReactNode }> = {
  exclusive:   { label: "Exclusive",   icon: <Lock className="h-4 w-4" /> },
  active:      { label: "Active",      icon: <ClipboardList className="h-4 w-4" /> },
  open_market: { label: "Open market", icon: <Globe className="h-4 w-4" /> },
  won:         { label: "Won",         icon: <CheckCircle2 className="h-4 w-4" /> },
  lost:        { label: "Lost",        icon: <XCircle className="h-4 w-4" /> },
};

export type LeadStatusTab = "new" | "contacted" | "estimate_sent" | "scheduled" | "won" | "lost" | "completed";

export function statusTabOf(r: MergedLead): LeadStatusTab | null {
  const a = r.assignment;
  if (!a) return null;
  const md = r.lead.move_date ? new Date(r.lead.move_date).getTime() : null;
  const inFuture = md != null && md >= Date.now() - 24 * 60 * 60 * 1000;
  if (a.state === "won") return "completed";
  if (a.state === "accepted") return inFuture ? "scheduled" : "won";
  if (["lost", "declined", "withdrawn", "expired"].includes(a.state)) return "lost";
  if (a.state === "quoted") return "estimate_sent";
  if (a.contacted_at) return "contacted";
  if (a.state === "invited" || a.state === "active") return "new";
  return null;
}

/* ================================================================== */
/*                          CompanyHeader                              */
/* ================================================================== */

export function CompanyHeader({
  company, onRefresh,
}: { company: Company; onRefresh?: () => void }) {
  return (
    <div className="card-premium grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 sm:p-6 animate-fade-in-soft">
      <div className="flex min-w-0 items-center gap-4">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-border" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sage to-ochre font-serif text-2xl text-primary-foreground shadow-sm">
            {company.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ochre">
            Moving company portal
          </div>
          <h1 className="mt-0.5 truncate font-serif text-2xl md:text-3xl font-medium">{company.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {company.dot_number && <span>DOT #{company.dot_number}</span>}
            {company.mc_number && <span>· MC #{company.mc_number}</span>}
            <Badge variant="outline" className={company.license_status === "active" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"}>
              {company.license_status}
            </Badge>
            {company.rating !== null && <span className="text-foreground font-medium">★ {Number(company.rating).toFixed(1)}</span>}
          </div>
        </div>
      </div>
      {onRefresh && (
        <Button variant="outline" size="sm" className="rounded-full justify-self-end" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      )}
    </div>
  );
}

export function StatusBanner({ company }: { company: Company }) {
  const suspended = company.suspended === true;
  const notApproved = company.approved === false;
  if (!suspended && !notApproved) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
      <ShieldAlert className="h-4 w-4 mt-0.5" />
      <div>
        {suspended
          ? "Your company is suspended. You can view existing assignments but cannot claim new open-market leads."
          : "Your company is pending approval. You can act on exclusive assignments, but claiming open-market leads is disabled until approval."}
      </div>
    </div>
  );
}

/* ================================================================== */
/*                            LeadCard                                 */
/* ================================================================== */

export function LeadCard({
  merged, onOpen, onEstimate, canClaim, onClaimed,
}: {
  merged: MergedLead;
  onOpen: () => void;
  onEstimate: () => void;
  canClaim: boolean;
  onClaimed?: () => void;
}) {
  const { lead: l, assignment: a, bucket } = merged;
  const claimFn = useServerFn(moverClaimOpenMarket);
  const [claiming, setClaiming] = useState(false);

  async function claim() {
    setClaiming(true);
    try {
      await claimFn({ data: { quoteId: l.id } });
      toast.success("Lead claimed");
      onClaimed?.();
      onOpen();
    } catch (e) { toast.error((e as Error).message); }
    finally { setClaiming(false); }
  }

  const showPii = !!l.full_name || !!l.contact_phone || !!l.contact_email;

  return (
    <div className="card-premium card-premium-hover p-4 md:p-5 animate-fade-in-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-lg font-medium">{customerName(l)}</span>
            <span className="font-mono text-xs text-muted-foreground">{l.quote_number ?? l.id.slice(0, 8)}</span>
            <LeadPhaseBadge phase={l.lead_phase} />
            {a?.is_exclusive && bucket === "exclusive" && (
              <SlaCountdown expiresAt={l.exclusive_expires_at} pausedAt={l.exclusive_paused_at} compact />
            )}
            {a && <Badge variant="outline" className="capitalize">{a.state}</Badge>}
            {!showPii && bucket !== "won" && (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 gap-1">
                <Eye className="h-3 w-3" />Contact hidden
              </Badge>
            )}
          </div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {(l.origin_city ?? l.origin_zip)}{l.origin_state ? `, ${l.origin_state}` : ""} → {(l.destination_city ?? l.destination_zip)}{l.destination_state ? `, ${l.destination_state}` : ""}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {l.move_date ?? "TBD"}{l.preferred_time ? ` · ${l.preferred_time}` : ""}
            </div>
            <div className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              {l.truck_size ?? "—"} · {l.num_movers ?? "?"} movers{l.distance_miles ? ` · ${l.distance_miles} mi` : ""}
            </div>
            {(l.estimated_cubic_feet || l.estimated_weight_lbs) && (
              <div className="text-xs">
                {l.estimated_cubic_feet ? `${l.estimated_cubic_feet} cu ft` : ""}
                {l.estimated_cubic_feet && l.estimated_weight_lbs ? " · " : ""}
                {l.estimated_weight_lbs ? `${l.estimated_weight_lbs} lbs` : ""}
              </div>
            )}
          </div>
          <div className="mt-1.5 text-sm font-medium text-foreground">
            Broker estimate: ${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showPii && l.contact_phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${l.contact_phone}`}><Phone className="mr-1.5 h-4 w-4" />Call</a>
            </Button>
          )}
          {showPii && l.contact_email && (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${l.contact_email}`}><Mail className="mr-1.5 h-4 w-4" />Email</a>
            </Button>
          )}
          {bucket === "open_market" && !a && (
            <Button size="sm" onClick={() => void claim()} disabled={!canClaim || claiming}>
              {claiming ? "Claiming…" : "Claim lead"}
            </Button>
          )}
          {a && (bucket === "exclusive" || bucket === "active") && (
            <Button size="sm" variant="outline" onClick={onEstimate}>
              <Send className="mr-1.5 h-4 w-4" />Send estimate
            </Button>
          )}
          <Button size="sm" onClick={onOpen}>View</Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*                        LeadDetailDialog                             */
/* ================================================================== */

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{display}</div>
    </div>
  );
}

export function LeadDetailDialog({
  merged, onClose, onReload, onEstimate, canClaim,
}: {
  merged: MergedLead;
  onClose: () => void;
  onReload: () => void;
  onEstimate: () => void;
  canClaim: boolean;
}) {
  const { lead: l, assignment: a, bucket } = merged;
  const [notes, setNotes] = useState(a?.notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [tab, setTab] = useState<"profile" | "inventory" | "estimate" | "notes" | "timeline">("profile");
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; actor_type: string; created_at: string }>>([]);
  const [revisions, setRevisions] = useState<Array<{ id: string; revision: number; amount: number; submitted_at: string; is_current: boolean; notes: string | null; breakdown: Record<string, unknown> | null }>>([]);

  const openFn      = useServerFn(moverOpenAssignment);
  const contactedFn = useServerFn(moverMarkContacted);
  const declineFn   = useServerFn(moverDecline);
  const claimFn     = useServerFn(moverClaimOpenMarket);

  useEffect(() => {
    if (a && !a.viewed_at) { void openFn({ data: { assignmentId: a.id } }).catch(() => {}); }
    // Load timeline + estimate revisions for this quote
    void supabase.from("lead_events")
      .select("id,event_type,actor_type,created_at")
      .eq("quote_id", l.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setEvents((data ?? []) as typeof events));
    if (a) {
      void supabase.from("estimate_revisions")
        .select("*")
        .eq("assignment_id", a.id)
        .order("revision", { ascending: false })
        .then(({ data }) => setRevisions((data ?? []) as typeof revisions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markContacted() {
    if (!a) return;
    setBusy("contacted");
    try { await contactedFn({ data: { assignmentId: a.id, notes: notes.trim() || undefined } }); toast.success("Marked contacted"); onReload(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function decline() {
    if (!a) return;
    setBusy("decline");
    try { await declineFn({ data: { assignmentId: a.id, reason: declineReason.trim() || undefined } }); toast.success("Declined"); onClose(); onReload(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function claim() {
    setBusy("claim");
    try { await claimFn({ data: { quoteId: l.id } }); toast.success("Lead claimed"); onReload(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  async function saveNotes() {
    if (!a) return;
    setBusy("notes");
    const { error } = await supabase.from("quote_assignments").update({ notes }).eq("id", a.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Notes saved"); onReload(); }
  }
  async function markWon() {
    if (!a) return;
    setBusy("won");
    const { error } = await supabase.from("quote_assignments").update({ state: "won", won_at: new Date().toISOString(), closed_at: new Date().toISOString() }).eq("id", a.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Marked won"); onReload(); onClose(); }
  }
  async function markLost() {
    if (!a) return;
    setBusy("lost");
    const { error } = await supabase.from("quote_assignments").update({ state: "lost", lost_at: new Date().toISOString(), closed_at: new Date().toISOString() }).eq("id", a.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Marked lost"); onReload(); onClose(); }
  }

  const showFullContact = a && !!(l.full_name || l.contact_phone || l.contact_email);
  const TABS: Array<{ id: typeof tab; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "inventory", label: "Inventory" },
    { id: "estimate", label: "Estimate" },
    { id: "notes", label: "Notes" },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>{customerName(l)}</span>
            <span className="font-mono text-xs text-muted-foreground">{l.quote_number ?? l.id.slice(0, 8)}</span>
            <LeadPhaseBadge phase={l.lead_phase} />
            {a?.is_exclusive && bucket === "exclusive" && (
              <SlaCountdown expiresAt={l.exclusive_expires_at} pausedAt={l.exclusive_paused_at} />
            )}
            {a && <Badge variant="outline" className="capitalize">{a.state}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Broker estimate</div>
          <div className="mt-1 font-serif text-2xl">
            ${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}
          </div>
          {a?.quoted_amount != null && (
            <div className="mt-1 text-sm text-emerald-900">Your last quote: <b>${Number(a.quoted_amount).toLocaleString()}</b></div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div className="space-y-4">
            {showFullContact ? (
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Info label="Customer"  value={l.full_name} />
                <Info label="Phone"     value={l.contact_phone} />
                <Info label="Email"     value={l.contact_email} />
                <Info label="Move date" value={l.move_date} />
                <Info label="Preferred time" value={l.preferred_time} />
                <Info label="Property"  value={l.property_type} />
                <Info label="Origin address"      value={l.origin_address} />
                <Info label="Destination address" value={l.destination_address} />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 flex items-start gap-2">
                <Eye className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium">Contact details are hidden</div>
                  <div className="text-slate-600">
                    Customer name, phone, email and street address are revealed once you have an active assignment.
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
              <Info label="Route" value={`${l.origin_city ?? l.origin_zip} → ${l.destination_city ?? l.destination_zip}`} />
              <Info label="Distance" value={l.distance_miles ? `${l.distance_miles} mi` : null} />
              <Info label="Truck / crew" value={`${l.truck_size ?? "—"} · ${l.num_movers ?? "?"} movers`} />
              <Info label="Cubic feet" value={l.estimated_cubic_feet} />
              <Info label="Weight (lbs)" value={l.estimated_weight_lbs} />
              <Info label="Insurance" value={l.insurance_tier} />
              <Info label="Packing"  value={l.packing ? "Yes" : "No"} />
              <Info label="Storage"  value={l.storage ? "Yes" : "No"} />
              <Info label="Assembly" value={l.assembly ? "Yes" : "No"} />
              <Info label="Heavy items" value={l.heavy_items ? "Yes" : "No"} />
              <Info label="Origin stairs / elev." value={`${l.origin_stairs ?? 0} · ${l.origin_elevator ? "elev" : "no elev"}${l.origin_long_carry ? " · long carry" : ""}`} />
              <Info label="Dest stairs / elev." value={`${l.destination_stairs ?? 0} · ${l.destination_elevator ? "elev" : "no elev"}${l.destination_long_carry ? " · long carry" : ""}`} />
            </div>
          </div>
        )}

        {tab === "inventory" && (
          l.inventory && l.inventory.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
              {l.inventory.map((it, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5">
                  <span className="font-semibold">{it.quantity}×</span>
                  <span className="text-muted-foreground">{it.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground p-6 text-center">No inventory items recorded.</div>
          )
        )}

        {tab === "estimate" && (
          <div className="space-y-3">
            {revisions.length === 0 && (
              <div className="text-sm text-muted-foreground p-6 text-center">No estimates submitted yet.</div>
            )}
            {revisions.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">v{r.revision}</span>
                    {r.is_current && <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-300" variant="outline">Current</Badge>}
                  </div>
                  <div className="font-serif text-lg">${Number(r.amount).toLocaleString()}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</div>
                {r.notes && <div className="mt-1.5 text-sm">{r.notes}</div>}
              </div>
            ))}
            {a && (
              <Button size="sm" onClick={onEstimate} className="w-full">
                <Send className="mr-1.5 h-4 w-4" />New estimate revision
              </Button>
            )}
          </div>
        )}

        {tab === "notes" && (
          a ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your private notes
              </div>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} maxLength={2000} placeholder="Call outcome, quote sent, follow-up date…" />
              <Button size="sm" variant="outline" onClick={() => void saveNotes()} disabled={busy === "notes"}>Save notes</Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-6 text-center">Claim this lead to add private notes.</div>
          )
        )}

        {tab === "timeline" && (
          <ol className="space-y-2 text-sm">
            {events.length === 0 && <li className="text-muted-foreground text-center p-6">No timeline events yet.</li>}
            {events.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-border bg-card/40 px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">{ev.event_type.replace(/\./g, " ")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">by {ev.actor_type}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Actions */}
        {a && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {(a.state === "invited" || a.state === "active") && (
              <Button size="sm" onClick={() => void markContacted()} disabled={busy === "contacted"}>
                <Phone className="mr-1.5 h-4 w-4" />Mark contacted
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEstimate}>
              <Send className="mr-1.5 h-4 w-4" />Send estimate
            </Button>
            {!TERMINAL.includes(a.state) && (
              <>
                <Button size="sm" variant="outline" className="text-emerald-800" onClick={() => void markWon()} disabled={busy === "won"}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />Mark won
                </Button>
                <Button size="sm" variant="outline" className="text-rose-800" onClick={() => void markLost()} disabled={busy === "lost"}>
                  <XCircle className="mr-1.5 h-4 w-4" />Mark lost
                </Button>
              </>
            )}
          </div>
        )}

        {a && (a.state === "invited" || a.state === "active") && (
          <div className="mt-4 rounded-lg border border-border p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decline lead</div>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <Input placeholder="Reason (optional)" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} maxLength={200} className="max-w-xs" />
              <Button size="sm" variant="destructive" onClick={() => void decline()} disabled={busy === "decline"}>Decline</Button>
            </div>
            {a.is_exclusive && (
              <p className="mt-1 text-xs text-muted-foreground">
                Declining an exclusive assignment releases this lead to the open market immediately.
              </p>
            )}
          </div>
        )}

        {!a && bucket === "open_market" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm">This lead is open to all approved partners. Claim it to unlock customer contact and submit your estimate.</p>
            <Button size="sm" className="mt-3" onClick={() => void claim()} disabled={!canClaim || busy === "claim"}>
              <Globe className="mr-1.5 h-4 w-4" />{busy === "claim" ? "Claiming…" : "Claim lead"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*                       EstimateBuilderDialog                          */
/* ================================================================== */

type BreakdownKey = "labor" | "truck" | "travel" | "packing" | "supplies" | "storage" | "fuel" | "additional" | "tax" | "discount";
const BREAKDOWN_FIELDS: Array<{ key: BreakdownKey; label: string; sign: 1 | -1 }> = [
  { key: "labor",      label: "Labor",             sign: 1 },
  { key: "truck",      label: "Truck",             sign: 1 },
  { key: "travel",     label: "Travel",            sign: 1 },
  { key: "packing",    label: "Packing",           sign: 1 },
  { key: "supplies",   label: "Supplies",          sign: 1 },
  { key: "storage",    label: "Storage",           sign: 1 },
  { key: "fuel",       label: "Fuel",              sign: 1 },
  { key: "additional", label: "Additional charges", sign: 1 },
  { key: "tax",        label: "Tax",               sign: 1 },
  { key: "discount",   label: "Discount",          sign: -1 },
];

export function EstimateBuilderDialog({
  merged, companyId, onClose, onSubmitted,
}: {
  merged: MergedLead;
  companyId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { lead: l, assignment: a } = merged;
  const [values, setValues] = useState<Record<BreakdownKey, string>>(() => {
    const mid = Math.round((Number(l.estimated_low) + Number(l.estimated_high)) / 2);
    return {
      labor: String(Math.round(mid * 0.55)),
      truck: String(Math.round(mid * 0.15)),
      travel: String(Math.round(mid * 0.10)),
      packing: "0",
      supplies: "0",
      storage: "0",
      fuel: String(Math.round(mid * 0.05)),
      additional: "0",
      tax: "0",
      discount: "0",
    };
  });
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => {
    let t = 0;
    for (const f of BREAKDOWN_FIELDS) {
      const v = Number(values[f.key]);
      if (Number.isFinite(v)) t += f.sign * v;
    }
    return Math.max(0, t);
  }, [values]);

  async function submit() {
    if (!a) return;
    if (!Number.isFinite(total) || total <= 0 || total > 1_000_000) {
      toast.error("Total must be between $1 and $1,000,000"); return;
    }
    setSaving(true);
    const { data: last } = await supabase
      .from("estimate_revisions").select("revision").eq("assignment_id", a.id)
      .order("revision", { ascending: false }).limit(1).maybeSingle();
    const nextRev = (last?.revision ?? 0) + 1;
    if (nextRev > 1) {
      await supabase.from("estimate_revisions").update({ is_current: false }).eq("assignment_id", a.id).eq("is_current", true);
    }
    const breakdown: Record<string, number> = {};
    for (const f of BREAKDOWN_FIELDS) breakdown[f.key] = Number(values[f.key]) || 0;

    const { error } = await supabase.from("estimate_revisions").insert({
      assignment_id: a.id,
      quote_id: l.id,
      company_id: companyId,
      revision: nextRev,
      amount: total,
      currency: "USD",
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      notes: notes.trim() || null,
      breakdown,
      is_current: true,
    });
    if (error) { setSaving(false); toast.error(error.message); return; }

    await supabase.from("quote_assignments").update({
      state: "quoted",
      quoted_at: new Date().toISOString(),
      quoted_amount: total,
    }).eq("id", a.id);

    setSaving(false);
    toast.success(`Estimate v${nextRev} submitted`);
    onSubmitted();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estimate builder — {l.quote_number ?? l.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            Broker estimate: <b>${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}</b>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BREAKDOWN_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`est-${f.key}`} className="text-xs">
                  {f.label} {f.sign < 0 && <span className="text-rose-700">(–)</span>}
                </Label>
                <Input
                  id={`est-${f.key}`}
                  type="number"
                  min={0}
                  step={1}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Total</span>
            <span className="font-serif text-2xl">${total.toLocaleString()}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="est-valid">Valid until (optional)</Label>
              <Input id="est-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="est-notes">Notes for broker (optional)</Label>
            <Textarea id="est-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope assumptions, add-ons, availability…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Submitting…" : "Submit estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*                        NoCompany fallback                            */
/* ================================================================== */

export function NoCompanyScreen() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">Company account required</h1>
      <p className="mt-4 text-muted-foreground">
        This portal is for moving companies partnered with Easy Moving. Your account
        isn't linked to a company yet.
      </p>
      <Link to="/dashboard" className="mt-6 inline-block text-primary hover:underline">
        ← Back to dashboard
      </Link>
    </section>
  );
}
