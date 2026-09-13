// ---------------------------------------------------------------------------
// AI Workforce execution API (admin-gated).
//
// The Workforce UI calls this thin RPC layer only — all business logic lives
// in the reusable execution service + executor registry.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const executeAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agentKey: string; count?: number }) => {
    if (!input || typeof input.agentKey !== "string" || !input.agentKey.trim()) {
      throw new Error("agentKey is required");
    }
    // Server-side clamp; the UI clamp is a convenience, not the guarantee.
    const count =
      input.count == null
        ? undefined
        : Math.min(Math.max(Math.floor(Number(input.count)) || 1, 1), 10);
    return { agentKey: input.agentKey.trim(), ...(count == null ? {} : { count }) };
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { startAgentRun } = await import("@/lib/workforce/execution.server");
    return await startAgentRun({
      supabase: ctx.supabase,
      userId: ctx.userId,
      agentKey: data.agentKey,
      ...(data.count == null ? {} : { runParams: { count: data.count } }),
    });
  });
