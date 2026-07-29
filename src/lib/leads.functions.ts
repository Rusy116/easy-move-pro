import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Broker-side lead assignment engine RPCs.
 * All wrap SECURITY DEFINER functions that enforce is_admin() server-side.
 */

async function callRpc(ctx: { supabase: any }, fn: string, args: Record<string, unknown>) {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export const assignExclusive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; companyId: string; slaHours?: number }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_assign_exclusive", {
      _quote_id: data.quoteId,
      _company_id: data.companyId,
      _sla_hours: data.slaHours ?? null,
    }),
  );

export const assignCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; companyIds: string[]; slaHours?: number }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_assign_multi", {
      _quote_id: data.quoteId,
      _company_ids: data.companyIds,
      _sla_hours: data.slaHours ?? null,
    }),
  );

export const reassignExclusive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; newCompanyId: string; slaHours?: number }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_reassign_exclusive", {
      _quote_id: data.quoteId,
      _new_company_id: data.newCompanyId,
      _sla_hours: data.slaHours ?? null,
    }),
  );

export const withdrawAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { assignmentId: string; reason?: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_withdraw_assignment", {
      _assignment_id: data.assignmentId,
      _reason: data.reason ?? null,
    }),
  );

export const forceOpenMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; reason?: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_force_open_market", {
      _quote_id: data.quoteId,
      _reason: data.reason ?? null,
    }),
  );

export const closeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { quoteId: string; reason: "won" | "lost" | "cancelled" | "duplicate" | "invalid" }) => i,
  )
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_close_lead", { _quote_id: data.quoteId, _reason: data.reason }),
  );

export const reopenLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_reopen_lead", { _quote_id: data.quoteId }),
  );

export const pauseSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; reason: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_pause_sla", { _quote_id: data.quoteId, _reason: data.reason }),
  );

export const resumeSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_resume_sla", { _quote_id: data.quoteId }),
  );

export const extendSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; minutes: number }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_extend_sla", {
      _quote_id: data.quoteId,
      _minutes: data.minutes,
    }),
  );

export const setVisibilityMask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string; mask: Record<string, boolean> }) => i)
  .handler(async ({ data, context }) =>
    callRpc(context, "fn_set_visibility_mask", {
      _quote_id: data.quoteId,
      _mask: data.mask,
    }),
  );
