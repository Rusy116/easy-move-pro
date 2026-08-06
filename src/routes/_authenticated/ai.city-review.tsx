import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, ExternalLink, Loader2 } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { StatusPill, EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reviewCityPage, publishCityPage } from "@/lib/city-landing.functions";
import { landingPathForSlug } from "@/lib/city-landing/data";
import type { PageValidation } from "@/lib/city-landing/validation";

export const Route = createFileRoute("/_authenticated/ai/city-review")({
  head: () => ({
    meta: [
      { title: "Draft Review Queue — City Factory | Easy Moving" },
      {
        name: "description",
        content: "Review blocked city calculator landing pages, inspect validation errors and approve or reject publishing.",
      },
    ],
  }),
  component: DraftReviewQueue,
});

type DraftRow = {
  slug: string;
  city: string;
  state_code: string;
  status: string;
  city_status: string;
  seo_score: number;
  word_count: number;
  calculator_status: string;
  schema_valid: boolean;
  internal_links: number;
  canonical_url: string | null;
  blocked_reason: string | null;
  index_status: string;
  validation: PageValidation | null;
  content: { title?: string; metaDescription?: string } | null;
};

function DraftReviewQueue() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const drafts = useQuery({
    queryKey: ["city-review", "drafts"],
    queryFn: async (): Promise<DraftRow[]> => {
      const { data, error } = await supabase
        .from("city_landing_pages")
        .select(
          "slug, city, state_code, status, city_status, seo_score, word_count, calculator_status, schema_valid, internal_links, canonical_url, blocked_reason, index_status, validation, content",
        )
        .neq("status", "published")
        .order("seo_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as DraftRow[];
    },
    refetchInterval: 10000,
  });

  const rows = drafts.data ?? [];
  const failed = rows.filter((r) => r.city_status === "failed");
  const calcBroken = rows.filter((r) => r.calculator_status !== "ok");
  const schemaBroken = rows.filter((r) => !r.schema_valid);

  async function act(slug: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(slug);
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["city-review"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow="City Calculator Factory"
        title="Draft Review Queue"
        subtitle="Pages blocked by the pre-publish gate. Review the reason, approve, republish or reject."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In review" value={rows.length} tone="warning" />
        <StatCard label="Failed (error queue)" value={failed.length} tone={failed.length ? "warning" : undefined} />
        <StatCard label="Calculator issues" value={calcBroken.length} />
        <StatCard label="Schema issues" value={schemaBroken.length} />
      </div>

      <SectionShell title="Blocked pages">
        {rows.length === 0 ? (
          <EmptyState title="Nothing to review" hint="Every generated page passed the pre-publish gate." />
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const v = r.validation;
              const expanded = open === r.slug;
              return (
                <div key={r.slug} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={r.city_status || r.status} />
                    <span className="font-medium">
                      {r.city}, {r.state_code}
                    </span>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      href={landingPathForSlug(r.slug)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {landingPathForSlug(r.slug)} <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-xs">SEO {r.seo_score}</span>
                    <span className="text-xs">{r.word_count} words</span>
                    <span className="text-xs">Calculator: {r.calculator_status}</span>
                    <span className="text-xs">Schema: {r.schema_valid ? "valid" : "invalid"}</span>
                    <span className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpen(expanded ? null : r.slug)}>
                        {expanded ? "Hide" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === r.slug}
                        onClick={() => act(r.slug, () => publishCityPage({ data: { slug: r.slug, force: true } }), "Republished")}
                      >
                        {busy === r.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : "Republish"}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === r.slug}
                        onClick={() => act(r.slug, () => reviewCityPage({ data: { slug: r.slug, action: "approve" } }), "Approved & published")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.slug}
                        onClick={() => act(r.slug, () => reviewCityPage({ data: { slug: r.slug, action: "reject" } }), "Rejected")}
                      >
                        Reject
                      </Button>
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Blocked: {r.blocked_reason ?? "—"}
                  </p>

                  {expanded && (
                    <div className="mt-3 grid gap-4 border-t border-border pt-3 md:grid-cols-2">
                      <div className="space-y-1 text-xs">
                        <p><span className="text-muted-foreground">URL:</span> {r.canonical_url ?? "—"}</p>
                        <p><span className="text-muted-foreground">Title:</span> {r.content?.title ?? "—"}</p>
                        <p><span className="text-muted-foreground">Meta:</span> {r.content?.metaDescription ?? "—"}</p>
                        <p><span className="text-muted-foreground">Content length:</span> {r.word_count} words</p>
                        <p><span className="text-muted-foreground">Internal links:</span> {r.internal_links}</p>
                        <p><span className="text-muted-foreground">Index status:</span> {r.index_status}</p>
                      </div>
                      <div className="space-y-2 text-xs">
                        <p className="font-medium">Validation ({v ? `${v.passed}/${v.total} passed` : "not run"})</p>
                        <ul className="space-y-1">
                          {(v?.checks ?? [])
                            .filter((c) => !c.ok)
                            .map((c) => (
                              <li key={c.key} className="text-destructive">
                                ✕ {c.label}
                                {c.detail ? ` — ${c.detail}` : ""}
                              </li>
                            ))}
                        </ul>
                        {v?.suggestedFixes?.length ? (
                          <div>
                            <p className="mt-2 font-medium">Suggested fixes</p>
                            <ul className="list-disc pl-4 text-muted-foreground">
                              {v.suggestedFixes.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionShell>
    </AiShell>
  );
}
