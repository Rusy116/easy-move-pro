import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Company Portal" }] }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  company_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  quote_id: string | null;
  read_at: string | null;
  created_at: string;
};

const FILTERS = [
  "all",
  "unread",
  "new_lead",
  "exclusive",
  "marketplace",
  "estimate",
  "schedule",
  "invoice",
  "broker",
] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(n: Notification, f: Filter) {
  if (f === "all") return true;
  if (f === "unread") return !n.read_at;
  return n.type.includes(f);
}

function iconClass(type: string) {
  if (type.includes("estimate_accepted") || type.includes("invoice_paid") || type.includes("won"))
    return "bg-emerald-50 text-emerald-700 border-emerald-300";
  if (type.includes("rejected") || type.includes("lost") || type.includes("expired"))
    return "bg-rose-50 text-rose-700 border-rose-300";
  if (type.includes("exclusive")) return "bg-amber-50 text-amber-700 border-amber-300";
  if (type.includes("broker")) return "bg-primary/10 text-primary border-primary/30";
  return "bg-sky-50 text-sky-700 border-sky-300";
}

function NotificationsPage() {
  const { loading, company, reload } = useMoverPortal();
  const [rows, setRows] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from("company_notifications")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as Notification[] | null) ?? []);
  }, [company]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!company) return;
    const ch = supabase
      .channel(`co-notif-${company.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_notifications",
          filter: `company_id=eq.${company.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [company, load]);

  const filtered = useMemo(() => rows.filter((r) => matchesFilter(r, filter)), [rows, filter]);
  const unread = rows.filter((r) => !r.read_at).length;

  async function markAllRead() {
    if (!company) return;
    const { error } = await supabase
      .from("company_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("company_id", company.id)
      .is("read_at", null);
    if (error) toast.error(error.message);
    else {
      toast.success("All marked read");
      void load();
    }
  }
  async function markRead(id: string) {
    await supabase
      .from("company_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    void load();
  }
  async function remove(id: string) {
    await supabase.from("company_notifications").delete().eq("id", id);
    void load();
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Notifications</h2>
            {unread > 0 && (
              <Badge className="bg-primary text-primary-foreground">{unread} unread</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={unread === 0}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-full border capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:bg-muted"}`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">You're all caught up.</div>
            </div>
          )}
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 flex items-start gap-3 ${!n.read_at ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-full border grid place-items-center ${iconClass(n.type)}`}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {n.type.replace(/_/g, " ")}
                  </Badge>
                  {!n.read_at && (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">New</Badge>
                  )}
                </div>
                {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read_at && (
                  <Button size="sm" variant="ghost" onClick={() => void markRead(n.id)}>
                    Mark read
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => void remove(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
