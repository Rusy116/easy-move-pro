import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, StickyNote, Clock, ExternalLink, Building2, User, Package, MapPin, EyeOff, PauseCircle, PlayCircle, XCircle, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { AssignCompanies } from "./AssignCompanies";
import { BrokerSelect, assignBroker } from "./BrokerSelect";
import { SlaCountdown } from "./SlaCountdown";
import { LeadPhaseBadge } from "./LeadPhaseBadge";
import { LeadEventsTimeline } from "./LeadEventsTimeline";
import { pauseSla, resumeSla, extendSla, closeLead } from "@/lib/leads.functions";
import { LeadWorkflowActions } from "./LeadWorkflow";


export const LEAD_STATUSES = ["new", "contacted", "scheduled", "accepted", "won", "lost", "cancelled"] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-300",
  contacted: "bg-amber-100 text-amber-800 border-amber-300",
  scheduled: "bg-purple-100 text-purple-800 border-purple-300",
  accepted: "bg-teal-100 text-teal-800 border-teal-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

type Note = { id: string; quote_id: string; body: string; author_email: string | null; created_at: string };
type History = { id: string; quote_id: string; from_status: string | null; to_status: string; changed_by_email: string | null; created_at: string };

type Quote = {
  id: string;
  quote_number: string | null;
  portal_token: string | null;
  status: string;
  accepted_at: string | null;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  origin_zip: string;
  origin_city: string | null;
  origin_state: string | null;
  origin_address: string | null;
  destination_zip: string;
  destination_city: string | null;
  destination_state: string | null;
  destination_address: string | null;
  move_date: string | null;
  preferred_time: string | null;
  property_type: string | null;
  move_type: string | null;
  distance_miles: number | null;
  estimated_low: number;
  estimated_high: number;
  estimated_cubic_feet: number | null;
  estimated_weight_lbs: number | null;
  truck_size: string | null;
  num_movers: number | null;
  labor_hours: number | null;
  insurance_tier: string | null;
  origin_stairs: number;
  origin_elevator: boolean;
  destination_stairs: number;
  destination_elevator: boolean;
  assigned_broker_id: string | null;
  details: Record<string, unknown> | null;
  inventory: Array<{ id: string; quantity: number }>;
  breakdown: Array<{ label: string; amount: number }>;
  lead_phase: string | null;
  exclusive_expires_at: string | null;
  exclusive_paused_at: string | null;
  exclusive_pause_reason: string | null;
  visibility_mask: Record<string, boolean> | null;
  closed_reason: string | null;
  job_status?: string | null;
  lead_status?: string | null;
};



function getCustomerName(q: Quote): string {
  const d = q.details as { fullName?: string } | null;
  return d?.fullName?.trim() || "—";
}

