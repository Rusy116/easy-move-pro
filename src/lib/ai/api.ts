import { supabase } from "@/integrations/supabase/client";
import { ALL_CAPABILITIES } from "./registry";

export type AiAgent = {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  status: string;
  enabled: boolean;
  current_task: string | null;
  progress: number;
  success_rate: number;
  error_count: number;
  run_count: number;
  cpu_usage: number;
  memory_usage: number;
  estimated_completion: string | null;
  last_run_at: string | null;
  sort_order: number;
  /** Orchestrator (CEO agent) fields */
  priority: number;
  capabilities: string[];
  queue: string;
  version: string;
  last_activity_at: string | null;
  tasks_completed: number;
  tasks_failed: number;
  avg_runtime_ms: number;
};


export type AiTask = {
  id: string;
  agent_key: string;
  capability: string;
  title: string;
  status: string;
  progress: number;
  priority: number;
  params: Record<string, unknown>;
  error: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type AiLog = {
  id: string;
  task_id: string | null;
  agent_key: string;
  level: string;
  message: string;
  created_at: string;
};

export type AiContentItem = {
  id: string;
  kind: string;
  title: string;
  slug: string | null;
  locale: string;
  status: string;
  quality_score: number | null;
  target_city: string | null;
  keyword: string | null;
  agent_key: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
};

export type AiProduct = {
  id: string;
  title: string;
  product_type: string;
  status: string;
  price_cents: number;
  quality_score: number | null;
  downloads: number;
  revenue_cents: number;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
};

export type AiAutomation = {
  id: string;
  name: string;
  description: string | null;
  agent_key: string;
  capability: string;
  frequency: string;
  quantity: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
};

export async function listAgents(): Promise<AiAgent[]> {
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiAgent[];
}

export async function listTasks(opts: { agentKey?: string; limit?: number } = {}) {
  let q = supabase
    .from("ai_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.agentKey) q = q.eq("agent_key", opts.agentKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AiTask[];
}

export async function listLogs(opts: { agentKey?: string; limit?: number } = {}) {
  let q = supabase
    .from("ai_task_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.agentKey) q = q.eq("agent_key", opts.agentKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AiLog[];
}

export async function listContent(opts: { kind?: string; status?: string } = {}) {
  let q = supabase
    .from("ai_content_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AiContentItem[];
}

export async function listProducts() {
  const { data, error } = await supabase
    .from("ai_products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AiProduct[];
}

export async function listAutomations() {
  const { data, error } = await supabase
    .from("ai_automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiAutomation[];
}

export async function listSettings() {
  const { data, error } = await supabase.from("ai_settings").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as { key: string; value: Record<string, unknown>; updated_at: string }[];
}

export async function saveSetting(key: string, value: unknown) {
  const { error } = await supabase
    .from("ai_settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw error;
  await log("ai_ceo", `Settings updated: ${key}`, "info");
}

/** Append an entry to the AI activity log. Every action goes through here. */
export async function log(
  agentKey: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
  taskId?: string,
) {
  await supabase
    .from("ai_task_logs")
    .insert({ agent_key: agentKey, message, level, task_id: taskId ?? null });
}

/**
 * Queue a task. No AI execution happens yet — a future worker picks queued
 * rows up. The UI only ever writes to the queue.
 */
export async function enqueueTask(input: {
  capability: string;
  title?: string;
  params?: Record<string, unknown>;
  quantity?: number;
  scheduledFor?: string | null;
  priority?: number;
}) {
  const cap = ALL_CAPABILITIES.find((c) => c.key === input.capability);
  const agentKey = cap?.agentKey ?? "ai_ceo";
  const title = input.title ?? cap?.label ?? input.capability;
  const { data: userRes } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("ai_tasks")
    .insert({
      agent_key: agentKey,
      capability: input.capability,
      title,
      params: { quantity: input.quantity ?? 1, ...(input.params ?? {}) } as never,
      status: input.scheduledFor ? "scheduled" : "queued",
      scheduled_for: input.scheduledFor ?? null,
      priority: input.priority ?? 5,
      created_by: userRes.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  await log(agentKey, `Task queued: ${title}`, "info", data.id);
  return data.id as string;
}

export type AgentAction = "start" | "pause" | "resume" | "stop";

export async function setAgentState(agent: AiAgent, action: AgentAction) {
  const status =
    action === "start" || action === "resume" ? "running" : action === "pause" ? "paused" : "idle";
  const patch: Record<string, unknown> = { status };
  if (action === "start") {
    patch["last_run_at"] = new Date().toISOString();
    patch["run_count"] = agent.run_count + 1;
  }
  if (action === "stop") {
    patch["progress"] = 0;
    patch["current_task"] = null;
  }
  const { error } = await supabase.from("ai_agents").update(patch as never).eq("id", agent.id);
  if (error) throw error;
  await log(agent.key, `Agent ${action} requested`, "info");
}

export async function updateTaskStatus(id: string, status: string, agentKey: string) {
  const patch: Record<string, unknown> = { status };
  if (status === "cancelled" || status === "completed") {
    patch["completed_at"] = new Date().toISOString();
  }
  const { error } = await supabase.from("ai_tasks").update(patch as never).eq("id", id);
  if (error) throw error;
  await log(agentKey, `Task marked ${status}`, "info", id);
}

export async function setContentStatus(ids: string[], status: string) {
  if (!ids.length) return;
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch["published_at"] = new Date().toISOString();
  if (status === "archived") patch["archived_at"] = new Date().toISOString();
  const { error } = await supabase.from("ai_content_items").update(patch as never).in("id", ids);
  if (error) throw error;
  await log("publishing_agent", `${ids.length} item(s) moved to ${status}`, "info");
}

export async function createAutomation(input: {
  name: string;
  description?: string;
  capability: string;
  frequency: string;
  quantity: number;
}) {
  const cap = ALL_CAPABILITIES.find((c) => c.key === input.capability);
  const { error } = await supabase.from("ai_automations").insert({
    name: input.name,
    description: input.description ?? null,
    capability: input.capability,
    agent_key: cap?.agentKey ?? "ai_ceo",
    frequency: input.frequency,
    quantity: input.quantity,
  });
  if (error) throw error;
  await log("ai_ceo", `Automation created: ${input.name}`, "info");
}

export async function toggleAutomation(id: string, enabled: boolean) {
  const { error } = await supabase.from("ai_automations").update({ enabled }).eq("id", id);
  if (error) throw error;
  await log("ai_ceo", `Automation ${enabled ? "enabled" : "disabled"}`, "info");
}

export async function deleteAutomation(id: string) {
  const { error } = await supabase.from("ai_automations").delete().eq("id", id);
  if (error) throw error;
  await log("ai_ceo", "Automation deleted", "info");
}

export async function listMetrics() {
  const { data, error } = await supabase
    .from("ai_metrics_daily")
    .select("*")
    .order("day", { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data ?? []) as { day: string; metric: string; value: number; dims: Record<string, unknown> }[];
}
