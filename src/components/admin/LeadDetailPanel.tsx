import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  StickyNote,
  Clock,
  ExternalLink,
  Building2,
  User,
  Package,
  MapPin,
  EyeOff,
  PauseCircle,
  PlayCircle,
  XCircle,
  X,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  ListTodo,
  FileText,
  Activity,
  Search,
  Copy,
  Archive,
  FileDown,
} from "lucide-react";
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
import type { LeadQuote } from "./lead/shared";
import { OverviewSection } from "./lead/OverviewSection";
import { InventorySection } from "./lead/InventorySection";
import { PricingSection } from "./lead/PricingSection";
import { CommunicationCenter } from "./lead/CommunicationCenter";
import { TasksSection } from "./lead/TasksSection";
import { DocumentsSection } from "./lead/DocumentsSection";
import { ActivityFeed } from "./lead/ActivityFeed";
import { AiSummarySection } from "./lead/AiSummarySection";


export const LEAD_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "accepted",
  "won",
  "lost",
  "cancelled",
] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-300",
  contacted: "bg-amber-100 text-amber-800 border-amber-300",
  scheduled: "bg-purple-100 text-purple-800 border-purple-300",
  accepted: "bg-teal-100 text-teal-800 border-teal-300",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-100 text-rose-800 border-rose-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

