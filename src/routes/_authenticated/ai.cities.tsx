import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2 } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { StatusPill, EmptyState, fmtDate } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  generateCityPage,
  startCityRun,
  processCityRunBatch,
  controlCityRun,
  retryFailedCityPages,
  retrySeoPages,
  previewCityPage,
  cityCatalog,

} from "@/lib/city-landing.functions";
import { landingPathForSlug } from "@/lib/city-landing/data";
import type { PageValidation } from "@/lib/city-landing/validation";
import { useT } from "@/i18n";


export const Route = createFileRoute("/_authenticated/ai/cities")({
  head: () => ({
    meta: [
      { title: "City Landing Agent — Easy Moving" },
      {
        name: "description",
        content: "Generate SEO city landing pages with the embedded moving calculator at scale.",
      },
    ],
  }),
  component: CityLandingDashboard,
});

type PreviewResult = {
  url: string;
  city: string;
  stateCode: string;
  score: number;
  status: string;
  validation: PageValidation;
};


type PageRow = {

  slug: string;
  city: string;
  state_code: string;
  status: string;
  city_status: string;
  index_status: string;
  calculator_status: string;
  clicks: number;
  impressions: number;
  seo_score: number;
  word_count: number;
  generation_ms: number;
  error: string | null;
  seo_status: string | null;
  seo_generation_ms: number | null;
  created_at: string;
  published_at: string | null;
};

type RunRow = {
  id: string;
  scope: string;
  state_code: string | null;
  status: string;
  cursor: number;
  total: number;
  generated: number;
  published: number;
  failed: number;
  skipped: number;
  batch_size: number;
  last_error: string | null;
  created_at: string;
};


