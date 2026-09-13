import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell } from "@/components/shell/Chrome";
import { EmptyState } from "@/components/ai/blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/i18n";
import {
  approveCandidate,
  listCandidateReview,
  rejectCandidate,
  snoozeCandidate,
  unsnoozeCandidate,
} from "@/lib/demand/candidate-review.functions";

export const Route = createFileRoute("/_authenticated/ai/candidate-review")({
  head: () => ({
    meta: [
      { title: "Product Candidate Review — PDF Factory | Easy Moving" },
      {
        name: "description",
        content:
          "Admin review queue for real Search Console demand candidates before they enter the automatic PDF product factory.",
      },
    ],
  }),
  component: CandidateReviewPage,
});

type View = "pending" | "snoozed" | "decided";

function CandidateReviewPage() {
  const t = useT();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const queue = useQuery({
    queryKey: ["pdf-candidate-review", view],
    queryFn: async () => listCandidateReview({ data: { view } }),
  });

  const run = async (key: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusy(key);
    try {
      const res = (await fn()) as { ok?: boolean; reason?: string };
      if (res && res.ok === false) toast.error(res.reason ?? t("aip.candidateReview.toast.failed"));
      else toast.success(okMessage);
      await qc.invalidateQueries({ queryKey: ["pdf-candidate-review"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aip.candidateReview.toast.failed"));
    } finally {
      setBusy(null);
    }
  };

  const categories = queue.data?.categories ?? [];

  return (
    <AiShell>
      <PageHeader
        eyebrow={t("aip.candidateReview.eyebrow")}
        title={t("aip.candidateReview.title")}
        subtitle={t("aip.candidateReview.subtitle")}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["pending", "snoozed", "decided"] as View[]).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={view === v ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setView(v)}
          >
            {t(`aip.candidateReview.view.${v}`)}
          </Button>
        ))}
        <Badge variant="secondary" className="ml-auto gap-1">
          <ShieldCheck className="h-3 w-3" />
          {t("aip.candidateReview.evidenceBadge")}
        </Badge>
      </div>

      <SectionShell title={t("aip.candidateReview.queueTitle")}>
        {queue.isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("aip.candidateReview.loading")}
          </div>
        ) : !queue.data?.groups.length ? (
          <EmptyState
            title={t("aip.candidateReview.empty.title")}
            hint={t("aip.candidateReview.empty.hint")}
          />
        ) : (
          <div className="space-y-6 p-1">
            {queue.data.groups.map((group) => (
              <div key={group.slug} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg">{group.candidates[0]?.title}</h3>
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{group.slug}</code>
                  {group.candidates.length > 1 && (
                    <Badge variant="destructive">{t("aip.candidateReview.duplicateGroup")}</Badge>
                  )}
                  {group.slugTaken && <Badge variant="outline">{t("aip.candidateReview.slugTaken")}</Badge>}
                  {group.slugAlreadyApproved && (
                    <Badge variant="outline">{t("aip.candidateReview.alreadyApproved")}</Badge>
                  )}
                </div>
                {group.candidates.length > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("aip.candidateReview.combinedImpressions", { count: group.combinedImpressions })}
                  </p>
                )}

                <div className="mt-4 space-y-4">
                  {group.candidates.map((c, index) => {
                    const ev = (c.evidence ?? {}) as Record<string, any>;
                    const selected = category[c.id] ?? c.category_slug;
                    return (
                      <div key={c.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {index === 0
                              ? t("aip.candidateReview.primary")
                              : t("aip.candidateReview.relatedEvidence")}
                          </Badge>
                          <Badge variant="secondary">{t("aip.candidateReview.realGsc")}</Badge>
                          <span className="text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                          <Field label={t("aip.candidateReview.field.query")} value={String(ev["query"] ?? c.keyword)} />
                          <Field
                            label={t("aip.candidateReview.field.impressions")}
                            value={String(ev["impressions"] ?? "—")}
                          />
                          <Field
                            label={t("aip.candidateReview.field.position")}
                            value={ev["avg_position"] ? Number(ev["avg_position"]).toFixed(1) : "—"}
                          />
                          <Field
                            label={t("aip.candidateReview.field.window")}
                            value={`${ev["window_start"] ?? "—"} → ${ev["window_end"] ?? "—"}`}
                          />
                          <Field
                            label={t("aip.candidateReview.field.confidence")}
                            value={c.confidence == null ? "—" : String(c.confidence)}
                          />
                          <Field
                            label={t("aip.candidateReview.field.score")}
                            value={c.priority == null ? "—" : String(c.priority)}
                          />
                          <Field
                            label={t("aip.candidateReview.field.category")}
                            value={c.categoryValid ? c.category_slug : `${c.category_slug} ⚠`}
                          />
                          <Field
                            label={t("aip.candidateReview.field.approval")}
                            value={c.approval}
                          />
                        </dl>

                        {view === "pending" && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Select
                              value={selected}
                              onValueChange={(v) => setCategory((s) => ({ ...s, [c.id]: v }))}
                            >
                              <SelectTrigger className="h-9 w-48">
                                <SelectValue placeholder={t("aip.candidateReview.field.category")} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.slug} value={cat.slug}>
                                    {cat.name} ({cat.slug})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              disabled={busy === c.id}
                              onClick={() =>
                                run(
                                  c.id,
                                  () => approveCandidate({ data: { id: c.id, categorySlug: selected } }),
                                  t("aip.candidateReview.toast.approved"),
                                )
                              }
                            >
                              {t("aip.candidateReview.approve")}
                            </Button>

                            <Input
                              className="h-9 w-52"
                              placeholder={t("aip.candidateReview.reasonPlaceholder")}
                              value={reason[c.id] ?? ""}
                              onChange={(e) => setReason((s) => ({ ...s, [c.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy === c.id}
                              onClick={() =>
                                run(
                                  c.id,
                                  () => rejectCandidate({ data: { id: c.id, reason: reason[c.id] ?? "" } }),
                                  t("aip.candidateReview.toast.rejected"),
                                )
                              }
                            >
                              {t("aip.candidateReview.reject")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === c.id}
                              onClick={() =>
                                run(
                                  c.id,
                                  () => snoozeCandidate({ data: { id: c.id, days: 30 } }),
                                  t("aip.candidateReview.toast.snoozed"),
                                )
                              }
                            >
                              {t("aip.candidateReview.snooze")}
                            </Button>
                          </div>
                        )}

                        {view === "snoozed" && (
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {t("aip.candidateReview.snoozedUntil", {
                                date: c.snooze_until ? new Date(c.snooze_until).toLocaleDateString() : "—",
                              })}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === c.id}
                              onClick={() =>
                                run(
                                  c.id,
                                  () => unsnoozeCandidate({ data: { id: c.id } }),
                                  t("aip.candidateReview.toast.returned"),
                                )
                              }
                            >
                              {t("aip.candidateReview.returnToReview")}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="px-1 pt-4 text-xs text-muted-foreground">{t("aip.candidateReview.footnote")}</p>
      </SectionShell>
    </AiShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
