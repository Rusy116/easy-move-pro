import { createServerFn } from "@tanstack/react-start";

/**
 * Development / QA quick-login server function.
 *
 * Disabled unless the server runs outside production, or ENABLE_DEV_LOGIN=1
 * is explicitly set. It does not alter the normal authentication flow: it
 * simply guarantees a seeded demo account exists and returns a real Supabase
 * session for it, exactly like the password sign-in does.
 */

const DEMO_PASSWORD = "DemoMoving!2026";

type DevRole = "admin" | "broker" | "mover" | "customer";

const ACCOUNTS: Record<DevRole, { email: string; name: string }> = {
  admin: { email: "admin@demo.easymoving.test", name: "Demo Administrator" },
  broker: { email: "broker1@demo.easymoving.test", name: "Demo Broker" },
  mover: { email: "company1@demo.easymoving.test", name: "Demo Moving Company" },
  customer: { email: "customer01@demo.easymoving.test", name: "Demo Customer" },
};

function devLoginAllowed() {
  return process.env.ENABLE_DEV_LOGIN === "1" || process.env.NODE_ENV !== "production";
}

export const devQuickSignIn = createServerFn({ method: "POST" })
  .inputValidator((i: { role: DevRole }) => {
    if (!i?.role || !(i.role in ACCOUNTS)) throw new Error("Unknown demo role");
    return { role: i.role };
  })
  .handler(async ({ data }) => {
    if (!devLoginAllowed()) throw new Error("Development login is disabled");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const account = ACCOUNTS[data.role];

    // 1. Find or create the seeded demo auth user.
    let userId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list?.users?.find((u) => u.email?.toLowerCase() === account.email)?.id ?? null;

    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.name },
      });
      if (error || !created?.user) throw new Error(error?.message ?? "Could not create demo user");
      userId = created.user.id;
    } else {
      // Keep the known demo password valid even if it drifted.
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
    }

    // 2. Profile + role.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: account.name, status: "active" } as never);

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!(roleRows ?? []).some((r: { role: string }) => r.role === data.role)) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role } as never);
    }

    // 3. Moving company demo account needs a company membership.
    if (data.role === "mover") {
      const { data: membership } = await supabaseAdmin
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        let companyId: string | null = null;
        const { data: existing } = await supabaseAdmin
          .from("moving_companies")
          .select("id")
          .eq("approved", true)
          .limit(1)
          .maybeSingle();
        companyId = (existing?.id as string) ?? null;

        if (!companyId) {
          const { data: company, error: cErr } = await supabaseAdmin
            .from("moving_companies")
            .insert({
              name: "Demo Movers Inc.",
              email: account.email,
              phone: "3055550100",
              approved: true,
              suspended: false,
              active: true,
              license_status: "verified",
            } as never)
            .select("id")
            .single();
          if (cErr) throw cErr;
          companyId = company.id as string;
        }

        await supabaseAdmin
          .from("company_members")
          .insert({ company_id: companyId, user_id: userId, role: "owner" } as never);
        await supabaseAdmin
          .from("company_users")
          .insert({ company_id: companyId, user_id: userId, role: "owner" } as never)
          .then(() => undefined, () => undefined);
      }
    }

    // 4. Real password sign-in — same path as normal authentication.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: signIn, error } = await client.auth.signInWithPassword({
      email: account.email,
      password: DEMO_PASSWORD,
    });
    if (error || !signIn.session) throw new Error(error?.message ?? "Demo sign-in failed");

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      roles: [data.role],
    };
  });
