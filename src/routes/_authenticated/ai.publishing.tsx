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
  const qc = useQueryClient();
  const [stage, setStage] = useState<string>("draft");
  const content = useQuery({ queryKey: ["ai", "content"], queryFn: () => listContent() });
  const logs = useQuery({
    queryKey: ["ai", "logs", "publishing_agent"],
    queryFn: () => listLogs({ agentKey: "publishing_agent", limit: 40 }),
  });

  const items = content.data ?? [];
  const inStage = items.filter((i) => i.status === stage);

  async function advance(id: string, from: string) {
    const to = NEXT[from];
    if (!to) return;
    try {
      await setContentStatus([id], to);
      toast.success(`Moved to ${to}`);
      qc.invalidateQueries({ queryKey: ["ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Growth Center"
        title="Publishing Center"
        subtitle="One pipeline for every generated page, article and product page."
        icon={<Send className="h-5 w-5" />}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {PUBLISH_STAGES.map((s) => (
          <button key={s} onClick={() => setStage(s)} className="text-left">
            <StatCard
              label={s}
              value={items.filter((i) => i.status === s).length}
              hint={stage === s ? "Viewing" : undefined}
              tone={s === "failed" ? "danger" : s === "published" ? "success" : "default"}
            />
          </button>
        ))}
      </div>

      <SectionShell title={`Stage: ${stage}`}>
        {inStage.length ? (
          <ul className="divide-y divide-border/60">
            {inStage.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {i.kind.replace(/_/g, " ")} · {i.slug ?? "no slug"} · {fmtDate(i.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={i.status} />
                  {NEXT[i.status] && (
                    <Button size="sm" variant="outline" onClick={() => advance(i.id, i.status)}>
                      Move to {NEXT[i.status]}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={`Nothing in ${stage}`} />
        )}
      </SectionShell>

      <SectionShell title="Publication history">
        <LogList logs={logs.data ?? []} />
      </SectionShell>
    </AiShell>
  );
}
