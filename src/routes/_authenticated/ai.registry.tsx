import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookUser } from "lucide-react";
import { toast } from "sonner";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusPill, fmtDate } from "@/components/ai/blocks";
import {
  fmtDuration,
  listRegistry,
  registryCapabilities,
  setAgentEnabled,
  setAgentPriority,
  type OrchestratorAgent,
} from "@/lib/ai/orchestrator";

export const Route = createFileRoute("/_authenticated/ai/registry")({
  head: () => ({
    meta: [
      { title: "Agent Registry — Easy Moving" },
      { name: "description", content: "Every registered AI agent, its capabilities and health." },
      { property: "og:title", content: "Agent Registry — Easy Moving" },
      { property: "og:description", content: "Plug-in registry of AI agents managed by the orchestrator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistryPage,
});

function RegistryPage() {
  const qc = useQueryClient();
  const registry = useQuery({ queryKey: ["ai", "registry"], queryFn: listRegistry });
  const agents = registry.data ?? [];

  async function run(fn: () => Promise<void>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["ai"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Orchestrator"
        title="Agent Registry"
        subtitle="Agents register themselves here. The orchestrator assigns work by priority and capability."
        icon={<BookUser className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered" value={agents.length} />
        <StatCard label="Enabled" value={agents.filter((a) => a.enabled).length} tone="success" />
        <StatCard label="Disabled" value={agents.filter((a) => !a.enabled).length} />
        <StatCard
          label="With errors"
          value={agents.filter((a) => (a.error_count ?? 0) > 0).length}
          tone="danger"
        />
      </div>

      <SectionShell title="Registered agents">
        {agents.length ? (
          <div className="space-y-3">
            {agents.map((a) => (
              <AgentRow key={a.id} agent={a} onRun={run} />
            ))}
          </div>
        ) : (
          <EmptyState title="No agents registered" hint="Agents appear here as soon as they register." />
        )}
      </SectionShell>
    </AiShell>
  );
}

function AgentRow({
  agent,
  onRun,
}: {
  agent: OrchestratorAgent;
  onRun: (fn: () => Promise<void>, msg: string) => Promise<void>;
}) {
  const caps = registryCapabilities(agent.key);
  const declared = agent.capabilities?.length ? agent.capabilities : caps.map((c) => c.key);

  return (
    <div className="card-premium p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{agent.name}</span>
            <StatusPill status={agent.status} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              v{agent.version} · {agent.queue} queue
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            value={agent.priority}
            onChange={(e) =>
              onRun(() => setAgentPriority(agent, Number(e.target.value)), "Priority updated")
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
              <option key={p} value={p}>
                Priority {p}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant={agent.enabled ? "outline" : "default"}
            onClick={() =>
              onRun(
                () => setAgentEnabled(agent, !agent.enabled),
                agent.enabled ? "Agent disabled" : "Agent enabled",
              )
            }
          >
            {agent.enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-5">
        <span>Success rate: {Number(agent.success_rate ?? 0).toFixed(1)}%</span>
        <span>Runs: {agent.run_count}</span>
        <span>Completed / failed: {agent.tasks_completed} / {agent.tasks_failed}</span>
        <span>Avg runtime: {fmtDuration(agent.avg_runtime_ms)}</span>
        <span>Last activity: {fmtDate(agent.last_activity_at ?? agent.last_run_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {declared.length ? (
          declared.map((c) => (
            <span key={c} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px]">
              {c}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No capabilities declared</span>
        )}
      </div>
    </div>
  );
}
