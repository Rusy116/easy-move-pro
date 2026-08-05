import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity } from "lucide-react";
import { AiShell } from "@/components/ai/AiShell";
import { PageHeader, SectionShell, StatCard } from "@/components/shell/Chrome";
import { EmptyState, fmtDate } from "@/components/ai/blocks";
import { listAgents, listLogs } from "@/lib/ai/api";
import { isToday } from "@/lib/ai/orchestrator";

export const Route = createFileRoute("/_authenticated/ai/activity")({
  head: () => ({
    meta: [
      { title: "AI Activity Timeline — Easy Moving" },
      { name: "description", content: "Chronological record of every AI agent action and its result." },
      { property: "og:title", content: "AI Activity Timeline — Easy Moving" },
      { property: "og:description", content: "Full audit trail of orchestrated AI activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

const LEVELS = ["all", "info", "warn", "error"] as const;

function ActivityPage() {
  const [level, setLevel] = useState<string>("all");
  const [agentKey, setAgentKey] = useState<string>("all");

  const logs = useQuery({
    queryKey: ["ai", "logs", "timeline"],
    queryFn: () => listLogs({ limit: 300 }),
    refetchInterval: 20000,
  });
  const agents = useQuery({ queryKey: ["ai", "agents"], queryFn: listAgents });

  const all = logs.data ?? [];
  const rows = all.filter(
    (l) => (level === "all" || l.level === level) && (agentKey === "all" || l.agent_key === agentKey),
  );

  return (
    <AiShell>
      <PageHeader
        eyebrow="AI Orchestrator"
        title="Activity Timeline"
        subtitle="Who did what, when, and with which result — across every agent."
        icon={<Activity className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events logged" value={all.length} />
        <StatCard label="Today" value={all.filter((l) => isToday(l.created_at)).length} tone="info" />
        <StatCard label="Warnings" value={all.filter((l) => l.level === "warn").length} tone="warning" />
        <StatCard label="Errors" value={all.filter((l) => l.level === "error").length} tone="danger" />
      </div>

      <SectionShell title="Timeline">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                level === l ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
          <select
            className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-xs"
            value={agentKey}
            onChange={(e) => setAgentKey(e.target.value)}
          >
            <option value="all">All agents</option>
            {(agents.data ?? []).map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {rows.length ? (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {rows.map((l) => (
              <li key={l.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ${
                    l.level === "error"
                      ? "bg-rose-500"
                      : l.level === "warn"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />
                <p className="text-sm">{l.message}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {l.agent_key.replace(/_/g, " ")} · {l.level} · {fmtDate(l.created_at)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No activity matches this filter" />
        )}
      </SectionShell>
    </AiShell>
  );
}
