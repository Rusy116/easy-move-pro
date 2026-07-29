import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mover-side lead assignment engine RPCs.
 * All wrap SECURITY DEFINER functions that enforce mover identity server-side.
 */

async function callRpc(ctx: { supabase: any }, fn: string, args: Record<string, unknown>) {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export const moverOpenAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_mover_open_assignment", { _assignment_id: data.assignmentId }),
  );

export const moverMarkContacted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string; notes?: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_mover_mark_contacted", {
      _assignment_id: data.assignmentId,
      _notes: data.notes ?? null,
    }),
  );

export const moverDecline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string; reason?: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_mover_decline", {
      _assignment_id: data.assignmentId,
      _reason: data.reason ?? null,
    }),
  );

export const moverClaimOpenMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_mover_claim_open_market", { _quote_id: data.quoteId }),
  );

/** List masked leads visible to the current mover's company. */
export const moverListLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mover_lead_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
