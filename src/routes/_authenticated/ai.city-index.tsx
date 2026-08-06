import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { StatusPill, EmptyState, fmtDate } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { setCityIndexStatus } from "@/lib/city-landing.functions";
import { landingPathForSlug } from "@/lib/city-landing/data";

export const Route = createFileRoute("/_authenticated/ai/city-index")({
  head: () => ({
    meta: [
      { title: "Index Monitor — City Factory | Easy Moving" },
      {
        name: "description",
        content: "Track sitemap submission, indexing state, crawls, clicks, impressions, CTR and average position for city calculator pages.",
      },
    ],
  }),
  component: CityIndexMonitor,
});

type IndexRow = {
  slug: string;
  city: string;
  state_code: string;
  index_status: string;
  last_crawl: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
  published_at: string | null;
};

const STATUSES = ["pending", "submitted", "indexed", "not_indexed", "rejected"] as const;

function CityIndexMonitor() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const pages = useQuery({
    queryKey: ["city-index"],
    queryFn: async (): Promise<IndexRow[]> => {
      const { data, error } = await supabase
        .from("city_landing_pages")
        .select("slug, city, state_code, index_status, last_crawl, clicks, impressions, ctr, avg_position, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as IndexRow[];
    },
    refetchInterval: 15000,
  });

  const rows = pages.data ?? [];
  const shown = filter === "all" ? rows : rows.filter((r) => r.index_status === filter);
  const count = (s: string) => rows.filter((r) => r.index_status === s).length;
  const clicks = rows.reduce((a, b) => a + b.clicks, 0);
  const impressions = rows.reduce((a, b) => a + b.impressions, 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  const avgPos = rows.length
    ? (rows.reduce((a, b) => a + Number(b.avg_position || 0), 0) / rows.length).toFixed(1)
    : "—";

  async function mark(slug: string, indexStatus: (typeof STATUSES)[number]) {
    try {
      await setCityIndexStatus({ data: { slug, indexStatus } });
      toast.success(`Marked ${indexStatus}`);
      qc.invalidateQueries({ queryKey: ["city-index"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow="City Calculator Factory"
        title="Index Monitor"
        subtitle="Sitemap submission, indexing state and search performance for every published city calculator page."
        icon={<Radar className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Submitted to sitemap" value={rows.length} tone="info" />
        <StatCard label="Indexed" value={count("indexed")} tone="success" />
        <StatCard label="Not indexed" value={count("not_indexed")} tone="warning" />
        <StatCard label="Pending" value={count("pending") + count("submitted")} />
        <StatCard label="Rejected" value={count("rejected")} tone={count("rejected") ? "warning" : undefined} />
        <StatCard label="Organic clicks" value={clicks} />
        <StatCard label="Impressions" value={impressions} />
        <StatCard label="CTR / avg position" value={`${ctr}% · ${avgPos}`} tone="info" />
      </div>

      <SectionShell title="Published pages">
        <div className="mb-3 flex flex-wrap gap-2">
          {["all", ...STATUSES].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState title="No pages in this state" hint="Publish city pages from the City Landing Agent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">City</th>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Index status</th>
                  <th className="py-2 pr-3">Last crawl</th>
                  <th className="py-2 pr-3">Clicks</th>
                  <th className="py-2 pr-3">Impr.</th>
                  <th className="py-2 pr-3">CTR</th>
                  <th className="py-2 pr-3">Avg pos</th>
                  <th className="py-2 pr-3">Mark</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.slug} className="border-t border-border">
                    <td className="py-2 pr-3">
                      {r.city}, {r.state_code}
                    </td>
                    <td className="py-2 pr-3">
                      <a className="text-xs hover:underline" href={landingPathForSlug(r.slug)} target="_blank" rel="noreferrer">
                        {landingPathForSlug(r.slug)}
                      </a>
                    </td>
                    <td className="py-2 pr-3">
                      <StatusPill status={r.index_status} />
                    </td>
                    <td className="py-2 pr-3 text-xs">{r.last_crawl ? fmtDate(r.last_crawl) : "—"}</td>
                    <td className="py-2 pr-3">{r.clicks}</td>
                    <td className="py-2 pr-3">{r.impressions}</td>
                    <td className="py-2 pr-3">{Number(r.ctr).toFixed(2)}%</td>
                    <td className="py-2 pr-3">{Number(r.avg_position).toFixed(1)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => mark(r.slug, "indexed")}>
                          Indexed
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => mark(r.slug, "not_indexed")}>
                          Not indexed
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </AiShell>
  );
}
