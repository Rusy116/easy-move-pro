import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader, SkeletonRows } from "@/components/shell/Chrome";
import { Badge } from "@/components/ui/badge";
import { AccountDirectory } from "@/components/admin/AccountDirectory";
import { useI18n } from "@/i18n";
import {
  adminListImpersonationEvents,
  adminListImpersonationSessions,
  type ImpersonationEventRow,
  type ImpersonationSessionRow,
} from "@/lib/impersonation.functions";

export const Route = createFileRoute("/_authenticated/admin/impersonation")({
  head: () => ({
    meta: [
      { title: "View as user & audit log — Admin" },
      {
        name: "description",
        content:
          "Open any account with View as User and review the full impersonation audit trail.",
      },
    ],
  }),
  component: ImpersonationAdminPage,
});

function ImpersonationAdminPage() {
  const { t } = useI18n();
  const listSessions = useServerFn(adminListImpersonationSessions);
  const listEvents = useServerFn(adminListImpersonationEvents);
  const [sessions, setSessions] = useState<ImpersonationSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, ImpersonationEventRow[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await listSessions({}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.impersonation.loadAuditError"));
    } finally {
      setLoading(false);
    }
  }, [listSessions]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!events[id]) {
      try {
        const rows = await listEvents({ data: { sessionId: id } });
        setEvents((prev) => ({ ...prev, [id]: rows }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("admin.impersonation.loadActionsError"));
      }
    }
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 md:py-14">
        <PageHeader
          eyebrow={t("admin.impersonation.eyebrow")}
          title={t("admin.impersonation.title")}
          subtitle={t("admin.impersonation.subtitle")}
          icon={<Eye className="h-5 w-5" />}
        />

        <div className="mt-8">
          <AccountDirectory />
        </div>

        <h2 className="mt-10 font-serif text-2xl">{t("admin.impersonation.auditLogTitle")}</h2>
        <div className="mt-4 grid gap-2">
          {loading && <SkeletonRows n={3} />}
          {!loading && sessions.length === 0 && (
            <div className="card-premium p-8 text-center text-sm text-muted-foreground">
              {t("admin.impersonation.noSessions")}
            </div>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="card-premium p-4">
              <button
                onClick={() => void toggle(s.id)}
                className="flex w-full flex-wrap items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{s.admin_email ?? t("admin.impersonation.administrator")}</span>
                    <span className="text-muted-foreground">{t("admin.impersonation.viewedAs")}</span>
                    <span className="font-medium">{s.target_name ?? s.target_email}</span>
                    <Badge variant="outline" className="capitalize">
                      {s.target_role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        s.ended_at
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }
                    >
                      {s.ended_at ? t("admin.impersonation.ended") : t("admin.impersonation.active")}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleString()}
                    {s.ended_at ? ` → ${new Date(s.ended_at).toLocaleTimeString()}` : ""} ·{" "}
                    {t("admin.impersonation.actionsCount", { count: s.event_count })} · {t("admin.impersonation.ip", { ip: s.ip_address ?? "—" })} ·{" "}
                    <span className="break-all">{s.user_agent ?? "—"}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition ${openId === s.id ? "rotate-180" : ""}`}
                />
              </button>

              {openId === s.id && (
                <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                  {!events[s.id] && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("admin.impersonation.loadingActions")}
                    </div>
                  )}
                  {events[s.id]?.length === 0 && (
                    <div className="text-muted-foreground">{t("admin.impersonation.noActions")}</div>
                  )}
                  {events[s.id]?.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-2.5 py-1.5"
                    >
                      <span className="font-mono">{e.action}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()} · {e.ip_address ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
