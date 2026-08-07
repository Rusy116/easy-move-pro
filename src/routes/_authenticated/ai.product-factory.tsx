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
        `Repair: ${r.renamed} renamed · ${r.repriced} repriced · ${r.categoriesAdded} categories · ${r.backlogAdded} new ideas`,
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const covers = useMutation({
    mutationFn: () => generateProductCovers({ data: { limit: 5 } }),
    onSuccess: (r) => {
      toast.success(`Cover agent: ${r.generated}/${r.attempted} covers generated`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const research = useMutation({
    mutationFn: () => runProductResearch({ data: { count: 12 } }),
    onSuccess: (r) => {
      toast.success(`Research agent: ${r.discovered} keywords · ${r.planned} product ideas`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: () => runProductWorkerTick({ data: { jobs: 2 } }),
    onSuccess: (r) => {
      toast.success(`Worker: ${r.processed} processed · ${r.published} published · ${r.failed} failed`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const improve = useMutation({
    mutationFn: () => runSelfImprovement({ data: { limit: 10 } }),
    onSuccess: (r) => {
      toast.success(`Self-improvement agent updated ${r.improved} products`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settings = useMutation({
    mutationFn: (patch: Record<string, unknown>) => setFactorySettings({ data: patch as never }),
    onSuccess: () => {
      toast.success("Factory settings saved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = useMutation({
    mutationFn: (v: { slug: string; action: string }) => productAdminAction({ data: v }),
    onSuccess: () => {
      toast.success("Done");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dash.isLoading) {
    return (
      <AiShell>
        <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading factory telemetry…
        </div>
      </AiShell>
    );
  }

  const d = dash.data;
  if (!d) {
    return (
      <AiShell>
        <EmptyState title="Factory unavailable" hint="Admin access is required for this console." />
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
        eyebrow="AI Growth Center"
        title="Autonomous Product Factory"
        subtitle="Research → plan → write → design → publish → sell → improve. Continuously, without human input."
        icon={<Factory className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Created today" value={s.createdToday} />
        <StatCard label="Published today" value={s.publishedToday} tone="success" />
        <StatCard label="Published catalog" value={`${s.published} / ${milestone}`} tone="info" />
        <StatCard label="Revenue" value={money(s.revenueCents)} tone="success" />
        <StatCard label="Products sold" value={s.sold} />
        <StatCard label="Waiting in queue" value={s.waiting} />
        <StatCard label="Being generated" value={s.generating} tone="info" />
        <StatCard label="Failed jobs" value={s.failed} tone={s.failed ? "danger" : "default"} />
        <StatCard label="Avg SEO score" value={s.avgSeo} tone={s.avgSeo >= 95 ? "success" : "default"} />
        <StatCard label="Avg quality" value={s.avgQuality} />
        <StatCard label="Views" value={s.views.toLocaleString()} />
        <StatCard label="Conversion" value={`${conversion}%`} tone="info" />
      </div>

      <SectionShell title="Autonomous worker">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={!!d.settings.autopilot}
              onCheckedChange={(v) => settings.mutate({ autopilot: v })}
            />
            Autopilot {d.settings.autopilot ? "on" : "off"}
          </label>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">Daily target</Label>
              <Input
                className="h-9 w-24"
                inputMode="numeric"
                value={target === "" ? String(d.settings.daily_target) : target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Batch size</Label>
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
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => research.mutate()} disabled={busy}>
              Run research agent
            </Button>
            <Button onClick={() => tick.mutate()} disabled={busy} variant="secondary">
              Run production tick
            </Button>
            <Button onClick={() => improve.mutate()} disabled={busy} variant="outline">
              Run self-improvement
            </Button>
            <Button onClick={() => repair.mutate()} disabled={busy} variant="outline">
              Repair catalog
            </Button>
            <Button onClick={() => covers.mutate()} disabled={busy} variant="outline">
              Generate covers
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Publishing gate: minimum SEO score {d.settings.min_seo_score}. Autopilot also runs server-side every minute
          via the scheduled worker, independent of this browser tab.
        </p>
      </SectionShell>

      <SectionShell title="Commercial readiness">
        {r ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Average price" value={money(r.avgPriceCents)} tone="success" />
              <StatCard
                label="Missing a price"
                value={r.missingPrice}
                tone={r.missingPrice ? "danger" : "success"}
              />
              <StatCard
                label="Missing cover image"
                value={r.missingCover}
                tone={r.missingCover ? "warning" : "success"}
              />
              <StatCard label="Duplicate-word names" value={r.badNames} tone={r.badNames ? "danger" : "success"} />
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
          <EmptyState title="Readiness report loading" />
        )}
      </SectionShell>

      <SectionShell title="Production queue">
        {d.jobs.length ? (

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Stage</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Attempts</th>
                  <th className="py-2 font-semibold">Last error</th>
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
          <EmptyState title="Queue empty" hint="Run the research agent to stock the backlog." />
        )}
      </SectionShell>

      <SectionShell title="Top keywords">
        {d.keywords.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Keyword</th>
                  <th className="py-2 pr-3 font-semibold">Cluster</th>
                  <th className="py-2 pr-3 font-semibold">Source</th>
                  <th className="py-2 pr-3 font-semibold">Intent</th>
                  <th className="py-2 pr-3 font-semibold">Volume</th>
                  <th className="py-2 pr-3 font-semibold">Difficulty</th>
                  <th className="py-2 font-semibold">Opportunity</th>
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
          <EmptyState title="No keyword research yet" hint="The Research Agent builds this database." />
        )}
      </SectionShell>

      <SectionShell title="Catalog controls">
        {d.products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">SEO</th>
                  <th className="py-2 pr-3 font-semibold">Quality</th>
                  <th className="py-2 pr-3 font-semibold">Price</th>
                  <th className="py-2 pr-3 font-semibold">Downloads</th>
                  <th className="py-2 font-semibold">Actions</th>
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
                        {["approve", "pause", "rebuild", "duplicate", "archive"].map((a) => (
                          <Button
                            key={a}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs capitalize"
                            disabled={action.isPending}
                            onClick={() => action.mutate({ slug: p.slug, action: a })}
                          >
                            {a}
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
          <EmptyState title="Catalog empty" hint="Run a production tick to create the first products." />
        )}
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Worker runs">
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
            <EmptyState title="No worker runs yet" />
          )}
        </SectionShell>

        <SectionShell title="Publishing & AI logs">
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
            <EmptyState title="No publishing activity yet" />
          )}
        </SectionShell>
      </div>
    </AiShell>
  );
}
