import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  FileText,
  Package,
  Send,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  Bot,
  ListOrdered,
} from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, StatCard, SectionShell } from "@/components/shell/Chrome";
import { LogList, StatusPill, EmptyState, fmtDate } from "@/components/ai/blocks";
import { listAgents, listTasks, listLogs, listContent, listProducts, listMetrics } from "@/lib/ai/api";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/dashboard")({
  head: () => ({
    meta: [
      { title: "AI Growth Center — Easy Moving" },
      { name: "description", content: "Command center for every AI agent inside Easy Moving." },
    ],
  }),
  component: AiDashboard,
});

function isToday(v?: string | null) {
  if (!v) return false;
  const d = new Date(v);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function AiDashboard() {
  const t = useT();
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents });
  const tasks = useQuery({ queryKey: ["ai", "tasks"], queryFn: () => listTasks({ limit: 200 }) });
  const logs = useQuery({ queryKey: ["ai", "logs"], queryFn: () => listLogs({ limit: 12 }) });
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const products = useQuery({ queryKey: ["ai", "products"], queryFn: listProducts });
  const metrics = useQuery({ queryKey: ["ai", "metrics"], queryFn: listMetrics });

  const t2 = tasks.data ?? [];
  const c = content.data ?? [];
  const p = products.data ?? [];
  const m = metrics.data ?? [];

  const sum = (metric: string) =>
    m.filter((x) => x.metric === metric).reduce((a, b) => a + Number(b.value), 0);

  const seoToday = c.filter((x) => x.kind !== "article" && isToday(x.created_at)).length;
  const productsToday = p.filter((x) => isToday(x.created_at)).length;
  const published = c.filter((x) => x.status === "published").length;
  const revenue = p.reduce((a, b) => a + Number(b.revenue_cents ?? 0), 0) / 100;
  const running = t2.filter((x) => x.status === "running").length;
  const queued = t2.filter((x) => x.status === "queued" || x.status === "scheduled").length;
  const completed = t2.filter((x) => x.status === "completed").length;
  const failed = t2.filter((x) => x.status === "failed").length;
  const online = (agents.data ?? []).filter((a) => a.enabled && a.status !== "stopped").length;

  const upcoming = t2
    .filter((x) => x.scheduled_for && new Date(x.scheduled_for) > new Date())
    .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1))
    .slice(0, 6);

  const latest = c
    .filter((x) => x.status === "published")
    .slice(0, 6);

  return (
    <AiShell>
      <PageHeader
        eyebrow={t("admin.ai.dashboard.eyebrow")}
        title={t("admin.ai.dashboard.title")}
        subtitle={t("admin.ai.dashboard.subtitle")}
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.ai.dashboard.seoPagesToday")} value={seoToday} icon={<FileText className="h-4 w-4" />} />
        <StatCard label={t("admin.ai.dashboard.productsToday")} value={productsToday} icon={<Package className="h-4 w-4" />} />
        <StatCard label={t("admin.ai.dashboard.articlesPublished")} value={published} icon={<Send className="h-4 w-4" />} />
        <StatCard
          label={t("admin.ai.dashboard.organicTraffic")}
          value={sum("organic_clicks").toLocaleString()}
          hint={t("admin.ai.dashboard.organicTrafficHint")}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label={t("admin.ai.dashboard.productRevenue")}
          value={`$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4" />}
          tone="success"
        />
        <StatCard label={t("admin.ai.dashboard.tasksRunning")} value={running} icon={<Activity className="h-4 w-4" />} />
        <StatCard
          label={t("admin.ai.dashboard.completedTasks")}
          value={completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label={t("admin.ai.dashboard.failedTasks")}
          value={failed}
          icon={<XCircle className="h-4 w-4" />}
          tone={failed ? "danger" : "default"}
        />
        <StatCard label={t("admin.ai.dashboard.agentsOnline")} value={online} icon={<Bot className="h-4 w-4" />} />
        <StatCard
          label={t("admin.ai.dashboard.queue")}
          value={queued}
          hint={t("admin.ai.dashboard.queueHint")}
          icon={<ListOrdered className="h-4 w-4" />}
          tone={queued ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionShell
            title={t("admin.ai.dashboard.recentActivity")}
            right={
              <Link to="/ai/workforce" className="text-xs text-muted-foreground hover:text-foreground">
                {t("admin.ai.dashboard.viewAgents")}
              </Link>
            }
          >
            <LogList logs={logs.data ?? []} />
          </SectionShell>
        </div>
        <div className="space-y-6">
          <SectionShell title={t("admin.ai.dashboard.latestPublications")}>
            {latest.length ? (
              <ul className="space-y-3">
                {latest.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{x.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDate(x.published_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("admin.ai.dashboard.nothingPublished")} />
            )}
          </SectionShell>
          <SectionShell title={t("admin.ai.dashboard.upcomingTasks")}>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{x.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDate(x.scheduled_for)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("admin.ai.dashboard.noScheduledTasks")} />
            )}
          </SectionShell>
          <SectionShell title={t("admin.ai.dashboard.queueStatus")}>
            <div className="flex flex-wrap gap-2">
              {["queued", "scheduled", "running", "completed", "failed"].map((s) => (
                <span key={s} className="inline-flex items-center gap-2">
                  <StatusPill status={s} />
                  <span className="text-sm tabular-nums">
                    {t2.filter((x) => x.status === s).length}
                  </span>
                </span>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </AiShell>
  );
}
