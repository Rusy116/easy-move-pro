import { supabase } from "@/integrations/supabase/client";
import { ALL_CAPABILITIES } from "./registry";
import { log, type AiAgent, type AiTask } from "./api";

/**
 * AI Orchestrator (CEO agent) data layer.
 *
 * The orchestrator never performs agent work. It only reads the registry,
 * writes to the task queue, records notifications and reports on performance.
 * Any future agent that inserts a row into `ai_agents` shows up automatically —
 * no code change required.
 */

export const TASK_STATUSES = [
  "pending",
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type OrchestratorAgent = AiAgent & {
  priority: number;
  capabilities: string[];
  queue: string;
  version: string;
  created_by: string | null;
  last_activity_at: string | null;
  tasks_completed: number;
  tasks_failed: number;
  avg_runtime_ms: number;
};

export type OrchestratorTask = AiTask & {
  retry_count: number;
  max_retries: number;
  depends_on: string[];
  duration_ms: number | null;
  result: Record<string, unknown> | null;
};

export type AiNotification = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  agent_key: string | null;
  task_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type OrchestratorSettings = {
  maxConcurrentTasks: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  retryLimit: number;
  retryBackoffMinutes: number;
  loggingLevel: "debug" | "info" | "warn" | "error";
  dailyTaskLimit: number;
  taskTimeoutMinutes: number;
};

export const DEFAULT_ORCHESTRATOR_SETTINGS: OrchestratorSettings = {
  maxConcurrentTasks: 5,
  workingHoursStart: "08:00",
  workingHoursEnd: "20:00",
  retryLimit: 3,
  retryBackoffMinutes: 10,
  loggingLevel: "info",
  dailyTaskLimit: 200,
  taskTimeoutMinutes: 30,
};

export const ORCHESTRATOR_SETTINGS_KEY = "orchestrator";

/** Capabilities declared statically for an agent, from the plug-in registry. */
export function registryCapabilities(agentKey: string) {
  return ALL_CAPABILITIES.filter((c) => c.agentKey === agentKey);
}

export async function listRegistry(): Promise<OrchestratorAgent[]> {
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .order("priority", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as OrchestratorAgent[];
}

export async function listQueue(opts: { status?: string; limit?: number } = {}) {
  let q = supabase
    .from("ai_tasks")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as OrchestratorTask[];
}

export async function listNotifications(limit = 100): Promise<AiNotification[]> {
  const { data, error } = await supabase
    .from("ai_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AiNotification[];
}

export async function notify(input: {
  kind: string;
  title: string;
  body?: string;
  severity?: "info" | "warning" | "error" | "success";
  agentKey?: string;
  taskId?: string;
}) {
  const { error } = await supabase.from("ai_notifications").insert({
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    severity: input.severity ?? "info",
    agent_key: input.agentKey ?? null,
    task_id: input.taskId ?? null,
  });
  if (error) throw error;
}

export async function markNotificationRead(id: string, read: boolean) {
  const { error } = await supabase
    .from("ai_notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("ai_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

/** Orchestrator-level task controls. */
export async function setTaskStatus(task: OrchestratorTask, status: TaskStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "running") patch["started_at"] = new Date().toISOString();
  if (status === "completed" || status === "cancelled" || status === "failed") {
    patch["completed_at"] = new Date().toISOString();
  }
  const { error } = await supabase.from("ai_tasks").update(patch as never).eq("id", task.id);
  if (error) throw error;
  await log(task.agent_key, `Orchestrator set task "${task.title}" to ${status}`, "info", task.id);
}

export async function retryTask(task: OrchestratorTask) {
  const { error } = await supabase
    .from("ai_tasks")
    .update({
      status: "queued",
      retry_count: (task.retry_count ?? 0) + 1,
      error: null,
      progress: 0,
      started_at: null,
      completed_at: null,
    } as never)
    .eq("id", task.id);
  if (error) throw error;
  await log(task.agent_key, `Orchestrator requeued task "${task.title}"`, "warn", task.id);
}

export async function setAgentEnabled(agent: OrchestratorAgent, enabled: boolean) {
  const { error } = await supabase
    .from("ai_agents")
    .update({
      enabled,
      status: enabled ? "idle" : "stopped",
      last_activity_at: new Date().toISOString(),
    } as never)
    .eq("id", agent.id);
  if (error) throw error;
  await log(agent.key, `Orchestrator ${enabled ? "enabled" : "disabled"} agent`, "info");
}

export async function setAgentPriority(agent: OrchestratorAgent, priority: number) {
  const { error } = await supabase
    .from("ai_agents")
    .update({ priority, last_activity_at: new Date().toISOString() } as never)
    .eq("id", agent.id);
  if (error) throw error;
  await log(agent.key, `Orchestrator set priority to ${priority}`, "info");
}

export async function loadOrchestratorSettings(): Promise<OrchestratorSettings> {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("value")
    .eq("key", ORCHESTRATOR_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return {
    ...DEFAULT_ORCHESTRATOR_SETTINGS,
    ...((data?.value as Partial<OrchestratorSettings> | undefined) ?? {}),
  };
}

export async function saveOrchestratorSettings(value: OrchestratorSettings) {
  const { error } = await supabase.from("ai_settings").upsert({
    key: ORCHESTRATOR_SETTINGS_KEY,
    value: value as never,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await log("ai_ceo", "Orchestrator settings updated", "info");
}

export function isToday(iso: string | null | undefined) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function fmtDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

/** Effective runtime of a task, from stored duration or timestamps. */
export function taskDuration(t: OrchestratorTask) {
  if (t.duration_ms) return t.duration_ms;
  if (t.started_at && t.completed_at) {
    return new Date(t.completed_at).getTime() - new Date(t.started_at).getTime();
  }
  return null;
}
