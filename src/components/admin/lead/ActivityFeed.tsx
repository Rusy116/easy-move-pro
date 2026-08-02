import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { Empty, dateTime } from "./shared";

type Item = {
  id: string;
  at: string;
  actor: string | null;
  action: string;
  detail: string | null;
};

export function ActivityFeed({ quoteId }: { quoteId: string }) {
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const [audit, company, comms, history] = await Promise.all([
      supabase
        .from("audit_log")
        .select("id, created_at, actor_email, action, entity_type, reason")
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
        .from("lead_communications")
        .select("id, occurred_at, actor_email, channel, status")
        .eq("quote_id", quoteId)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("quote_status_history")
        .select("id, created_at, changed_by_email, from_status, to_status")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const merged: Item[] = [
      ...((audit.data as never[]) ?? []).map((r: Record<string, unknown>) => ({
        id: `a-${r.id}`,
        at: String(r.created_at),
        actor: (r.actor_email as string) ?? null,
        action: String(r.action),
        detail: [r.entity_type, r.reason].filter(Boolean).join(" · ") || null,
      })),
      ...((company.data as never[]) ?? []).map((r: Record<string, unknown>) => ({
        id: `c-${r.id}`,
        at: String(r.created_at),
        actor: "moving company",
        action: String(r.action),
        detail: typeof r.detail === "string" ? r.detail : null,
      })),
      ...((comms.data as never[]) ?? []).map((r: Record<string, unknown>) => ({
        id: `m-${r.id}`,
        at: String(r.occurred_at),
        actor: (r.actor_email as string) ?? null,
        action: `${r.channel} logged`,
        detail: String(r.status),
      })),
      ...((history.data as never[]) ?? []).map((r: Record<string, unknown>) => ({
        id: `h-${r.id}`,
        at: String(r.created_at),
        actor: (r.changed_by_email as string) ?? null,
        action: `status → ${r.to_status}`,
        detail: r.from_status ? `from ${r.from_status}` : null,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    setItems(merged);
  }, [quoteId]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`lead-activity-${quoteId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log", filter: `quote_id=eq.${quoteId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_communications",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [quoteId, load]);

  if (items.length === 0) return <Empty>No activity recorded yet.</Empty>;

  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li
          key={i.id}
          className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="font-medium capitalize">{i.action.replace(/_/g, " ")}</span>
            {i.detail && <span className="text-muted-foreground"> · {i.detail}</span>}
            <div className="text-xs text-muted-foreground">
              {dateTime(i.at)}
              {i.actor ? ` · ${i.actor}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
