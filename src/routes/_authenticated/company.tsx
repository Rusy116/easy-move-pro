import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CompanyShell } from "@/components/company/CompanyShell";
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
  Inbox, Lock, Globe, CheckCircle2, XCircle, Eye, Send, ShieldAlert,
} from "lucide-react";
import { StatCard, SkeletonRows } from "@/components/shell/Chrome";
import { SlaCountdown } from "@/components/admin/SlaCountdown";
import { LeadPhaseBadge } from "@/components/admin/LeadPhaseBadge";
import {
  moverOpenAssignment, moverMarkContacted, moverDecline, moverClaimOpenMarket,
} from "@/lib/mover.functions";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Moving Company Portal — Easy Moving" }] }),
  component: CompanyPortal,
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
  approved: boolean | null;
  suspended: boolean | null;
};

type MoverLead = {
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
  // masked fields (null when hidden)
  full_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  origin_address: string | null;
  destination_address: string | null;
};

type Assignment = {
  id: string;
  quote_id: string;
  company_id: string;
  state: "invited" | "active" | "quoted" | "accepted" | "won" | "lost" | "declined" | "withdrawn" | "expired";
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

type MergedLead = {
  lead: MoverLead;
  assignment: Assignment | null;
  bucket: "exclusive" | "active" | "open_market" | "won" | "lost";
};

const BUCKET_META: Record<MergedLead["bucket"], { label: string; icon: React.ReactNode; tone: string }> = {
  exclusive:   { label: "Exclusive",   icon: <Lock className="h-4 w-4" />,        tone: "text-indigo-800" },
  active:      { label: "Active",      icon: <ClipboardList className="h-4 w-4" />, tone: "text-blue-800" },
  open_market: { label: "Open market", icon: <Globe className="h-4 w-4" />,       tone: "text-amber-900" },
  won:         { label: "Won",         icon: <CheckCircle2 className="h-4 w-4" />, tone: "text-emerald-800" },
  lost:        { label: "Lost",        icon: <XCircle className="h-4 w-4" />,     tone: "text-rose-800" },
};

function customerName(l: MoverLead): string {
  return l.full_name?.trim() || "Customer (contact hidden)";
}

function CompanyPortal() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<MoverLead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<MergedLead["bucket"]>("exclusive");
  const [selected, setSelected] = useState<MergedLead | null>(null);
  const [estimateFor, setEstimateFor] = useState<MergedLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setLoading(false); return; }

    // Company (single row via RLS on company_members)
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
    // Prefer non-terminal, most recent
    const order = ["invited", "active", "quoted", "accepted", "won", "lost", "declined", "withdrawn", "expired"];
    for (const a of assignments) {
      const prev = byQuote.get(a.quote_id);
      if (!prev) { byQuote.set(a.quote_id, a); continue; }
      const isTerminal = (s: string) => ["won", "lost", "declined", "withdrawn", "expired"].includes(s);
      if (isTerminal(prev.state) && !isTerminal(a.state)) byQuote.set(a.quote_id, a);
      else if (order.indexOf(a.state) < order.indexOf(prev.state)) byQuote.set(a.quote_id, a);
    }

    const rows: MergedLead[] = [];
    for (const l of leads) {
      const a = byQuote.get(l.id) ?? null;
      let bucket: MergedLead["bucket"];
      if (a?.state === "won" || a?.state === "accepted") bucket = "won";
      else if (a && ["lost", "declined", "withdrawn", "expired"].includes(a.state)) bucket = "lost";
      else if (a?.is_exclusive && (a.state === "invited" || a.state === "active" || a.state === "quoted")) bucket = "exclusive";
      else if (a && (a.state === "invited" || a.state === "active" || a.state === "quoted")) bucket = "active";
      else if (l.lead_phase === "open_market") bucket = "open_market";
      else continue; // not visible / closed w/o our assignment
      rows.push({ lead: l, assignment: a, bucket });
    }
    return rows;
  }, [leads, assignments, company]);

  const counts = useMemo(() => {
    const c: Record<MergedLead["bucket"], number> = { exclusive: 0, active: 0, open_market: 0, won: 0, lost: 0 };
    for (const r of merged) c[r.bucket]++;
    return c;
  }, [merged]);

  const filtered = merged.filter((r) => r.bucket === tab);

  if (loading) {
    return (
      <CompanyShell>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="skeleton h-24 w-full" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
          </div>
          <div className="mt-6"><SkeletonRows n={4} /></div>
        </section>
      </CompanyShell>
    );
  }

  if (!company) {
    return (
      <CompanyShell>
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
      </CompanyShell>
    );
  }

  const suspended = company.suspended === true;
  const notApproved = company.approved === false;

  return (
    <CompanyShell>
      <div className="min-h-screen bg-gradient-to-b from-sage-soft/30 to-background">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-12">
          {/* Company header */}
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
            <Button variant="outline" size="sm" className="rounded-full justify-self-end" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
          </div>

          {(suspended || notApproved) && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              <div>
                {suspended
                  ? "Your company is suspended. You can view existing assignments but cannot claim new open-market leads."
                  : "Your company is pending approval. You can act on exclusive assignments, but claiming open-market leads is disabled until approval."}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(Object.keys(BUCKET_META) as MergedLead["bucket"][]).map((b) => {
              const meta = BUCKET_META[b];
              const active = tab === b;
              return (
                <button
                  key={b}
                  onClick={() => setTab(b)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ring-focus ${
                    active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {meta.icon}
                  {meta.label} · {counts[b]}
                </button>
              );
            })}
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Exclusive"    value={counts.exclusive}   tone="info"    icon={<Lock className="h-4 w-4" />} />
            <StatCard label="Active"       value={counts.active}                      icon={<ClipboardList className="h-4 w-4" />} />
            <StatCard label="Open market"  value={counts.open_market}                 icon={<Globe className="h-4 w-4" />} />
            <StatCard label="Won"          value={counts.won}         tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Lost"         value={counts.lost}                        icon={<XCircle className="h-4 w-4" />} />
          </div>

          {/* Lead list */}
          <div className="mt-6 space-y-3">
            {filtered.length === 0 && (
              <div className="card-premium p-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sage-soft text-sage">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="mt-3 font-serif text-lg">No {BUCKET_META[tab].label.toLowerCase()} leads</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "open_market"
                    ? "Open-market leads become visible after the exclusive SLA on a lead expires."
                    : "New leads assigned to your company will appear here instantly."}
                </p>
              </div>
            )}
            {filtered.map((r) => (
              <LeadCard
                key={r.lead.id}
                merged={r}
                onOpen={() => setSelected(r)}
                onEstimate={() => setEstimateFor(r)}
                canClaim={!suspended && !notApproved}
              />
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <LeadDetailDialog
          merged={selected}
          onClose={() => setSelected(null)}
          onReload={() => void load()}
          onEstimate={() => { setEstimateFor(selected); }}
          companyId={company.id}
          canClaim={!suspended && !notApproved}
        />
      )}
      {estimateFor && estimateFor.assignment && (
        <EstimateDialog
          merged={estimateFor}
          companyId={company.id}
          onClose={() => setEstimateFor(null)}
          onSubmitted={() => { setEstimateFor(null); void load(); }}
        />
      )}
    </CompanyShell>
  );
}

/* ================================================================== */
/*                           Card component                            */
/* ================================================================== */

function LeadCard({
  merged, onOpen, onEstimate, canClaim,
}: {
  merged: MergedLead;
  onOpen: () => void;
  onEstimate: () => void;
  canClaim: boolean;
}) {
  const { lead: l, assignment: a, bucket } = merged;
  const claimFn = useServerFn(moverClaimOpenMarket);
  const [claiming, setClaiming] = useState(false);

  async function claim() {
    setClaiming(true);
    try { await claimFn({ data: { quoteId: l.id } }); toast.success("Lead claimed"); onOpen(); }
    catch (e) { toast.error((e as Error).message); }
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
              {l.truck_size ?? "—"} · {l.num_movers ?? "?"} movers · {l.distance_miles ? `${l.distance_miles} mi` : ""}
            </div>
          </div>
          <div className="mt-1.5 text-sm font-medium text-foreground">
            Broker estimate: ${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bucket === "open_market" && !a && (
            <Button size="sm" onClick={() => void claim()} disabled={!canClaim || claiming}>
              {claiming ? "Claiming…" : "Claim lead"}
            </Button>
          )}
          {a && (bucket === "exclusive" || bucket === "active") && (
            <Button size="sm" variant="outline" onClick={onEstimate}>
              <Send className="mr-1.5 h-4 w-4" />Submit estimate
            </Button>
          )}
          <Button size="sm" onClick={onOpen}>Details</Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*                       Detail dialog                                 */
/* ================================================================== */

function LeadDetailDialog({
  merged, onClose, onReload, onEstimate, canClaim,
}: {
  merged: MergedLead;
  onClose: () => void;
  onReload: () => void;
  onEstimate: () => void;
  companyId: string;
  canClaim: boolean;
}) {
  const { lead: l, assignment: a, bucket } = merged;
  const [notes, setNotes] = useState(a?.notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const openFn      = useServerFn(moverOpenAssignment);
  const contactedFn = useServerFn(moverMarkContacted);
  const declineFn   = useServerFn(moverDecline);
  const claimFn     = useServerFn(moverClaimOpenMarket);

  // Mark viewed on open
  useEffect(() => {
    if (a && !a.viewed_at) { void openFn({ data: { assignmentId: a.id } }).catch(() => {}); }
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

        {/* Estimate */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Broker estimate</div>
          <div className="mt-1 font-serif text-2xl">
            ${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}
          </div>
          {a?.quoted_amount != null && (
            <div className="mt-1 text-sm text-emerald-900">Your last quote: <b>${Number(a.quoted_amount).toLocaleString()}</b></div>
          )}
        </div>

        {/* Contact (masked unless assignment grants access) */}
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
                Customer name, phone, email and street address are only revealed once you have an active assignment on this lead.
              </div>
            </div>
          </div>
        )}

        {/* Move meta */}
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

        {/* Inventory */}
        {l.inventory && l.inventory.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Inventory</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
              {l.inventory.map((it, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5">
                  <span className="font-semibold">{it.quantity}×</span>
                  <span className="text-muted-foreground">{it.id}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes + actions (assignment holders only) */}
        {a ? (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Your notes (private to your company)
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Call outcome, quote sent, follow-up date…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {showFullContact && l.contact_phone && (
                <Button asChild size="sm" variant="outline"><a href={`tel:${l.contact_phone}`}><Phone className="mr-1.5 h-4 w-4" />Call</a></Button>
              )}
              {showFullContact && l.contact_email && (
                <Button asChild size="sm" variant="outline"><a href={`mailto:${l.contact_email}`}><Mail className="mr-1.5 h-4 w-4" />Email</a></Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void saveNotes()} disabled={busy === "notes"}>Save notes</Button>
              {(a.state === "invited" || a.state === "active") && (
                <Button size="sm" onClick={() => void markContacted()} disabled={busy === "contacted"}>
                  <Phone className="mr-1.5 h-4 w-4" />Mark contacted
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onEstimate}>
                <Send className="mr-1.5 h-4 w-4" />Submit estimate
              </Button>
              {(a.state !== "won" && a.state !== "lost" && a.state !== "declined" && a.state !== "withdrawn" && a.state !== "expired") && (
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

            {(a.state === "invited" || a.state === "active") && (
              <div className="mt-4 rounded-lg border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decline lead</div>
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <Input
                    placeholder="Reason (optional)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    maxLength={200}
                    className="max-w-xs"
                  />
                  <Button size="sm" variant="destructive" onClick={() => void decline()} disabled={busy === "decline"}>
                    Decline
                  </Button>
                </div>
                {a.is_exclusive && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Declining an exclusive assignment releases this lead to the open market immediately.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : bucket === "open_market" ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm">This lead is open to all approved partners. Claim it to unlock full customer contact and submit your estimate.</p>
            <Button size="sm" className="mt-3" onClick={() => void claim()} disabled={!canClaim || busy === "claim"}>
              <Globe className="mr-1.5 h-4 w-4" />{busy === "claim" ? "Claiming…" : "Claim lead"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================== */
/*                       Estimate submission                            */
/* ================================================================== */

function EstimateDialog({
  merged, companyId, onClose, onSubmitted,
}: {
  merged: MergedLead;
  companyId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { lead: l, assignment: a } = merged;
  const [amount, setAmount] = useState<string>(String(Math.round((Number(l.estimated_low) + Number(l.estimated_high)) / 2)));
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!a) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
      toast.error("Enter a valid amount between $1 and $1,000,000");
      return;
    }
    setSaving(true);
    // Next revision number
    const { data: last } = await supabase
      .from("estimate_revisions").select("revision").eq("assignment_id", a.id)
      .order("revision", { ascending: false }).limit(1).maybeSingle();
    const nextRev = (last?.revision ?? 0) + 1;

    // Mark previous as not current
    if (nextRev > 1) {
      await supabase.from("estimate_revisions").update({ is_current: false }).eq("assignment_id", a.id).eq("is_current", true);
    }

    const { error } = await supabase.from("estimate_revisions").insert({
      assignment_id: a.id,
      quote_id: l.id,
      company_id: companyId,
      revision: nextRev,
      amount: value,
      currency: "USD",
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      notes: notes.trim() || null,
      is_current: true,
    });
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Advance assignment state → quoted (RLS allows own-company update)
    await supabase.from("quote_assignments").update({
      state: "quoted",
      quoted_at: new Date().toISOString(),
      quoted_amount: value,
    }).eq("id", a.id);

    setSaving(false);
    toast.success(`Estimate v${nextRev} submitted`);
    onSubmitted();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit estimate — {l.quote_number ?? l.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            Broker estimate: <b>${Number(l.estimated_low).toLocaleString()} – ${Number(l.estimated_high).toLocaleString()}</b>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="est-amount">Your quote (USD)</Label>
            <Input id="est-amount" type="number" min={1} max={1_000_000} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="est-valid">Valid until (optional)</Label>
            <Input id="est-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{display}</div>
    </div>
  );
}
