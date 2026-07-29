import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  UserCog,
  Building2,
  Globe,
  Lock,
  XCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Clock,
  Eye,
  PhoneCall,
  Ban,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type LeadEvent = {
  id: string;
  quote_id: string;
  assignment_id: string | null;
  actor_type: string | null;
  actor_email: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  "assignment.invited": { label: "Assigned exclusively", icon: Lock, tone: "text-indigo-700" },
  "assignment.viewed": { label: "Mover viewed lead", icon: Eye, tone: "text-sky-700" },
  "assignment.contacted": {
    label: "Mover contacted customer",
    icon: PhoneCall,
    tone: "text-amber-700",
  },
  "assignment.declined": { label: "Mover declined", icon: Ban, tone: "text-rose-700" },
  "assignment.withdrawn": {
    label: "Broker withdrew assignment",
    icon: RefreshCw,
    tone: "text-slate-700",
  },
  "assignment.claimed": {
    label: "Mover claimed open lead",
    icon: Sparkles,
    tone: "text-emerald-700",
  },
  "phase.open_market": { label: "Moved to open market", icon: Globe, tone: "text-amber-800" },
  "phase.closed": { label: "Lead closed", icon: XCircle, tone: "text-neutral-700" },
  "lead.reopened": { label: "Lead reopened", icon: RefreshCw, tone: "text-slate-700" },
  "sla.expired": { label: "SLA expired", icon: Clock, tone: "text-rose-700" },
  "sla.paused": { label: "SLA paused", icon: PauseCircle, tone: "text-slate-700" },
  "sla.resumed": { label: "SLA resumed", icon: PlayCircle, tone: "text-emerald-700" },
  "sla.extended": { label: "SLA extended", icon: Clock, tone: "text-emerald-700" },
  "visibility.changed": { label: "Visibility mask changed", icon: UserCog, tone: "text-slate-700" },
};

function summarize(e: LeadEvent): string | null {
  const p = e.payload ?? {};
  if (e.event_type === "assignment.invited" && typeof p.sla_hours === "number")
    return `SLA ${p.sla_hours}h`;
  if (e.event_type === "sla.extended" && typeof p.minutes === "number") return `+${p.minutes}m`;
  if (e.event_type === "phase.closed" && typeof p.reason === "string") return String(p.reason);
  if (e.event_type === "phase.open_market" && typeof p.reason === "string") return String(p.reason);
  if (e.event_type === "assignment.declined" && typeof p.reason === "string")
    return String(p.reason);
  return null;
}

export function LeadEventsTimeline({ quoteId }: { quoteId: string }) {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("lead_events")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setEvents((data ?? []) as LeadEvent[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`lead-events-${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_events",
          filter: `quote_id=eq.${quoteId}`,
        },
        (p) => setEvents((prev) => [p.new as LeadEvent, ...prev]),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [quoteId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading timeline…</p>;
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">No lead events yet.</p>;

  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {events.map((e) => {
        const meta = EVENT_META[e.event_type] ?? {
          label: e.event_type,
          icon: Building2,
          tone: "text-muted-foreground",
        };
        const Icon = meta.icon;
        const extra = summarize(e);
        return (
          <li key={e.id} className="ml-4 relative">
            <div className="absolute -left-[1.35rem] mt-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-background">
              <Icon className={`h-3 w-3 ${meta.tone}`} />
            </div>
            <div className="text-sm font-medium">
              {meta.label}
              {extra && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">· {extra}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(e.created_at).toLocaleString()}
              {e.actor_type && ` · ${e.actor_type}`}
              {e.actor_email && ` · ${e.actor_email}`}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function LeadEventsTimelineFallback({ quoteId }: { quoteId: string }) {
  return <LeadEventsTimeline quoteId={quoteId} />;
}
