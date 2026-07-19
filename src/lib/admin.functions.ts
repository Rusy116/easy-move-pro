import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BrokerRow = { id: string; email: string; full_name: string | null };

/**
 * List admin users (used as brokers in the CRM).
 * Only callable by an authenticated admin.
 */
export const listBrokers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrokerRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get all admin user_ids
    const { data: roleRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rErr) throw rErr;
    const ids = (roleRows ?? []).map((r) => r.user_id as string);
    if (ids.length === 0) return [];

    // Get profile names
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const profileById = new Map<string, string | null>(
      (profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]),
    );

    // Get emails from auth admin api
    const brokers: BrokerRow[] = [];
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      if (u?.user) {
        brokers.push({
          id,
          email: u.user.email ?? "",
          full_name: profileById.get(id) ?? null,
        });
      }
    }
    brokers.sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email),
    );
    return brokers;
  });
