// ---------------------------------------------------------------------------
// PHASE 6 — AI AGENT REGISTRY
//
// Every AI agent is a real registry record in public.ai_agents. Adding a new
// agent = inserting one row (optionally mapping a runner in agent-runners.ts).
// Nothing here touches CRM, marketplace, broker, portal or quote logic.
// ---------------------------------------------------------------------------
import { supabase } from "@/integrations/supabase/client";

export const AGENT_STATUSES = [
  "ready",
  "running",
  "waiting",
  "paused",
  "completed",
  "failed",
  "retrying",
  "disabled",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_STATUS_TONE: Record<AgentStatus, string> = {
  ready: "bg-muted text-foreground",
  running: "bg-emerald-500/15 text-emerald-600",
  waiting: "bg-amber-500/15 text-amber-600",
  paused: "bg-sky-500/15 text-sky-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
  retrying: "bg-orange-500/15 text-orange-600",
  disabled: "bg-muted text-muted-foreground",
};

export function normalizeStatus(raw: string | null | undefined, enabled = true): AgentStatus {
  if (!enabled) return "disabled";
  const s = (raw ?? "ready").toLowerCase();
  if ((AGENT_STATUSES as readonly string[]).includes(s)) return s as AgentStatus;
  if (s === "idle" || s === "online") return "ready";
  if (s === "queued") return "waiting";
  if (s === "error") return "failed";
  return "ready";
}

export interface RegistryAgent {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  status: AgentStatus;
  enabled: boolean;
  queue: string;
  priority: number;
  version: string;
  trigger_type: string;
  schedule: string | null;
  dependencies: string[];
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  route: string | null;
  current_task: string | null;
  progress: number;
  success_rate: number;
  error_count: number;
  run_count: number;
  retry_count: number;
  max_retries: number;
  tasks_completed: number;
  tasks_failed: number;
  avg_runtime_ms: number;
  last_runtime_ms: number;
  last_error: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
  /** queued + running tasks currently sitting in this agent's queue */
  queueLength: number;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : [];

export async function listRegistryAgents(): Promise<RegistryAgent[]> {
  const [{ data: agents, error }, { data: tasks }] = await Promise.all([
    supabase.from("ai_agents").select("*").order("sort_order", { ascending: true }),
    supabase.from("ai_tasks").select("agent_key,status"),
  ]);
  if (error) throw error;

  const queueBy = new Map<string, number>();
  for (const t of (tasks ?? []) as { agent_key: string; status: string }[]) {
    if (t.status === "queued" || t.status === "running" || t.status === "retrying") {
      queueBy.set(t.agent_key, (queueBy.get(t.agent_key) ?? 0) + 1);
    }
  }

  return ((agents ?? []) as Record<string, unknown>[]).map((a) => ({
    id: String(a["id"]),
    key: String(a["key"]),
    name: String(a["name"]),
    description: String(a["description"] ?? ""),
    category: String(a["category"] ?? "general"),
    status: normalizeStatus(a["status"] as string, Boolean(a["enabled"])),
    enabled: Boolean(a["enabled"]),
    queue: String(a["queue"] ?? "default"),
    priority: Number(a["priority"] ?? 5),
    version: String(a["version"] ?? "1.0.0"),
    trigger_type: String(a["trigger_type"] ?? "manual"),
    schedule: (a["schedule"] as string | null) ?? null,
    dependencies: asArray(a["dependencies"]),
    capabilities: asArray(a["capabilities"]),
    inputs: asArray(a["inputs"]),
    outputs: asArray(a["outputs"]),
    route: (a["route"] as string | null) ?? null,
    current_task: (a["current_task"] as string | null) ?? null,
    progress: Number(a["progress"] ?? 0),
    success_rate: Number(a["success_rate"] ?? 100),
    error_count: Number(a["error_count"] ?? 0),
    run_count: Number(a["run_count"] ?? 0),
    retry_count: Number(a["retry_count"] ?? 0),
    max_retries: Number(a["max_retries"] ?? 3),
    tasks_completed: Number(a["tasks_completed"] ?? 0),
    tasks_failed: Number(a["tasks_failed"] ?? 0),
    avg_runtime_ms: Number(a["avg_runtime_ms"] ?? 0),
    last_runtime_ms: Number(a["last_runtime_ms"] ?? 0),
    last_error: (a["last_error"] as string | null) ?? null,
    last_run_at: (a["last_run_at"] as string | null) ?? null,
    next_run_at: (a["next_run_at"] as string | null) ?? null,
    created_at: String(a["created_at"]),
    updated_at: String(a["updated_at"]),
    sort_order: Number(a["sort_order"] ?? 0),
    queueLength: queueBy.get(String(a["key"])) ?? 0,
  }));
}

export interface RegistryOverview {
  total: number;
  online: number;
  running: number;
  waiting: number;
  failed: number;
  paused: number;
  avgRuntimeMs: number;
  avgSuccessRate: number;
  tasksCompleted: number;
  tasksFailed: number;
  queueLength: number;
}

export function summarize(agents: RegistryAgent[]): RegistryOverview {
  const withRuntime = agents.filter((a) => a.avg_runtime_ms > 0);
  return {
    total: agents.length,
    online: agents.filter((a) => a.enabled && a.status !== "failed").length,
    running: agents.filter((a) => a.status === "running").length,
    waiting: agents.filter((a) => a.status === "waiting" || a.status === "retrying").length,
    failed: agents.filter((a) => a.status === "failed").length,
    paused: agents.filter((a) => a.status === "paused").length,
    avgRuntimeMs: withRuntime.length
      ? Math.round(withRuntime.reduce((s, a) => s + a.avg_runtime_ms, 0) / withRuntime.length)
      : 0,
    avgSuccessRate: agents.length
      ? Math.round((agents.reduce((s, a) => s + a.success_rate, 0) / agents.length) * 10) / 10
      : 0,
    tasksCompleted: agents.reduce((s, a) => s + a.tasks_completed, 0),
    tasksFailed: agents.reduce((s, a) => s + a.tasks_failed, 0),
    queueLength: agents.reduce((s, a) => s + a.queueLength, 0),
  };
}

// ── Orchestrator controls ──────────────────────────────────────────────────
export type AgentControl =
  | "start"
  | "pause"
  | "resume"
  | "retry"
  | "stop"
  | "enable"
  | "disable";

const patchFor = (a: RegistryAgent, action: AgentControl): Record<string, unknown> => {
  const now = new Date().toISOString();
  switch (action) {
    case "start":
      return { status: "running", enabled: true, progress: 0, last_run_at: now, last_error: null };
    case "pause":
      return { status: "paused" };
    case "resume":
      return { status: "running" };
    case "retry":
      return { status: "retrying", retry_count: a.retry_count + 1, last_error: null };
    case "stop":
      return { status: "ready", progress: 0, current_task: null };
    case "enable":
      return { enabled: true, status: "ready" };
    case "disable":
      return { enabled: false, status: "disabled", current_task: null, progress: 0 };
  }
};

export async function controlAgent(agent: RegistryAgent, action: AgentControl) {
  const { error } = await supabase
    .from("ai_agents")
    .update(patchFor(agent, action) as never)
    .eq("id", agent.id);
  if (error) throw error;
}

/** Record the outcome of a real run so statistics stay truthful. */
export async function recordRun(
  agent: RegistryAgent,
  outcome: { ok: boolean; ms: number; error?: string; summary?: string },
) {
  const runs = agent.run_count + 1;
  const completed = agent.tasks_completed + (outcome.ok ? 1 : 0);
  const failed = agent.tasks_failed + (outcome.ok ? 0 : 1);
  const avg = Math.round((agent.avg_runtime_ms * agent.run_count + outcome.ms) / runs);

  await supabase
    .from("ai_agents")
    .update({
      status: outcome.ok ? "completed" : "failed",
      progress: outcome.ok ? 100 : agent.progress,
      run_count: runs,
      tasks_completed: completed,
      tasks_failed: failed,
      error_count: outcome.ok ? agent.error_count : agent.error_count + 1,
      success_rate: Math.round((completed / Math.max(runs, 1)) * 1000) / 10,
      avg_runtime_ms: avg,
      last_runtime_ms: outcome.ms,
      last_run_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      current_task: outcome.summary ?? null,
      last_error: outcome.ok ? null : (outcome.error ?? "Unknown error"),
    } as never)
    .eq("id", agent.id);
}

/** Queue a task for an agent that runs through the orchestrator queue. */
export async function queueAgentTask(agent: RegistryAgent, capability?: string) {
  const { error } = await supabase.from("ai_tasks").insert({
    agent_key: agent.key,
    capability: capability ?? agent.capabilities[0] ?? "run",
    title: `${agent.name} — manual run`,
    status: "queued",
    priority: agent.priority,
    params: {},
  } as never);
  if (error) throw error;
  await supabase.from("ai_agents").update({ status: "waiting" } as never).eq("id", agent.id);
}

// ── Detail panels: history, logs, errors ───────────────────────────────────
export interface AgentTaskRow {
  id: string;
  title: string;
  capability: string;
  status: string;
  retry_count: number;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function agentHistory(agentKey: string, limit = 25): Promise<AgentTaskRow[]> {
  const { data } = await supabase
    .from("ai_tasks")
    .select("id,title,capability,status,retry_count,duration_ms,error,created_at,completed_at")
    .eq("agent_key", agentKey)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AgentTaskRow[];
}

export interface AgentLogRow {
  id: string;
  level: string;
  message: string;
  created_at: string;
}

export async function agentLogs(agentKey: string, limit = 25): Promise<AgentLogRow[]> {
  const { data } = await supabase
    .from("ai_task_logs")
    .select("id,level,message,created_at,agent_key")
    .eq("agent_key", agentKey)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AgentLogRow[];
}

export function fmtMs(ms: number | null | undefined) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/** Dependency health: an agent is blocked while a dependency is failed/disabled. */
export function dependencyState(agent: RegistryAgent, all: RegistryAgent[]) {
  const deps = agent.dependencies
    .map((k) => all.find((a) => a.key === k))
    .filter(Boolean) as RegistryAgent[];
  const blocked = deps.filter((d) => !d.enabled || d.status === "failed");
  return { deps, blocked, ok: blocked.length === 0 };
}
