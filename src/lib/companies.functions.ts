import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: look up a user by email in auth.users, ensure they have the
 * 'mover' role, and attach them to the given company.
 */
export const attachMemberByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; companyId: string }) => data)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    // Verify caller is admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user by email via Auth Admin API
    let userId: string | null = null;
    let page = 1;
    while (page < 20 && !userId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (match) userId = match.id;
      if (list.users.length < 200) break;
      page += 1;
    }
    if (!userId) throw new Error("No account found with that email. Ask them to sign up first.");

    // Grant 'mover' role (idempotent)
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "mover" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    // Attach to company
    const { error: memErr } = await supabaseAdmin
      .from("company_members")
      .upsert(
        { user_id: userId, company_id: data.companyId, role: "member" },
        { onConflict: "company_id,user_id", ignoreDuplicates: true },
      );
    if (memErr) throw new Error(memErr.message);

    return { ok: true, userId };
  });
