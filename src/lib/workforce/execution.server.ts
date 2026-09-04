// ---------------------------------------------------------------------------
// Central Workforce execution service.
//
// /ai/workforce → server fn → this service → executor registry → runner.
// Owns: authorization checks, single-active-run guard, run record lifecycle,
// structured lifecycle logs, agent status truth.
//
// Only observability tables are written here: ai_agent_runs, ai_task_logs,
// ai_agents (status/counters). No business data is ever touched.
// ---------------------------------------------------------------------------
import { WORKFORCE_EXECUTORS } from "./executors.server";

export type StartRunOutcome =
  | { ok: true; runId: string; status: "completed" | "failed"; summary: string; durationMs: number }
  | { ok: false; reason: "not_executable" | "disabled" | "already_running" | "unknown_agent"; message: string; runId?: string };

/** Redact anything that smells like a credential before it reaches a log row. */
const safe = (msg: string) =>
  msg
    .replace(/(sk|pk|rk)_(live|test)_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "[redacted]")
    .slice(0, 500);

export async function startAgentRun(params: {
  /** RLS-scoped client of the requesting admin (used for reads). */
  supabase: any;
  userId: string;
  agentKey: string;
}): Promise<StartRunOutcome> {
  const { supabase, userId, agentKey } = params;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const writeLog = async (message: string, level: "info" | "warn" | "error" = "info") => {
    await supabaseAdmin
      .from("ai_task_logs")
      .insert({ agent_key: agentKey, message: safe(message), level } as never);
  };

  await writeLog(`requested: execution of ${agentKey}`);

  const executor = WORKFORCE_EXECUTORS[agentKey];
  if (!executor) {
    await writeLog(`rejected: ${agentKey} has no registered executor`, "warn");
    return {
      ok: false,
      reason: "not_executable",
      message: "This agent has no registered executor yet and cannot be started.",
    };
  }

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id,key,enabled,run_count")
    .eq("key", agentKey)
    .maybeSingle();
  if (!agent) {
    await writeLog(`rejected: agent ${agentKey} not found in registry`, "warn");
    return { ok: false, reason: "unknown_agent", message: "Agent not found in the registry." };
  }
  if (!agent.enabled) {
    await writeLog(`rejected: agent ${agentKey} is disabled`, "warn");
    return { ok: false, reason: "disabled", message: "Agent is disabled for execution." };
  }

  const { data: active } = await supabaseAdmin
    .from("ai_agent_runs")
    .select("id")
    .eq("agent_key", agentKey)
    .eq("status", "running")
    .maybeSingle();
  if (active) {
    await writeLog(`rejected: a run is already active for ${agentKey}`, "warn");
    return {
      ok: false,
      reason: "already_running",
      message: "A run is already active for this agent.",
      runId: (active as { id: string }).id,
    };
  }

  await writeLog(`authorized: admin ${userId.slice(0, 8)}… may execute ${agentKey}`);

  const startedAt = Date.now();
  const { data: run, error: runErr } = await supabaseAdmin
    .from("ai_agent_runs")
    .insert({
      agent_key: agentKey,
      status: "running",
      mode: executor.mode,
      requested_by: userId,
    } as never)
    .select("id")
    .single();
  if (runErr || !run) {
    // Unique partial index race → another run won.
    return {
      ok: false,
      reason: "already_running",
      message: "A run is already active for this agent.",
    };
  }
  const runId = (run as { id: string }).id;

  await supabaseAdmin
    .from("ai_agents")
    .update({
      status: "running",
      progress: 10,
      current_task: executor.taskLabel,
      last_run_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      run_count: Number(agent.run_count ?? 0) + 1,
    } as never)
    .eq("id", agent.id);
  await writeLog(`started: run ${runId}`);

  try {
    const out = await executor.run({ supabase, userId, log: writeLog });
    const durationMs = Date.now() - startedAt;

    await supabaseAdmin
      .from("ai_agent_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        items_processed: out.itemsProcessed,
        ai_calls: out.aiCalls,
        external_calls: out.externalCalls,
        error_count: 0,
        summary: out.summary,
        result: {
          ...out.result,
          tables_read: out.tablesRead,
          tables_written: out.tablesWritten,
        },
      } as never)
      .eq("id", runId);

    await supabaseAdmin
      .from("ai_agents")
      .update({
        status: "completed",
        progress: 100,
        current_task: out.summary.slice(0, 200),
        last_activity_at: new Date().toISOString(),
      } as never)
      .eq("id", agent.id);

    return { ok: true, runId, status: "completed", summary: out.summary, durationMs };
  } catch (e) {
    const durationMs = Date.now() - startedAt;
    const message = safe(e instanceof Error ? e.message : "Unknown execution error");
    await writeLog(`runner_failed: ${message}`, "error");
    await supabaseAdmin
      .from("ai_agent_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_count: 1,
        error: message,
      } as never)
      .eq("id", runId);
    await supabaseAdmin
      .from("ai_agents")
      .update({
        status: "failed",
        progress: 0,
        current_task: null,
        last_activity_at: new Date().toISOString(),
      } as never)
      .eq("id", agent.id);
    return { ok: true, runId, status: "failed", summary: message, durationMs };
  }
}
