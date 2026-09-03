import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Newspaper, Building2, Package, Image as ImageIcon, DollarSign } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { ECOSYSTEM_AGENTS, PRODUCTION_PIPELINE } from "@/lib/ai/ecosystem";
import {
  ecosystemStatus,
  runBlogAgent,
  runGrowthAgent,
  runProductAgent,
  runImageAgent,
  runRevenueAgent,
} from "@/lib/ai-ecosystem.functions";

export const Route = createFileRoute("/_authenticated/ai/ecosystem")({
  head: () => ({
    meta: [
      { title: "AI Ecosystem — 12 Coordinated Agents | Easy Moving" },
      {
        name: "description",
        content:
          "Control the Easy Moving AI ecosystem: data, calculator factory, SEO, linking, blog, growth, products, images, optimization, performance and revenue agents.",
      },
    ],
  }),
  component: EcosystemPage,
});

function EcosystemPage() {
  const tr = useT();
  const qc = useQueryClient();
  const [log, setLog] = useState<{ t: string; msg: string }[]>([]);
  const [blogCount, setBlogCount] = useState<number>(1);
  const push = (msg: string) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), msg }, ...l].slice(0, 40));

  const status = useQuery({
    queryKey: ["ai-ecosystem-status"],
    queryFn: () => ecosystemStatus({ data: {} as never }),
    refetchInterval: 30000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-ecosystem-status"] });

  const blog = useMutation({
    mutationFn: () => runBlogAgent({ data: { count: blogCount } }),
    onSuccess: (r) => {
      push(tr("admin.ai4.eco.blogLog", { created: r.created, aiGenerated: r.aiGenerated }));
      toast.success(tr("admin.ai4.eco.blogToast", { created: r.created }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const growth = useMutation({
    mutationFn: () => runGrowthAgent({ data: { count: 3 } }),
    onSuccess: (r) => {
      push(tr("admin.ai4.eco.growthLog", { created: r.created, aiGenerated: r.aiGenerated }));
      toast.success(tr("admin.ai4.eco.growthToast", { created: r.created }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const product = useMutation({
    mutationFn: () => runProductAgent({ data: { count: 2 } }),
    onSuccess: (r) => {
      push(
        tr("admin.ai4.eco.productLog", {
          created: r.created,
          titles: r.titles.join(", ") || tr("admin.ai4.eco.productNonePending"),
        }),
      );
      toast.success(tr("admin.ai4.eco.productToast", { created: r.created }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const image = useMutation({
    mutationFn: () => runImageAgent({ data: { limit: 40 } }),
    onSuccess: (r) => {
      push(
        tr("admin.ai4.eco.imageLog", {
          content: r.contentBriefed,
          products: r.productsBriefed,
        }),
      );
      toast.success(tr("admin.ai4.eco.imageToast"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenue = useMutation({
    mutationFn: () => runRevenueAgent({ data: {} as never }),
    onSuccess: (r) => {
      push(
        tr("admin.ai4.eco.revenueLog", {
          platform: r.platformRevenue.toLocaleString(),
          broker: r.brokerRevenue.toLocaleString(),
          products: r.productRevenue.toLocaleString(),
          pipeline: r.pipeline.toLocaleString(),
        }),
      );
      toast.success(tr("admin.ai4.eco.revenueToast"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy =
    blog.isPending || growth.isPending || product.isPending || image.isPending || revenue.isPending;
  const t = status.data?.totals;
  const agentStatus = new Map((status.data?.agents ?? []).map((a) => [a.key, a]));

  return (
    <AiShell>
      <PageHeader
        title={tr("admin.ai4.eco.title")}
        subtitle={tr("admin.ai4.eco.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tr("admin.ai4.eco.statCities")} value={String(t?.cities ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statCalcPublished")} value={String(t?.calcPublished ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statSeoPublished")} value={String(t?.seoPublished ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statProducts")} value={String(t?.products ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statContentDrafts")} value={String(t?.contentDrafts ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statContentPublished")} value={String(t?.contentPublished ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statQueued")} value={String(t?.queued ?? "—")} />
        <StatCard label={tr("admin.ai4.eco.statFailed")} value={String(t?.failed ?? "—")} />
      </div>

      <SectionShell title={tr("admin.ai4.eco.sectionPipeline")}>
        <ol className="flex flex-wrap gap-2 text-xs">
          {PRODUCTION_PIPELINE.map((step, i) => (
            <li
              key={step}
              className={`rounded-full border px-3 py-1 ${
                i === 2 || i === 3
                  ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}. {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{tr("admin.ai4.eco.pipelineNote")}</p>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.eco.sectionRun")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="blog-count" className="text-muted-foreground">{tr("admin.ai4.eco.countLabel")}</label>
              <Input
                id="blog-count"
                type="number"
                min={1}
                max={10}
                value={blogCount}
                onChange={(e) => setBlogCount(Math.min(Math.max(parseInt(e.target.value || "1", 10), 1), 10))}
                className="h-8 w-20"
              />
            </div>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    tr("admin.ai4.eco.confirmBlog", { count: blogCount, plural: blogCount === 1 ? "" : "s" }),
                  )
                ) {
                  blog.mutate();
                }
              }}
              disabled={busy}
              className="justify-start gap-2"
            >
              {blog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
              {tr("admin.ai4.eco.blogAgent")}
            </Button>
          </div>
          <Button onClick={() => growth.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {growth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            {tr("admin.ai4.eco.growthAgent")}
          </Button>
          <Button onClick={() => product.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {product.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            {tr("admin.ai4.eco.productAgent")}
          </Button>
          <Button onClick={() => image.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {image.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {tr("admin.ai4.eco.imageAgent")}
          </Button>
          <Button onClick={() => revenue.mutate()} disabled={busy} variant="outline" className="justify-start gap-2">
            {revenue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            {tr("admin.ai4.eco.revenueAgent")}
          </Button>
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.eco.sectionAgents")}>
        <div className="grid gap-3 lg:grid-cols-2">
          {ECOSYSTEM_AGENTS.map((a) => {
            const s = agentStatus.get(a.key);
            return (
              <div key={a.key} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {tr("admin.ai4.eco.agentLabel", { index: a.index })}
                    </p>
                    <h3 className="mt-1 font-semibold break-words">{a.name}</h3>
                  </div>
                  <Badge variant={s?.status === "running" ? "default" : "secondary"}>
                    {s?.status ?? tr("admin.ai4.eco.notRegistered")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.purpose}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.capabilities.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 break-words">
                    {tr("admin.ai4.eco.queueLine", { queue: a.queue, priority: a.priority })}
                    {a.dependsOn.length > 0 && tr("admin.ai4.eco.afterSuffix", { deps: a.dependsOn.join(", ") })}
                  </span>
                  <Link to={a.route as "/"} className="text-primary underline">
                    {tr("admin.ai4.eco.open")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.eco.sectionLog")}>
        {log.length === 0 ? (
          <EmptyState title={tr("admin.ai4.eco.logEmptyTitle")} hint={tr("admin.ai4.eco.logEmptyHint")} />
        ) : (
          <ul className="space-y-2 text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex flex-wrap gap-3 rounded-xl border border-border px-3 py-2">
                <span className="shrink-0 text-xs text-muted-foreground">{l.t}</span>
                <span className="min-w-0 break-words">{l.msg}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>
    </AiShell>
  );
}
