import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, Play, Pause, Square, Settings2, History, ScrollText, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill, Progress, LogList, TaskTable, fmtDate } from "@/components/ai/blocks";
import { useT } from "@/i18n";
import {
  listAgents,
  listLogs,
  listTasks,
  setAgentState,
  type AgentAction,
  type AiAgent,
} from "@/lib/ai/api";

export const Route = createFileRoute("/_authenticated/ai/workforce")({
  head: () => ({
    meta: [
      { title: "AI Workforce — Easy Moving" },
      { name: "description", content: "Monitor and control every AI agent in the growth stack." },
    ],
  }),
  component: WorkforcePage,
});

type PanelKind = "history" | "logs" | "configure";

function WorkforcePage() {
  const tr = useT();
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents });
  const [panel, setPanel] = useState<{ agent: AiAgent; kind: PanelKind } | null>(null);

  const history = useQuery({
    queryKey: ["ai", "tasks", panel?.agent.key, panel?.kind],
    queryFn: () => listTasks({ agentKey: panel!.agent.key, limit: 40 }),
    enabled: !!panel && panel.kind === "history",
  });
  const logs = useQuery({
    queryKey: ["ai", "logs", panel?.agent.key, panel?.kind],
    queryFn: () => listLogs({ agentKey: panel!.agent.key, limit: 80 }),
    enabled: !!panel && panel.kind === "logs",
  });

  async function act(agent: AiAgent, action: AgentAction) {
    try {
      await setAgentState(agent, action);
      toast.success(tr("admin.ai4.wf.actionToast", { agent: agent.name, action }));
      qc.invalidateQueries({ queryKey: ["ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.ai4.wf.actionFailed"));
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow={tr("admin.ai4.wf.eyebrow")}
        title={tr("admin.ai4.wf.title")}
        subtitle={tr("admin.ai4.wf.subtitle")}
        icon={<Bot className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["ai"] })}
          >
            <RotateCw className="mr-2 h-4 w-4" /> {tr("admin.ai4.wf.refresh")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {(agents.data ?? []).map((a) => (
          <div key={a.id} className="card-premium p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-lg">{a.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
              </div>
              <StatusPill status={a.status} />
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">
                  {a.current_task ?? tr("admin.ai4.wf.noActiveTask")}
                </span>
                <span className="tabular-nums text-muted-foreground">{a.progress}%</span>
              </div>
              <Progress value={a.progress} />
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {[
                [tr("admin.ai4.wf.fieldLastRun"), fmtDate(a.last_run_at)],
                [tr("admin.ai4.wf.fieldSuccess"), `${Number(a.success_rate ?? 0).toFixed(0)}%`],
                [tr("admin.ai4.wf.fieldErrors"), String(a.error_count)],
                [tr("admin.ai4.wf.fieldCpu"), `${Number(a.cpu_usage ?? 0).toFixed(0)}%`],
                [tr("admin.ai4.wf.fieldMemory"), `${Number(a.memory_usage ?? 0).toFixed(0)}%`],
                [tr("admin.ai4.wf.fieldEta"), fmtDate(a.estimated_completion)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 truncate font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => act(a, "start")}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.start")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(a, "pause")}>
                <Pause className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.pause")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(a, "resume")}>
                <RotateCw className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.resume")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => act(a, "stop")}>
                <Square className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.stop")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPanel({ agent: a, kind: "configure" })}>
                <Settings2 className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.configure")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPanel({ agent: a, kind: "history" })}>
                <History className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.history")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPanel({ agent: a, kind: "logs" })}>
                <ScrollText className="mr-1.5 h-3.5 w-3.5" /> {tr("admin.ai4.wf.logs")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!agents.isLoading && !(agents.data ?? []).length && (
        <SectionShell title={tr("admin.ai4.wf.noAgentsTitle")}>
          <p className="text-sm text-muted-foreground">{tr("admin.ai4.wf.noAgentsBody")}</p>
        </SectionShell>
      )}

      <Dialog open={!!panel} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {panel?.agent.name} — {panel?.kind}
            </DialogTitle>
            <DialogDescription>
              {panel?.kind === "configure"
                ? tr("admin.ai4.wf.dialogConfigureDesc")
                : panel?.kind === "history"
                  ? tr("admin.ai4.wf.dialogHistoryDesc")
                  : tr("admin.ai4.wf.dialogLogsDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {panel?.kind === "history" && <TaskTable tasks={history.data ?? []} />}
            {panel?.kind === "logs" && <LogList logs={logs.data ?? []} />}
            {panel?.kind === "configure" && (
              <pre className="rounded-xl bg-muted p-4 text-xs">
                {JSON.stringify(
                  { key: panel.agent.key, category: panel.agent.category, enabled: panel.agent.enabled },
                  null,
                  2,
                )}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AiShell>
  );
}
