import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { EmptyState, fmtDate } from "@/components/ai/blocks";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/ai/orchestrator";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/notifications")({
  head: () => ({
    meta: [
      { title: "AI Notifications — Easy Moving" },
      { name: "description", content: "Admin alerts for agent crashes, task failures and publications." },
      { property: "og:title", content: "AI Notifications — Easy Moving" },
      { property: "og:description", content: "Orchestrator alerts for the AI workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const SEVERITY_TONE: Record<string, string> = {
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function NotificationsPage() {
  const tr = useT();
  const qc = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const notifications = useQuery({
    queryKey: ["ai", "notifications"],
    queryFn: () => listNotifications(150),
    refetchInterval: 30000,
  });

  const all = notifications.data ?? [];
  const rows = onlyUnread ? all.filter((n) => !n.read_at) : all;

  async function run(fn: () => Promise<void>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["ai", "notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai2.notifications.toast.actionFailed"));
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai2.notifications.eyebrow")}
        title={tr("admin.ai2.notifications.title")}
        subtitle={tr("admin.ai2.notifications.subtitle")}
        icon={<Bell className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai2.notifications.stat.total")} value={all.length} />
        <StatCard label={tr("admin.ai2.notifications.stat.unread")} value={all.filter((n) => !n.read_at).length} tone="warning" />
        <StatCard label={tr("admin.ai2.notifications.stat.errors")} value={all.filter((n) => n.severity === "error").length} tone="danger" />
        <StatCard
          label={tr("admin.ai2.notifications.stat.publications")}
          value={all.filter((n) => n.kind.includes("publish")).length}
          tone="success"
        />
      </div>

      <SectionShell title={tr("admin.ai2.notifications.feed.title")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setOnlyUnread((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              onlyUnread ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {tr("admin.ai2.notifications.feed.unreadOnly")}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(markAllNotificationsRead, tr("admin.ai2.notifications.toast.allRead"))}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {tr("admin.ai2.notifications.feed.markAllRead")}
          </Button>
        </div>

        {rows.length ? (
          <ul className="divide-y divide-border/60">
            {rows.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        SEVERITY_TONE[n.severity] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tr(`admin.ai2.notifications.severity.${n.severity}`)}
                    </span>
                    <span className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>
                      {n.title}
                    </span>
                  </div>
                  {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {tr("admin.ai2.notifications.feed.meta", {
                      agent: (n.agent_key ?? "orchestrator").replace(/_/g, " "),
                      kind: n.kind.replace(/_/g, " "),
                      date: fmtDate(n.created_at),
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(
                      () => markNotificationRead(n.id, !n.read_at),
                      n.read_at ? tr("admin.ai2.notifications.toast.markedUnread") : tr("admin.ai2.notifications.toast.markedRead"),
                    )
                  }
                >
                  {n.read_at ? tr("admin.ai2.notifications.feed.markUnread") : tr("admin.ai2.notifications.feed.markRead")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={tr("admin.ai2.notifications.feed.emptyTitle")} hint={tr("admin.ai2.notifications.feed.emptyHint")} />
        )}
      </SectionShell>
    </AiShell>
  );
}