type Note = {
  id: string;
  quote_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
};
type History = {
  id: string;
  quote_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_email: string | null;
  created_at: string;
};

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
        supabase
          .from("quote_notes")
          .select("*")
          .eq("quote_id", qid)
          .order("created_at", { ascending: false }),
        supabase
          .from("quote_status_history")
          .select("*")
          .eq("quote_id", qid)
          .order("created_at", { ascending: false }),
      ]);
      setNotes((n as Note[]) ?? []);
      setHistory((h as History[]) ?? []);
    })();

    const channel = supabase
      .channel(`quote-${qid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quote_notes", filter: `quote_id=eq.${qid}` },
        (p) => setNotes((prev) => [p.new as Note, ...prev]),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quote_status_history",
          filter: `quote_id=eq.${qid}`,
        },
        (p) => setHistory((prev) => [p.new as History, ...prev]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [q?.id]);

  const [noteQuery, setNoteQuery] = useState("");

  const milestones = useMemo(() => {
    const r = q as (Quote & Record<string, unknown>) | null;
    return [
      { label: "Lead created", at: r?.created_at ?? null },
      { label: "Quote generated", at: r?.created_at ?? null },
      { label: "Broker assigned", at: (r?.["qualified_at"] as string) ?? null },
      { label: "Customer contacted", at: (r?.["contacted_at"] as string) ?? null },
      { label: "Estimate sent", at: (r?.["final_quote_sent_at"] as string) ?? null },
      { label: "Marketplace published", at: (r?.["published_at"] as string) ?? null },
      { label: "Company claimed", at: (r?.["claimed_at"] as string) ?? null },
      { label: "Booking accepted", at: r?.accepted_at ?? null },
      { label: "Job completed", at: (r?.["closed_at"] as string) ?? null },
    ];
  }, [q]);


  const doPause = useServerFn(pauseSla);
  const doResume = useServerFn(resumeSla);
  const doExtend = useServerFn(extendSla);
  const doClose = useServerFn(closeLead);

  if (!q) return null;
  const details = q.details ?? {};
  const phone = q.contact_phone ?? "";
  const email = q.contact_email ?? "";

  async function downloadPdf() {
    try {
      const { downloadEstimatePdf } = await import("@/lib/estimate-pdf");
      downloadEstimatePdf({
        quoteNumber: q!.quote_number ?? q!.id.slice(0, 8),
        createdAtISO: q!.created_at,
        customer: { fullName: getCustomerName(q!), email, phone },
        origin: {
          fullAddress: q!.origin_address ?? "",
          city: q!.origin_city ?? "",
          state: q!.origin_state ?? "",
          zip: q!.origin_zip ?? "",
        },
        destination: {
          fullAddress: q!.destination_address ?? "",
          city: q!.destination_city ?? "",
          state: q!.destination_state ?? "",
          zip: q!.destination_zip ?? "",
        },
        moveDate: q!.move_date ?? null,
        distanceMiles: Number(q!.distance_miles ?? 0),
        numMovers: Number(q!.num_movers ?? 0),
        laborHours: Number(q!.labor_hours ?? 0),
        truckSize: q!.truck_size ?? "",
        cubicFeet: Number(q!.estimated_cubic_feet ?? 0),
        weightLbs: Number(q!.estimated_weight_lbs ?? 0),
        estimatedLow: Number(q!.estimated_low ?? 0),
        estimatedHigh: Number(q!.estimated_high ?? 0),
        inventory: (q!.inventory ?? []) as { id: string; quantity: number }[],
        breakdown: (q!.breakdown ?? []) as { label: string; amount: number }[],
        insurance: q!.insurance_tier ?? "basic",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build PDF");
    }
  }

  async function duplicateLead() {
    const src = q as unknown as Record<string, unknown>;
    const skip = new Set([
      "id",
      "quote_number",
      "portal_token",
      "created_at",
      "accepted_at",
      "claimed_at",
      "published_at",
      "qualified_at",
      "contacted_at",
      "closed_at",
      "assigned_company_id",
      "assigned_at",
      "exclusive_assignment_id",
      "exclusive_started_at",
      "exclusive_expires_at",
      "final_quote_sent_at",
      "last_activity_at",
      "archived_at",
    ]);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) if (!skip.has(k) && v !== null) payload[k] = v;
    payload.status = "new";
    payload.job_status = "new";
    payload.lead_status = "submitted";
    payload.lead_phase = "open_market";
    const { error } = await supabase.from("quotes").insert(payload as never);
    if (error) toast.error(error.message);
    else toast.success("Lead duplicated");
  }

  async function archiveLead() {
    const { error } = await supabase
      .from("quotes")
      .update({ archived_at: new Date().toISOString() } as never)
      .eq("id", q!.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead archived");
      onClose();
    }
  }


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
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-600/30">
                  Accepted
                </Badge>
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
              <a href={phone ? `tel:${phone}` : undefined}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" disabled={!email}>
              <a
                href={
                  email
                    ? `mailto:${email}?subject=Your%20Easy%20Moving%20Quote%20${q.quote_number ?? ""}`
                    : undefined
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" disabled={!phone}>
              <a href={phone ? `sms:${phone}` : undefined}>
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void downloadPdf()}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => void duplicateLead()}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => void archiveLead()}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>

            {q.quote_number && q.portal_token && (
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/portal/$quoteNumber"
                  params={{ quoteNumber: q.quote_number }}
                  search={{ token: q.portal_token }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Portal
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={
                qualifying ||
                !["new", "qualified", "expired", "cancelled"].includes(q.job_status ?? "new")
              }
              onClick={() => void qualifyLead(q.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {["new", "qualified", "expired", "cancelled"].includes(q.job_status ?? "new")
                ? "Qualified Lead"
                : "Published to movers"}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Select value={q.status} onValueChange={(v) => void onStatusChange(q.id, v)}>
                <SelectTrigger className="h-8 w-[140px] capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
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
              <SlaCountdown expiresAt={q.exclusive_expires_at} pausedAt={q.exclusive_paused_at} />
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
              title="Mover PII visibility"
            >
              <EyeOff className="h-3 w-3" />
              {(() => {
                const m = q.visibility_mask ?? {};
                const hidden = Object.values(m).filter(Boolean).length;
                return hidden > 0
                  ? `${hidden} PII field${hidden > 1 ? "s" : ""} hidden`
                  : "Full visibility";
              })()}
            </span>
            {q.closed_reason && (
              <Badge variant="outline" className="text-[11px] capitalize">
                Closed · {q.closed_reason}
              </Badge>
            )}

            {/* Engine quick actions */}
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {q.lead_phase === "exclusive" && !q.exclusive_paused_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    void runEngine(
                      () => doPause({ data: { quoteId: q.id, reason: "manual" } }),
                      "SLA paused",
                    )
                  }
                >
                  <PauseCircle className="mr-1 h-3.5 w-3.5" />
                  Pause
                </Button>
              )}
              {q.lead_phase === "exclusive" && q.exclusive_paused_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    void runEngine(() => doResume({ data: { quoteId: q.id } }), "SLA resumed")
                  }
                >
                  <PlayCircle className="mr-1 h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
              {q.lead_phase === "exclusive" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    void runEngine(
                      () => doExtend({ data: { quoteId: q.id, minutes: 60 } }),
                      "SLA extended +1h",
                    )
                  }
                >
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  +1h
                </Button>
              )}
              {q.lead_phase !== "closed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-rose-700 hover:text-rose-800"
                  onClick={() => {
                    const reason = window.prompt(
                      "Close reason (won/lost/cancelled/duplicate/invalid)",
                      "lost",
                    );
                    if (!reason) return;
                    if (!["won", "lost", "cancelled", "duplicate", "invalid"].includes(reason)) {
                      toast.error("Invalid reason");
                      return;
                    }
                    void runEngine(
                      () =>
                        doClose({
                          data: {
                            quoteId: q.id,
                            reason: reason as
                              | "won"
                              | "lost"
                              | "cancelled"
                              | "duplicate"
                              | "invalid",
                          },
                        }),
                      "Lead closed",
                    );
                  }}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Close Lead
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-[var(--lead-tabs-top,0px)] z-[5] -mx-0 overflow-x-auto border-b border-border bg-card px-6 py-2">
            <TabsList className="inline-flex w-max gap-1">
              <TabsTrigger value="overview">
                <User className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Package className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="pricing">
                <DollarSign className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="comms">
                <MessageSquare className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Comms
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <ListTodo className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="assign">
                <Building2 className="mr-1 hidden h-3.5 w-3.5 sm:inline" />
                Movers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 px-4 py-4 sm:px-6">
            <AiSummarySection q={q as unknown as LeadQuote} />
            <OverviewSection
              q={q as unknown as LeadQuote}
              brokerSlot={
                <BrokerSelect value={brokerId} onChange={(v) => void onBrokerChange(v)} size="sm" />
              }
              workflowSlot={<LeadWorkflowActions quoteId={q.id} status={q.lead_status} />}
            />
          </TabsContent>

          <TabsContent value="inventory" className="px-4 py-4 sm:px-6">
            <InventorySection q={q as unknown as LeadQuote} />
          </TabsContent>

          <TabsContent value="pricing" className="px-4 py-4 sm:px-6">
            <PricingSection q={q as unknown as LeadQuote} />
          </TabsContent>

          <TabsContent value="comms" className="px-4 py-4 sm:px-6">
            <CommunicationCenter q={q as unknown as LeadQuote} />
          </TabsContent>

          <TabsContent value="tasks" className="px-4 py-4 sm:px-6">
            <TasksSection q={q as unknown as LeadQuote} />
          </TabsContent>

          <TabsContent value="documents" className="px-4 py-4 sm:px-6">
            <DocumentsSection q={q as unknown as LeadQuote} />
          </TabsContent>

          <TabsContent value="activity" className="px-4 py-4 sm:px-6">
            <ActivityFeed quoteId={q.id} />
          </TabsContent>

          <TabsContent value="assign" className="px-4 py-4 sm:px-6">
            <AssignCompanies quoteId={q.id} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 px-4 py-4 sm:px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search notes…"
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Internal note about this lead…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => void addNote()}
                disabled={savingNote || !newNote.trim()}
              >
                {savingNote ? "Saving…" : "Add note"}
              </Button>
            </div>
            <div className="space-y-2">
              {notes
                .filter((n) =>
                  noteQuery.trim()
                    ? `${n.body} ${n.author_email ?? ""}`
                        .toLowerCase()
                        .includes(noteQuery.toLowerCase())
                    : true,
                )
                .map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{n.author_email ?? "admin"}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                  </div>
                ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 px-4 py-4 sm:px-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Milestones
              </div>
              <ol className="ml-2 space-y-3 border-l border-border">
                {milestones.map((m) => (
                  <li key={m.label} className="relative ml-4">
                    <div
                      className={`absolute -left-[1.35rem] mt-1.5 h-3 w-3 rounded-full border border-background ${m.at ? "bg-primary" : "bg-muted"}`}
                    />
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.at ? new Date(m.at).toLocaleString() : "Pending"}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lead events
              </div>
              <LeadEventsTimeline quoteId={q.id} />
            </div>
            {history.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status changes
                </div>
                <ol className="ml-2 space-y-3 border-l border-border">
                  {history.map((h) => (
                    <li key={h.id} className="relative ml-4">
                      <div className="absolute -left-[1.35rem] mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                      <div className="text-sm">
                        <span className="font-medium capitalize">{h.to_status}</span>
                        {h.from_status && (
                          <span className="text-muted-foreground"> ← {h.from_status}</span>
                        )}
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

function MiniStat({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{children ?? value}</div>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{display}</span>
    </div>
  );
}
