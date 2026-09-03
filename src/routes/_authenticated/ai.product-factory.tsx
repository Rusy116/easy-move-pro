import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductThumb } from "@/components/store/ProductThumb";
import { useT } from "@/i18n";
import {
  productFactoryDashboard,
  productAdminAction,
  productReadinessReport,
  repairCatalogNow,
  generateProductCovers,
  runProductResearch,
  runProductWorkerTick,
  runSelfImprovement,
  setFactorySettings,
} from "@/lib/pdf-ecosystem.functions";
import { nextMilestone } from "@/lib/pdf-store/research";
import { money, TOTAL_PDF_STAGES } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/_authenticated/ai/product-factory")({
  head: () => ({
    meta: [
      { title: "Autonomous Product Factory — Easy Moving" },
      {
        name: "description",
        content: "Research, production, publishing and self-improvement console for the digital product ecosystem.",
      },
    ],
  }),
  component: ProductFactoryConsole,
});

function ProductFactoryConsole() {
  const tr = useT();
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["pdf", "factory"], queryFn: () => productFactoryDashboard() });
  const readiness = useQuery({ queryKey: ["pdf", "readiness"], queryFn: () => productReadinessReport() });
  const [target, setTarget] = useState<string>("");
  const [batch, setBatch] = useState<string>("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pdf", "factory"] });
    qc.invalidateQueries({ queryKey: ["pdf", "readiness"] });
  };

  const repair = useMutation({
    mutationFn: () => repairCatalogNow(),
    onSuccess: (r) => {
      toast.success(
        tr("admin.ai4.pf.repairToast", {
          renamed: String(r.renamed),
          repriced: String(r.repriced),
          categories: String(r.categoriesAdded),
          backlog: String(r.backlogAdded),
        }),
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const covers = useMutation({
    mutationFn: () => generateProductCovers({ data: { limit: 5 } }),
    onSuccess: (r) => {
      toast.success(tr("admin.ai4.pf.coversToast", { generated: String(r.generated), attempted: String(r.attempted) }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const research = useMutation({
    mutationFn: () => runProductResearch({ data: { count: 12 } }),
    onSuccess: (r) => {
      toast.success(tr("admin.ai4.pf.researchToast", { discovered: String(r.discovered), planned: String(r.planned) }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: () => runProductWorkerTick({ data: { jobs: 2 } }),
    onSuccess: (r) => {
      toast.success(tr("admin.ai4.pf.workerToast", { processed: String(r.processed), published: String(r.published), failed: String(r.failed) }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const improve = useMutation({
    mutationFn: () => runSelfImprovement({ data: { limit: 10 } }),
    onSuccess: (r) => {
      toast.success(tr("admin.ai4.pf.improveToast", { improved: String(r.improved) }));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settings = useMutation({
    mutationFn: (patch: Record<string, unknown>) => setFactorySettings({ data: patch as never }),
    onSuccess: () => {
      toast.success(tr("admin.ai4.pf.settingsSaved"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = useMutation({
    mutationFn: (v: { slug: string; action: string }) => productAdminAction({ data: v }),
    onSuccess: () => {
      toast.success(tr("admin.ai4.pf.done"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dash.isLoading) {
    return (
      <AiShell>
        <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {tr("admin.ai4.pf.loading")}
        </div>
      </AiShell>
    );
  }

  const d = dash.data;
  if (!d) {
    return (
      <AiShell>
        <EmptyState title={tr("admin.ai4.pf.unavailableTitle")} hint={tr("admin.ai4.pf.unavailableHint")} />
      </AiShell>
    );
  }

  const s = d.stats;
  const conversion = s.views ? ((s.downloads / s.views) * 100).toFixed(1) : "0.0";
  const milestone = nextMilestone(s.published);
  const busy =
    research.isPending || tick.isPending || improve.isPending || repair.isPending || covers.isPending;
  const r = readiness.data;

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai4.pf.eyebrow")}
        title={tr("admin.ai4.pf.title")}
        subtitle={tr("admin.ai4.pf.subtitle")}
        icon={<Factory className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai4.pf.statCreatedToday")} value={s.createdToday} />
        <StatCard label={tr("admin.ai4.pf.statPublishedToday")} value={s.publishedToday} tone="success" />
        <StatCard label={tr("admin.ai4.pf.statPublishedCatalog")} value={`${s.published} / ${milestone}`} tone="info" />
        <StatCard label={tr("admin.ai4.pf.statRevenue")} value={money(s.revenueCents)} tone="success" />
        <StatCard label={tr("admin.ai4.pf.statSold")} value={s.sold} />
        <StatCard label={tr("admin.ai4.pf.statWaiting")} value={s.waiting} />
        <StatCard label={tr("admin.ai4.pf.statGenerating")} value={s.generating} tone="info" />
        <StatCard label={tr("admin.ai4.pf.statFailed")} value={s.failed} tone={s.failed ? "danger" : "default"} />
        <StatCard label={tr("admin.ai4.pf.statAvgSeo")} value={s.avgSeo} tone={s.avgSeo >= 95 ? "success" : "default"} />
        <StatCard label={tr("admin.ai4.pf.statAvgQuality")} value={s.avgQuality} />
        <StatCard label={tr("admin.ai4.pf.statViews")} value={s.views.toLocaleString()} />
        <StatCard label={tr("admin.ai4.pf.statConversion")} value={`${conversion}%`} tone="info" />
      </div>

      <SectionShell title={tr("admin.ai4.pf.sectionWorker")}>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={!!d.settings.autopilot}
              onCheckedChange={(v) => settings.mutate({ autopilot: v })}
            />
            {tr("admin.ai4.pf.autopilot", { state: d.settings.autopilot ? tr("admin.ai4.pf.on") : tr("admin.ai4.pf.off") })}
          </label>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">{tr("admin.ai4.pf.dailyTarget")}</Label>
              <Input
                className="h-9 w-24"
                inputMode="numeric"
                value={target === "" ? String(d.settings.daily_target) : target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">{tr("admin.ai4.pf.batchSize")}</Label>
              <Input
                className="h-9 w-24"
                inputMode="numeric"
                value={batch === "" ? String(d.settings.batch_size) : batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                settings.mutate({
                  daily_target: Number(target || d.settings.daily_target),
                  batch_size: Number(batch || d.settings.batch_size),
                })
              }
            >
              {tr("admin.ai4.pf.save")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => research.mutate()} disabled={busy}>
              {tr("admin.ai4.pf.runResearchAgent")}
            </Button>
            <Button onClick={() => tick.mutate()} disabled={busy} variant="secondary">
              {tr("admin.ai4.pf.runProductionTick")}
            </Button>
            <Button onClick={() => improve.mutate()} disabled={busy} variant="outline">
              {tr("admin.ai4.pf.runSelfImprovement")}
            </Button>
            <Button onClick={() => repair.mutate()} disabled={busy} variant="outline">
              {tr("admin.ai4.pf.repairCatalog")}
            </Button>
            <Button onClick={() => covers.mutate()} disabled={busy} variant="outline">
              {tr("admin.ai4.pf.generateCovers")}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {tr("admin.ai4.pf.publishingGate", { score: String(d.settings.min_seo_score) })}
        </p>
      </SectionShell>

      <SectionShell title={tr("admin.ai4.pf.sectionReadiness")}>
        {r ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={tr("admin.ai4.pf.avgPrice")} value={money(r.avgPriceCents)} tone="success" />
              <StatCard
                label={tr("admin.ai4.pf.missingPrice")}
                value={r.missingPrice}
                tone={r.missingPrice ? "danger" : "success"}
              />
              <StatCard
                label={tr("admin.ai4.pf.missingCover")}
                value={r.missingCover}
                tone={r.missingCover ? "warning" : "success"}
              />
              <StatCard label={tr("admin.ai4.pf.duplicateNames")} value={r.badNames} tone={r.badNames ? "danger" : "success"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.categories.map((c) => (
                <span
                  key={c.slug}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    c.published >= 4 ? "border-border text-muted-foreground" : "border-destructive text-destructive"
                  }`}
                >
                  {c.name}: {c.published}
                </span>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title={tr("admin.ai4.pf.readinessLoading")} />
        )}
      </SectionShell>

      <SectionShell title={tr("admin.ai4.pf.sectionQueue")}>
        {d.jobs.length ? (

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colProduct")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colStage")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colStatus")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colAttempts")}</th>
                  <th className="py-2 font-semibold">{tr("admin.ai4.pf.colLastError")}</th>
                </tr>
              </thead>
              <tbody>
                {d.jobs.slice(0, 30).map((j) => (
                  <tr key={j.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{j.title}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {j.stage}/{TOTAL_PDF_STAGES}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={j.status} />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{j.attempts ?? 0}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{j.last_error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={tr("admin.ai4.pf.queueEmptyTitle")} hint={tr("admin.ai4.pf.queueEmptyHint")} />
        )}
      </SectionShell>

      <SectionShell title={tr("admin.ai4.pf.sectionKeywords")}>
        {d.keywords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colKeyword")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colCluster")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colSource")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colIntent")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colVolume")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colDifficulty")}</th>
                  <th className="py-2 font-semibold">{tr("admin.ai4.pf.colOpportunity")}</th>
                </tr>
              </thead>
              <tbody>
                {d.keywords.slice(0, 25).map((k) => (
                  <tr key={k.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3">{k.keyword}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{k.cluster ?? "—"}</td>
                    <td className="py-2.5 pr-3 capitalize text-muted-foreground">{k.source}</td>
                    <td className="py-2.5 pr-3 capitalize text-muted-foreground">{k.intent}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{k.volume_score}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{k.difficulty_score}</td>
                    <td className="py-2.5 tabular-nums font-semibold">{k.opportunity_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={tr("admin.ai4.pf.noKeywordsTitle")} hint={tr("admin.ai4.pf.noKeywordsHint")} />
        )}
      </SectionShell>

      <SectionShell title={tr("admin.ai4.pf.sectionCatalog")}>
        {d.products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colProduct")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colStatus")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colSeo")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colQuality")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colPrice")}</th>
                  <th className="py-2 pr-3 font-semibold">{tr("admin.ai4.pf.colDownloads")}</th>
                  <th className="py-2 font-semibold">{tr("admin.ai4.pf.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {d.products.slice(0, 40).map((p) => (
                  <tr key={p.slug} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          slug={p.slug}
                          title={p.title}
                          coverUrl={p.cover_url}
                          spec={p.cover_spec}
                        />
                        <span>{p.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.seo_score ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.quality_score ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{money(p.price_cents)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.downloads ?? 0}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(["approve", "pause", "rebuild", "duplicate", "archive"] as const).map((a) => (
                          <Button
                            key={a}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs capitalize"
                            disabled={action.isPending}
                            onClick={() => action.mutate({ slug: p.slug, action: a })}
                          >
                            {tr(`admin.ai4.pf.action${a.charAt(0).toUpperCase()}${a.slice(1)}`)}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={tr("admin.ai4.pf.catalogEmptyTitle")} hint={tr("admin.ai4.pf.catalogEmptyHint")} />
        )}
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title={tr("admin.ai4.pf.sectionWorkerRuns")}>
          {d.runs.length ? (
            <ul className="space-y-2 text-sm">
              {d.runs.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">
                    {fmtDate(r.created_at)} · {r.trigger}
                  </span>
                  <span className="tabular-nums">
                    {r.processed} processed · {r.published} published · {r.failed} failed · {r.discovered} keywords
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={tr("admin.ai4.pf.noWorkerRuns")} />
          )}
        </SectionShell>

        <SectionShell title={tr("admin.ai4.pf.sectionLogs")}>
          {d.logs.length ? (
            <ul className="space-y-2 text-sm">
              {d.logs.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-2">
                  <span className="font-medium">{l.product_slug}</span>
                  <span className="text-muted-foreground">
                    {l.action} — {l.detail ?? ""} · {fmtDate(l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={tr("admin.ai4.pf.noLogs")} />
          )}
        </SectionShell>
      </div>
    </AiShell>
  );
}
