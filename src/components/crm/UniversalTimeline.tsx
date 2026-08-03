import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/lib/use-realtime";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  UserCog,
} from "lucide-react";

/**
 * Universal lead audit timeline.
 *
 * Merges every audit surface into a single chronological feed so that every
 * role sees the same answer to: WHO did WHAT, WHEN, in which ROLE, and what
 * the value was BEFORE and AFTER.
 *
 *   audit_log            → explicit before/after field changes
 *   lead_events          → assignment / SLA / phase lifecycle
 *   quote_status_history → status transitions
 *   company_activity     → moving-company actions
 *   company_contact_log  → customer communication
 */

export type TimelineSource = "audit" | "lead" | "status" | "company" | "contact";

export type UnifiedEvent = {
  id: string;
  at: string;
  source: TimelineSource;
  action: string;
  actor: string | null;
  role: string | null;
  from: string | null;
  to: string | null;
  detail: string | null;
};

const SOURCE_META: Record<
  TimelineSource,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  audit: { label: "Audit", icon: ShieldCheck, tone: "text-indigo-700" },
  lead: { label: "Lead", icon: UserCog, tone: "text-sky-700" },
  status: { label: "Status", icon: ClipboardList, tone: "text-amber-700" },
  company: { label: "Company", icon: Building2, tone: "text-emerald-700" },
  contact: { label: "Contact", icon: MessageSquare, tone: "text-rose-700" },
};

const SOURCE_FILTERS: Array<{ key: TimelineSource | "all"; label: string }> = [
  { key: "all", label: "All activity" },
  { key: "status", label: "Status" },
  { key: "lead", label: "Assignment" },
  { key: "company", label: "Company" },
  { key: "contact", label: "Communication" },
  { key: "audit", label: "Field changes" },
];

function humanize(v: string): string {
  return v.replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s === "{}" || s === "null" ? null : s.length > 140 ? `${s.slice(0, 140)}…` : s;
  } catch {
    return null;
  }
}

export function UniversalTimeline({ quoteId }: { quoteId: string }) {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineSource | "all">("all");

  const load = useCallback(async () => {
    const [audit, lead, status, activity, contact] = await Promise.all([
      supabase
        .from("audit_log" as never)
        .select("id, created_at, action, actor_email, actor_role, before, after, reason")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("lead_events")
        .select("id, created_at, event_type, actor_email, actor_type, actor_role, payload")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("quote_status_history" as never)
        .select("id, created_at, from_status, to_status, changed_by_email")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("company_activity")
        .select("id, created_at, action, detail")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("company_contact_log" as never)
        .select("id, created_at, channel, direction, summary")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const out: UnifiedEvent[] = [];

    for (const r of (audit.data ?? []) as Array<Record<string, unknown>>) {
      out.push({
        id: `a-${r.id}`,
        at: String(r.created_at),
        source: "audit",
        action: humanize(String(r.action ?? "changed")),
        actor: (r.actor_email as string) ?? null,
        role: (r.actor_role as string) ?? null,
        from: asText(r.before),
        to: asText(r.after),
        detail: (r.reason as string) ?? null,
      });
    }

    for (const r of (lead.data ?? []) as Array<Record<string, unknown>>) {
      const payload = (r.payload ?? {}) as Record<string, unknown>;
      out.push({
        id: `l-${r.id}`,
        at: String(r.created_at),
        source: "lead",
        action: humanize(String(r.event_type ?? "event")),
        actor: (r.actor_email as string) ?? null,
        role: ((r.actor_role as string) ?? (r.actor_type as string)) || null,
        from: null,
        to: null,
        detail: asText(payload.reason ?? payload.note ?? payload),
      });
    }

    for (const r of (status.data ?? []) as Array<Record<string, unknown>>) {
      out.push({
        id: `s-${r.id}`,
        at: String(r.created_at),
        source: "status",
        action: "Status changed",
        actor: (r.changed_by_email as string) ?? null,
        role: null,
        from: (r.from_status as string) ?? null,
        to: (r.to_status as string) ?? null,
        detail: null,
      });
    }

    for (const r of (activity.data ?? []) as Array<Record<string, unknown>>) {
      out.push({
        id: `c-${r.id}`,
        at: String(r.created_at),
        source: "company",
        action: humanize(String(r.action ?? "activity")),
        actor: null,
        role: "moving company",
        from: null,
        to: null,
        detail: asText(r.detail),
      });
    }

    for (const r of (contact.data ?? []) as Array<Record<string, unknown>>) {
      out.push({
        id: `k-${r.id}`,
        at: String(r.created_at),
        source: "contact",
        action: `${humanize(String(r.direction ?? "contact"))} · ${String(r.channel ?? "note")}`,
        actor: null,
        role: "moving company",
        from: null,
        to: null,
        detail: (r.summary as string) ?? null,
      });
    }

    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setEvents(out);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useRealtimeTables(
    `timeline-${quoteId}`,
    ["audit_log", "lead_events", "quote_status_history", "company_activity", "company_contact_log"],
    () => void load(),
  );

  const rows = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.source === filter)),
    [events, filter],
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading timeline…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ol className="relative ml-2 space-y-3 border-l border-border">
          {rows.map((e) => {
            const meta = SOURCE_META[e.source];
            const Icon = meta.icon;
            return (
              <li key={e.id} className="relative ml-4">
                <div className="absolute -left-[1.35rem] mt-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-background">
                  <Icon className={`h-3 w-3 ${meta.tone}`} />
                </div>
                <div className="text-sm font-medium">{e.action}</div>
                {(e.from || e.to) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                      {e.from ?? "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 font-medium">
                      {e.to ?? "—"}
                    </span>
                  </div>
                )}
                {e.detail && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div>
                )}
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                  {e.actor && ` · ${e.actor}`}
                  {e.role && ` · ${e.role}`}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
