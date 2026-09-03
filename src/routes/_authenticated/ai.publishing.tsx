import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { EmptyState, LogList, StatusPill, fmtDate } from "@/components/ai/blocks";
import { PUBLISH_STAGES } from "@/lib/ai/registry";
import { listContent, listLogs, setContentStatus } from "@/lib/ai/api";
import { useT } from "@/i18n";

export const Route = createFileRoute("/_authenticated/ai/publishing")({
  head: () => ({
    meta: [
      { title: "Publishing Center — Easy Moving" },
      { name: "description", content: "Move content through review, approval and publication." },
    ],
  }),
  component: PublishingCenter,
});

const NEXT: Record<string, string | null> = {
  draft: "review",
  review: "approved",
  approved: "scheduled",
  scheduled: "publishing",
  publishing: "published",
  published: "archived",
  failed: "review",
  archived: null,
};

function PublishingCenter() {
  const tr = useT();
  const qc = useQueryClient();
  const [stage, setStage] = useState<string>("draft");
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const logs = useQuery({
    queryKey: ["ai", "logs", "publishing_agent"],
    queryFn: () => listLogs({ agentKey: "publishing_agent", limit: 40 }),
  });

  const items = content.data ?? [];
  const inStage = items.filter((i) => i.status === stage);

  function stageLabel(s: string) {
    const key = `admin.ai3.publishing.stage.${s}`;
    const label = tr(key);
    return label === key ? s : label;
  }

  async function advance(id: string, from: string) {
    const to = NEXT[from];
    if (!to) return;
    try {
      await setContentStatus([id], to);
      toast.success(tr("admin.ai3.publishing.toastMoved", { stage: stageLabel(to) }));
      qc.invalidateQueries({ queryKey: ["ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai3.publishing.toastUpdateFailed"));
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai.dashboard.eyebrow")}
        title={tr("admin.ai3.publishing.title")}
        subtitle={tr("admin.ai3.publishing.subtitle")}
        icon={<Send className="h-5 w-5" />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {PUBLISH_STAGES.map((s) => (
          <button key={s} onClick={() => setStage(s)} className="text-left">
            <StatCard
              label={stageLabel(s)}
              value={items.filter((i) => i.status === s).length}
              hint={stage === s ? tr("admin.ai3.publishing.viewing") : undefined}
              tone={s === "failed" ? "danger" : s === "published" ? "success" : "default"}
            />
          </button>
        ))}
      </div>

      <SectionShell title={tr("admin.ai3.publishing.stageTitle", { stage: stageLabel(stage) })}>
        {inStage.length ? (
          <ul className="divide-y divide-border/60">
            {inStage.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {i.kind.replace(/_/g, " ")} · {i.slug ?? tr("admin.ai3.publishing.noSlug")} · {fmtDate(i.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={i.status} />
                  {NEXT[i.status] && (
                    <Button size="sm" variant="outline" onClick={() => advance(i.id, i.status)}>
                      {tr("admin.ai3.publishing.moveTo", { stage: stageLabel(NEXT[i.status]!) })}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={tr("admin.ai3.publishing.emptyStageTitle", { stage: stageLabel(stage) })} />
        )}
      </SectionShell>

      <SectionShell title={tr("admin.ai3.publishing.history")}>
        <LogList logs={logs.data ?? []} />
      </SectionShell>
    </AiShell>
  );
}
