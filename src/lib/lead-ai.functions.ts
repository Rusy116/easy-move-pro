import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const summarizeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quoteId: string }) => i)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: quote, error } = await context.supabase
      .from("quotes")
      .select("*")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("Lead not found");

    const { generateLeadSummary } = await import("./lead-ai.server");
    const summary = await generateLeadSummary(quote as Record<string, unknown>);

    await context.supabase
      .from("quotes")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() } as never)
      .eq("id", data.quoteId);

    return summary;
  });