function CityLandingDashboard() {
  const tr = useT();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const catalog = useMemo(() => cityCatalog(), []);
  const states = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.stateCode))).sort(),
    [catalog],
  );
  const [city, setCity] = useState(catalog[0]?.landingSlug ?? "");
  const [stateCode, setStateCode] = useState(states[0] ?? "CA");

  const pages = useQuery({
    queryKey: ["city-landing", "pages"],
    queryFn: async (): Promise<PageRow[]> => {
      const { data, error } = await supabase
        .from("city_landing_pages")
        .select(
          "slug, city, state_code, status, city_status, index_status, calculator_status, clicks, impressions, word_count, seo_score, error, seo_status, seo_generation_ms, created_at, published_at, generation_ms",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as PageRow[];
    },
    refetchInterval: 8000,
  });

  const runs = useQuery({
    queryKey: ["city-landing", "runs"],
    queryFn: async (): Promise<RunRow[]> => {
      const { data, error } = await supabase
        .from("city_landing_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as RunRow[];
    },
    refetchInterval: 5000,
  });

  const rows = pages.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const generatedToday = rows.filter((r) => r.created_at.startsWith(today)).length;
  const published = rows.filter((r) => r.status === "published");
  const drafts = rows.filter((r) => r.status !== "published");
  const avgScore = rows.length
    ? Math.round(rows.reduce((a, b) => a + (b.seo_score ?? 0), 0) / rows.length)
    : 0;
  const errors = rows.filter((r) => r.error);
  const failedCities = rows.filter((r) => r.city_status === "failed");
  const indexed = rows.filter((r) => r.index_status === "indexed");
  const clicks = rows.reduce((a, b) => a + (b.clicks ?? 0), 0);
  const publishedToday = published.filter((r) => (r.published_at ?? "").startsWith(today)).length;
  const citiesCompleted = new Set(published.map((r) => r.slug)).size;
  const citiesRemaining = Math.max(catalog.length - citiesCompleted, 0);
  // ── Two-stage production pipeline metrics ──────────────────────────────
  const calculatorsLive = published.length;
  const seoPagesLive = rows.filter((r) => r.seo_status === "published").length;
  const seoRetryQueue = rows.filter(
    (r) => r.status === "published" && r.seo_status !== "published",
  ).length;
  const genDurations = rows
    .map((r) => (r.generation_ms ?? 0) + (r.seo_generation_ms ?? 0))
    .filter((n) => n > 0);
  const avgGenMs = genDurations.length
    ? Math.round(genDurations.reduce((a, b) => a + b, 0) / genDurations.length)
    : 0;
  const activeRun = (runs.data ?? []).find((r) => r.status === "running");
  const skipped = (runs.data ?? []).reduce((a, r) => a + (r.skipped ?? 0), 0);
  // Publishing speed: pages published today per active hour of the day.
  const hoursElapsed = Math.max(new Date().getHours() + new Date().getMinutes() / 60, 1);
  const speed = (publishedToday / hoursElapsed).toFixed(1);
  // Storage: rough content footprint (≈6 bytes/word + facts + validation payload).
  const storageMb = (
    rows.reduce((a, b) => a + (b.word_count ?? 0) * 6 + 4096, 0) /
    (1024 * 1024)
  ).toFixed(2);
  const health =
    errors.length === 0 && failedCities.length === 0
      ? "healthy"
      : failedCities.length > 5
        ? "degraded"
        : "warning";
  const queueStatus = activeRun
    ? `running ${activeRun.cursor}/${activeRun.total}`
    : (runs.data ?? []).some((r) => r.status === "paused")
      ? "paused"
      : "idle";


  const refresh = () => qc.invalidateQueries({ queryKey: ["city-landing"] });

  // ── Autonomous queue: keep processing the running run, no human clicks. ──
  const [autopilot, setAutopilot] = useState(true);
  const [batchSize, setBatchSize] = useState(10);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const ticking = useRef(false);
  useEffect(() => {
    if (!autopilot || !activeRun) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (ticking.current || cancelled) return;
      ticking.current = true;
      try {
        await processCityRunBatch({ data: { runId: activeRun.id, batchSize } });
        refresh();
      } catch {
        /* surfaced through run.last_error */
      } finally {
        ticking.current = false;
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilot, activeRun?.id]);

  async function run<T>(fn: () => Promise<T>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const selected = catalog.find((c) => c.landingSlug === city);

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai2.cities.eyebrow")}
        title={tr("admin.ai2.cities.title")}
        subtitle={tr("admin.ai2.cities.subtitle")}
        icon={<MapPin className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("admin.ai2.cities.stat.citiesCompleted")} value={citiesCompleted} tone="success" />
        <StatCard label={tr("admin.ai2.cities.stat.citiesRemaining")} value={citiesRemaining} />
        <StatCard label={tr("admin.ai2.cities.stat.publishedToday")} value={publishedToday} tone="success" />
        <StatCard label={tr("admin.ai2.cities.stat.generatedToday")} value={generatedToday} />
        <StatCard label={tr("admin.ai2.cities.stat.drafts")} value={drafts.length} tone="warning" />
        <StatCard label={tr("admin.ai2.cities.stat.avgSeoScore")} value={avgScore || "—"} tone="info" />
        <StatCard label={tr("admin.ai2.cities.stat.publishingSpeed")} value={`${speed}/hr`} tone="info" />
        <StatCard label={tr("admin.ai2.cities.stat.skipped")} value={skipped} />
        <StatCard label={tr("admin.ai2.cities.stat.errors")} value={errors.length} tone={errors.length ? "warning" : undefined} />
        <StatCard label={tr("admin.ai2.cities.stat.indexedPages")} value={indexed.length} tone="info" />
        <StatCard label={tr("admin.ai2.cities.stat.organicClicks")} value={clicks} />
        <StatCard label={tr("admin.ai2.cities.stat.storageUsed")} value={`${storageMb} MB`} />
        <StatCard label={tr("admin.ai2.cities.stat.citiesImported")} value={rows.length} />
        <StatCard label={tr("admin.ai2.cities.stat.calculatorsPublished")} value={calculatorsLive} tone="success" />
        <StatCard label={tr("admin.ai2.cities.stat.seoPagesPublished")} value={seoPagesLive} tone="success" />
        <StatCard
          label={tr("admin.ai2.cities.stat.seoRetryQueue")}
          value={seoRetryQueue}
          tone={seoRetryQueue ? "warning" : undefined}
        />
        <StatCard label={tr("admin.ai2.cities.stat.avgGenerationTime")} value={`${(avgGenMs / 1000).toFixed(1)}s`} tone="info" />
        <StatCard
          label={tr("admin.ai2.cities.stat.estCompletion")}
          value={
            activeRun && avgGenMs
              ? `${Math.ceil(((activeRun.total - activeRun.cursor) * avgGenMs) / 60000)} min`
              : "—"
          }
        />
        <StatCard label={tr("admin.ai2.cities.stat.queueStatus")} value={queueStatus} tone="info" />
        <StatCard
          label={tr("admin.ai2.cities.stat.systemHealth")}
          value={health}
          tone={health === "healthy" ? "success" : "warning"}
        />
      </div>


      <SectionShell title={tr("admin.ai2.cities.generate.title")}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{tr("admin.ai2.cities.generate.singleCity")}</label>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {catalog.map((c) => (
                <option key={c.landingSlug} value={c.landingSlug}>
                  {c.city}, {c.stateCode}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={busy || !selected}
            onClick={() =>
              run(
                () =>
                  generateCityPage({
                    data: { citySlug: selected!.slug, stateCode: selected!.stateCode },
                  }),
                tr("admin.ai2.cities.toast.cityGenerated"),
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("admin.ai2.cities.generate.generateButton")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || !selected}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await previewCityPage({
                  data: { citySlug: selected!.slug, stateCode: selected!.stateCode },
                });
                setPreview(res as PreviewResult);
                toast.success(tr("admin.ai2.cities.toast.previewBuilt"));
              } catch (e) {
                toast.error(e instanceof Error ? e.message : tr("admin.ai2.cities.toast.previewFailed"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {tr("admin.ai2.cities.generate.previewButton")}
          </Button>


          <div className="ml-4">
            <label className="block text-xs text-muted-foreground mb-1">{tr("admin.ai2.cities.generate.entireState")}</label>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(() => startCityRun({ data: { scope: "state", stateCode } }), tr("admin.ai2.cities.toast.stateRunStarted"))
            }
          >
            {tr("admin.ai2.cities.generate.startStateRun")}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => startCityRun({ data: { scope: "usa" } }), tr("admin.ai2.cities.toast.usaRunStarted"))}
          >
            {tr("admin.ai2.cities.generate.startUsaRun")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => retryFailedCityPages({ data: {} }), tr("admin.ai2.cities.toast.retriedFailed"))}
          >
            {tr("admin.ai2.cities.generate.retryFailed")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => retrySeoPages({ data: {} }), tr("admin.ai2.cities.toast.seoRetried"))}
          >
            {tr("admin.ai2.cities.generate.retrySeoPages")}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Production order: the calculator page is generated, validated and published first — only
          then is the /movers/{"{city}-{state}"} SEO page generated with that same calculator
          embedded. If the calculator fails, the SEO page is never created; if the SEO page fails,
          the calculator stays live and the SEO page joins the retry queue.
        </p>

        {preview && (
          <div className="mt-4 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={preview.status} />
              <span className="font-medium">
                Preview — {preview.city}, {preview.stateCode}
              </span>
              <span className="text-xs text-muted-foreground">{preview.url}</span>
              <span className="ml-auto text-sm">
                SEO {preview.validation.seoScore} · {preview.validation.words} words ·{" "}
                {preview.validation.passed}/{preview.validation.total} checks
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
            {preview.validation.blockers.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-destructive">
                {preview.validation.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {preview.validation.checks.map((c) => (
                <div key={c.key} className="flex items-start gap-2 text-xs">
                  <span className={c.ok ? "text-emerald-600" : "text-destructive"}>
                    {c.ok ? "✓" : "✕"}
                  </span>
                  <span className="text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Preview mode is read-only — nothing was written or published.
            </p>
          </div>
        )}
      </SectionShell>

      <SectionShell title="Publishing queue / runs">
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autopilot}
              onChange={(e) => setAutopilot(e.target.checked)}
            />
            Autopilot — keep processing the queue automatically until every city is done
          </label>
          <label className="flex items-center gap-2 text-sm">
            Batch size
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
            >
              {[1, 5, 10, 25].map((n) => (
                <option key={n} value={n}>
                  {n} pages / tick
                </option>
              ))}
            </select>
          </label>
        </div>

        {runs.data?.length ? (
          <div className="space-y-3">
            {runs.data.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <StatusPill status={r.status} />
                <span className="font-medium capitalize">
                  {r.scope}
                  {r.state_code ? ` · ${r.state_code}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {r.cursor}/{r.total} processed · {r.published} published · {r.failed} failed · {r.skipped ?? 0} skipped
                </span>
                <div className="ml-auto flex gap-2">
                  {r.status === "running" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => processCityRunBatch({ data: { runId: r.id, batchSize } }),
                            "Batch processed",
                          )
                        }
                      >
                        Process batch
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(() => controlCityRun({ data: { runId: r.id, action: "pause" } }), "Paused")
                        }
                      >
                        Pause
                      </Button>
                    </>
                  )}
                  {r.status === "paused" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        run(() => controlCityRun({ data: { runId: r.id, action: "resume" } }), "Resumed")
                      }
                    >
                      Resume
                    </Button>
                  )}
                  {r.status !== "completed" && r.status !== "stopped" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() => controlCityRun({ data: { runId: r.id, action: "stop" } }), "Stopped")
                      }
                    >
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No runs yet" hint="Start a city, state or nationwide run above." />
        )}
      </SectionShell>

      <SectionShell title="Generated pages">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">City</th>
                  <th className="py-2 pr-3 font-semibold">URL</th>
                  <th className="py-2 pr-3 font-semibold">Words</th>
                  <th className="py-2 pr-3 font-semibold">SEO</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Published</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">
                      {r.city}, {r.state_code}
                    </td>
                    <td className="py-2.5 pr-3">
                      <a
                        href={landingPathForSlug(r.slug)}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {landingPathForSlug(r.slug)}
                      </a>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.word_count}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.seo_score}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{fmtDate(r.published_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No city pages generated yet" hint="Generate your first city above." />
        )}
      </SectionShell>
    </AiShell>
  );
}