export function LeadDetailPanel({
  quote,
  onClose,
  onStatusChange,
}: {
  quote: Quote | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void | Promise<void>;
}) {
  const [lastQuote, setLastQuote] = useState<Quote | null>(quote);
  useEffect(() => {
    if (quote) setLastQuote(quote);
  }, [quote]);
  const q = quote ?? lastQuote;

  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [qualifying, setQualifying] = useState(false);

  const [brokerId, setBrokerId] = useState<string | null>(q?.assigned_broker_id ?? null);

  useEffect(() => {
    setBrokerId(q?.assigned_broker_id ?? null);
  }, [q?.id, q?.assigned_broker_id]);

  useEffect(() => {
    if (!q) return;
    const qid = q.id;
    void (async () => {
      const [{ data: n }, { data: h }] = await Promise.all([
        supabase.from("quote_notes").select("*").eq("quote_id", qid).order("created_at", { ascending: false }),
        supabase.from("quote_status_history").select("*").eq("quote_id", qid).order("created_at", { ascending: false }),
      ]);
      setNotes((n as Note[]) ?? []);
      setHistory((h as History[]) ?? []);
    })();

    const channel = supabase
      .channel(`quote-${qid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_notes", filter: `quote_id=eq.${qid}` },
        (p) => setNotes((prev) => [p.new as Note, ...prev]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quote_status_history", filter: `quote_id=eq.${qid}` },
        (p) => setHistory((prev) => [p.new as History, ...prev]))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [q?.id]);

  const inventory = useMemo(() => q?.inventory ?? [], [q]);
  const breakdown = useMemo(() => q?.breakdown ?? [], [q]);

  const doPause = useServerFn(pauseSla);
  const doResume = useServerFn(resumeSla);
  const doExtend = useServerFn(extendSla);
  const doClose = useServerFn(closeLead);

  if (!q) return null;
  const details = q.details ?? {};
  const phone = q.contact_phone ?? "";
  const email = q.contact_email ?? "";

  async function addNote() {
    if (!q || !newNote.trim()) return;
    const currentQ = q;
    setSavingNote(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("quote_notes").insert({
      quote_id: currentQ.id,
      body: newNote.trim(),
      author_id: userData.user?.id ?? null,
      author_email: userData.user?.email ?? null,
    });
    setSavingNote(false);
    if (error) return toast.error(error.message);
    setNewNote("");
    toast.success("Note added");
  }

  async function onBrokerChange(v: string | null) {
    if (!q) return;
    setBrokerId(v);
    await assignBroker(q.id, v);
  }



  async function qualifyLead(quoteId: string) {
    setQualifying(true);
    const { error } = await supabase.rpc("fn_broker_qualify_lead", { _quote_id: quoteId });
    setQualifying(false);
    if (error) return toast.error(error.message);
    toast.success("Lead qualified — now visible to all approved moving companies.");
  }

  async function runEngine(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }


  return (
    <Sheet open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <button
          type="button"
          onClick={() => onClose()}
          aria-label="Close panel"
          className="absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 pr-16">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-3">
              <span className="text-xl">{getCustomerName(q)}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {q.quote_number ?? q.id.slice(0, 8)}
              </span>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[q.status] ?? ""}`}>
                {q.status}
              </Badge>
              {q.accepted_at && (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-600/30">Accepted</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lead workflow
            </div>
            <LeadWorkflowActions quoteId={q.id} status={q.lead_status} />
          </div>



          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" disabled={!phone}>
              <a href={phone ? `tel:${phone}` : undefined}><Phone className="mr-2 h-4 w-4" />Call</a>
            </Button>
            <Button asChild size="sm" variant="outline" disabled={!email}>
              <a href={email ? `mailto:${email}?subject=Your%20Easy%20Moving%20Quote%20${q.quote_number ?? ""}` : undefined}>
                <Mail className="mr-2 h-4 w-4" />Email
              </a>
            </Button>
            {q.quote_number && q.portal_token && (
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/portal/$quoteNumber"
                  params={{ quoteNumber: q.quote_number }}
                  search={{ token: q.portal_token }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />Portal
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={qualifying || !["new", "qualified", "expired", "cancelled"].includes(q.job_status ?? "new")}
              onClick={() => void qualifyLead(q.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {["new", "qualified", "expired", "cancelled"].includes(q.job_status ?? "new")
                ? "Qualified Lead"
                : "Published to movers"}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Select value={q.status} onValueChange={(v) => void onStatusChange(q.id, v)}>
                <SelectTrigger className="h-8 w-[140px] capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label="Broker">
              <BrokerSelect value={brokerId} onChange={(v) => void onBrokerChange(v)} size="sm" />
            </MiniStat>
            <MiniStat label="Move date" value={q.move_date ?? "—"} />
            <MiniStat
              label="Estimate"
              value={`$${Number(q.estimated_low).toLocaleString()}–$${Number(q.estimated_high).toLocaleString()}`}
            />
          </div>

          {/* Lead phase / SLA / visibility */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
            <LeadPhaseBadge phase={q.lead_phase} />
            {q.lead_phase === "exclusive" && (
              <SlaCountdown
                expiresAt={q.exclusive_expires_at}
                pausedAt={q.exclusive_paused_at}
              />
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground" title="Mover PII visibility">
              <EyeOff className="h-3 w-3" />
              {(() => {
                const m = q.visibility_mask ?? {};
                const hidden = Object.values(m).filter(Boolean).length;
                return hidden > 0 ? `${hidden} PII field${hidden > 1 ? "s" : ""} hidden` : "Full visibility";
              })()}
            </span>
            {q.closed_reason && (
              <Badge variant="outline" className="text-[11px] capitalize">Closed · {q.closed_reason}</Badge>
            )}

            {/* Engine quick actions */}
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {q.lead_phase === "exclusive" && !q.exclusive_paused_at && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => void runEngine(
                    () => doPause({ data: { quoteId: q.id, reason: "manual" } }),
                    "SLA paused")}>
                  <PauseCircle className="mr-1 h-3.5 w-3.5" />Pause
                </Button>
              )}
              {q.lead_phase === "exclusive" && q.exclusive_paused_at && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => void runEngine(
                    () => doResume({ data: { quoteId: q.id } }),
                    "SLA resumed")}>
                  <PlayCircle className="mr-1 h-3.5 w-3.5" />Resume
                </Button>
              )}
              {q.lead_phase === "exclusive" && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => void runEngine(
                    () => doExtend({ data: { quoteId: q.id, minutes: 60 } }),
                    "SLA extended +1h")}>
                  <Clock className="mr-1 h-3.5 w-3.5" />+1h
                </Button>
              )}
              {q.lead_phase !== "closed" && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-700 hover:text-rose-800"
                  onClick={() => {
                    const reason = window.prompt("Close reason (won/lost/cancelled/duplicate/invalid)", "lost");
                    if (!reason) return;
                    if (!["won", "lost", "cancelled", "duplicate", "invalid"].includes(reason)) {
                      toast.error("Invalid reason"); return;
                    }
                    void runEngine(
                      () => doClose({ data: { quoteId: q.id, reason: reason as "won" | "lost" | "cancelled" | "duplicate" | "invalid" } }),
                      "Lead closed",
                    );
                  }}>
                  <XCircle className="mr-1 h-3.5 w-3.5" />Close Lead
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mx-6 mt-4 grid w-[calc(100%-3rem)] grid-cols-5">
            <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Profile</TabsTrigger>
            <TabsTrigger value="inventory"><Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Inventory</TabsTrigger>
            <TabsTrigger value="assign"><Building2 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Movers</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Notes</TabsTrigger>
            <TabsTrigger value="timeline"><Clock className="h-3.5 w-3.5 mr-1 hidden sm:inline" />Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="px-6 py-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Customer">
                <Row label="Name" value={getCustomerName(q)} />
                <Row label="Email" value={email} />
                <Row label="Phone" value={phone} />
                <Row label="Contact method" value={(details as { contactMethod?: string }).contactMethod} />
                <Row label="Best time" value={(details as { contactTime?: string }).contactTime} />
              </Section>
              <Section title="Move">
                <Row label="Date" value={q.move_date} />
                <Row label="Time" value={q.preferred_time} />
                <Row label="Property" value={q.property_type} />
                <Row label="Type" value={q.move_type} />
                <Row label="Distance" value={q.distance_miles ? `${q.distance_miles} mi` : null} />
                <Row label="Insurance" value={q.insurance_tier} />
              </Section>
              <Section title={<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Origin</span>}>
                <Row label="Address" value={q.origin_address} />
                <Row label="City" value={q.origin_city} />
                <Row label="ZIP" value={q.origin_zip} />
                <Row label="Floor" value={q.origin_stairs} />
                <Row label="Elevator" value={q.origin_elevator ? "Yes" : "No"} />
              </Section>
              <Section title={<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Destination</span>}>
                <Row label="Address" value={q.destination_address} />
                <Row label="City" value={q.destination_city} />
                <Row label="ZIP" value={q.destination_zip} />
                <Row label="Floor" value={q.destination_stairs} />
                <Row label="Elevator" value={q.destination_elevator ? "Yes" : "No"} />
              </Section>
              <Section title="Logistics">
                <Row label="Cubic feet" value={q.estimated_cubic_feet} />
                <Row label="Weight (lbs)" value={q.estimated_weight_lbs} />
                <Row label="Truck size" value={q.truck_size} />
                <Row label="Movers" value={q.num_movers} />
                <Row label="Labor hours" value={q.labor_hours} />
              </Section>
              {breakdown.length > 0 && (
                <Section title="Price breakdown">
                  <ul className="text-sm">
                    {breakdown.map((b, i) => (
                      <li key={i} className="flex justify-between border-b border-border py-1.5 last:border-0">
                        <span>{b.label}</span>
                        <span className="font-mono">${Number(b.amount).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="px-6 py-4">
            {inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inventory recorded.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {inventory.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5">
                    <span className="font-semibold text-foreground">{it.quantity}×</span>
                    <span className="text-muted-foreground">{it.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="assign" className="px-6 py-4">
            <AssignCompanies quoteId={q.id} />
          </TabsContent>

          <TabsContent value="notes" className="px-6 py-4 space-y-3">
            <Textarea
              placeholder="Internal note about this lead…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => void addNote()} disabled={savingNote || !newNote.trim()}>
                {savingNote ? "Saving…" : "Add note"}
              </Button>
            </div>
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{n.author_email ?? "admin"}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="px-6 py-4 space-y-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead events</div>
              <LeadEventsTimeline quoteId={q.id} />
            </div>
            {history.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status changes</div>
                <ol className="relative border-l border-border ml-2 space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="ml-4 relative">
                      <div className="absolute -left-[1.35rem] mt-1.5 h-3 w-3 rounded-full bg-primary border border-background" />
                      <div className="text-sm">
                        <span className="capitalize font-medium">{h.to_status}</span>
                        {h.from_status && <span className="text-muted-foreground"> ← {h.from_status}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                        {h.changed_by_email && ` · ${h.changed_by_email}`}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function MiniStat({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{children ?? value}</div>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
      ? value ? "Yes" : "No"
      : String(value);
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{display}</span>
    </div>
  );
}
