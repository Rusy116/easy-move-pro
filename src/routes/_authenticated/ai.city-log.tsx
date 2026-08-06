import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { StatusPill, EmptyState, fmtDate } from "@/components/ai/blocks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ai/city-log")({
  head: () => ({
    meta: [
      { title: "Publish Log — City Factory | Easy Moving" },
      {
        name: "description",
        content: "Every city landing page publish attempt with version, SEO score, calculator status, duration and result.",
      },
    ],
  }),
  component: CityPublishLog,
});

type LogRow = {
  id: string;
  slug: string;
  city: string;
  state_code: string;
  version: number;
  seo_score: number;
  calculator_status: string;
  result: string;
  reason: string | null;
  duration_ms: number;
  attempt: number;
  created_at: string;
};

function CityPublishLog() {
  const log = useQuery({
    queryKey: ["city-log"],
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from("city_publish_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
    refetchInterval: 10000,
  });

  const rows = log.data ?? [];
  const publishedRows = rows.filter((r) => r.result === "published");
  const avgMs = publishedRows.length
    ? Math.round(publishedRows.reduce((a, b) => a + b.duration_ms, 0) / publishedRows.length)
    : 0;
  const errors = rows.filter((r) => r.result === "error");

  return (
    <AiShell>
      <PageHeader
        eyebrow="City Calculator Factory"
        title="Publish Log"
        subtitle="Immutable record of every publish attempt: page, city, version, SEO score, calculator status, duration and result."
        icon={<ScrollText className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attempts logged" value={rows.length} />
        <StatCard label="Published" value={publishedRows.length} tone="success" />
        <StatCard label="Errors" value={errors.length} tone={errors.length ? "warning" : undefined} />
        <StatCard label="Avg time / page" value={`${(avgMs / 1000).toFixed(1)}s`} tone="info" />
      </div>

      <SectionShell title="History">
        {rows.length === 0 ? (
          <EmptyState title="No publish attempts yet" hint="Start a batch run from the City Landing Agent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Page ID</th>
                  <th className="py-2 pr-3">City</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Ver.</th>
                  <th className="py-2 pr-3">SEO</th>
                  <th className="py-2 pr-3">Calculator</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Attempt</th>
                  <th className="py-2 pr-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{r.slug}</td>
                    <td className="py-2 pr-3">{r.city}</td>
                    <td className="py-2 pr-3">{r.state_code}</td>
                    <td className="py-2 pr-3 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="py-2 pr-3">v{r.version}</td>
                    <td className="py-2 pr-3">{r.seo_score}</td>
                    <td className="py-2 pr-3 text-xs">{r.calculator_status}</td>
                    <td className="py-2 pr-3 text-xs">{(r.duration_ms / 1000).toFixed(1)}s</td>
                    <td className="py-2 pr-3">{r.attempt}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={r.result} />
                      {r.reason ? (
                        <div className="mt-1 max-w-[22rem] text-xs text-muted-foreground">{r.reason}</div>
                      ) : null}
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
