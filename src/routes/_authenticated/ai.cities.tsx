import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  cityCatalog,
} from "@/lib/city-landing.functions";

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

type PageRow = {
  slug: string;
  city: string;
  state_code: string;
  status: string;
  seo_score: number;
  word_count: number;
  error: string | null;
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
  last_error: string | null;
  created_at: string;
};

function CityLandingDashboard() {
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
        .select("slug, city, state_code, status, seo_score, word_count, error, created_at, published_at")
        .order("created_at", { ascending: false })
        .limit(200);
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

  const refresh = () => qc.invalidateQueries({ queryKey: ["city-landing"] });

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
        eyebrow="AI Growth Center"
        title="City Landing & Calculator Agent"
        subtitle="Generates /moving-calculator-{city}-{state} landing pages with the existing Easy Moving calculator embedded."
        icon={<MapPin className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Cities generated today" value={generatedToday} />
        <StatCard label="Pages published" value={published.length} tone="success" />
        <StatCard label="Drafts" value={drafts.length} tone="warning" />
        <StatCard label="Avg SEO score" value={avgScore || "—"} tone="info" />
        <StatCard label="Errors" value={errors.length} tone={errors.length ? "warning" : undefined} />
      </div>

      <SectionShell title="Generate">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Single city</label>
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
                "City page generated",
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate city"}
          </Button>

          <div className="ml-4">
            <label className="block text-xs text-muted-foreground mb-1">Entire state</label>
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
              run(() => startCityRun({ data: { scope: "state", stateCode } }), "State run started")
            }
          >
            Start state run
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => startCityRun({ data: { scope: "usa" } }), "USA run started")}
          >
            Start USA run
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => retryFailedCityPages({ data: {} }), "Retried failed pages")}
          >
            Retry failed
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Pages scoring above 95 publish automatically; everything else stays a draft with the SEO
          issues attached.
        </p>
      </SectionShell>

      <SectionShell title="Publishing queue / runs">
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
                  {r.cursor}/{r.total} processed · {r.published} published · {r.failed} failed
                </span>
                <div className="ml-auto flex gap-2">
                  {r.status === "running" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => processCityRunBatch({ data: { runId: r.id, batchSize: 3 } }),
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
                        href={`/${r.slug}`}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        /{r.slug}
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
