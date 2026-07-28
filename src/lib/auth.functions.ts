import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authentication + account administration for Easy Move Pro.
 *
 * Roles are strictly: admin | broker | mover (moving company) | customer.
 * Broker and Administrator accounts can only be created by an Administrator.
 */

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

function isEmail(identifier: string) {
  return identifier.includes("@");
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: administrator access required");
  return true;
}

/**
 * Single sign-in entry point. Accepts an email address OR a phone number
 * together with a password, and returns the session plus the role home route.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((i: { identifier: string; password: string }) => {
    const identifier = (i.identifier ?? "").trim();
    const password = i.password ?? "";
    if (identifier.length < 3) throw new Error("Enter your email or phone number");
    if (password.length < 6) throw new Error("Enter your password");
    return { identifier, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let email = data.identifier;

    if (!isEmail(data.identifier)) {
      const digits = normalizePhone(data.identifier);
      if (digits.length < 7) throw new Error("Enter a valid phone number");
      const last4 = digits.slice(-4);

      const { data: candidates } = await supabaseAdmin
        .from("profiles")
        .select("id, phone")
        .not("phone", "is", null)
        .ilike("phone", `%${last4}%`)
        .limit(200);

      const match = (candidates ?? []).find(
        (p: { phone: string | null }) =>
          normalizePhone(p.phone ?? "").slice(-10) === digits.slice(-10),
      );
      if (!match) throw new Error("Invalid login credentials");

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(match.id);
      if (!authUser?.user?.email) throw new Error("Invalid login credentials");
      email = authUser.user.email;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input: any, init: any) => {
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
      email,
      password: data.password,
    });
    if (error || !signIn.session) throw new Error(error?.message ?? "Invalid login credentials");

    const userId = signIn.user!.id;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();

    if ((profile?.status ?? "active") === "disabled") {
      throw new Error("This account has been disabled. Contact the platform administrator.");
    }

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      roles,
    };
  });

export type StaffRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  status: string;
  role: "admin" | "broker";
  created_at: string;
};

/** Administrator: list all administrator + broker accounts. */
export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "broker"]);
    if (error) throw error;

    const ids = [...new Set((roleRows ?? []).map((r: any) => r.user_id as string))];
    if (!ids.length) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, full_name, phone, status, created_at")
      .in("id", ids);

    const roleFor = (id: string) =>
      (roleRows ?? []).some((r: any) => r.user_id === id && r.role === "admin")
        ? ("admin" as const)
        : ("broker" as const);

    const rows: StaffRow[] = [];
    for (const p of profiles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id as string);
      rows.push({
        id: p.id as string,
        email: u?.user?.email ?? "",
        first_name: (p as any).first_name ?? null,
        last_name: (p as any).last_name ?? null,
        full_name: (p as any).full_name ?? null,
        phone: (p as any).phone ?? null,
        status: ((p as any).status as string) ?? "active",
        role: roleFor(p.id as string),
        created_at: (p as any).created_at as string,
      });
    }
    rows.sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
    return rows;
  });

/** Administrator: create a broker account. Brokers can never self-register. */
export const adminCreateBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      status?: "active" | "disabled";
    }) => {
      const firstName = (i.firstName ?? "").trim();
      const lastName = (i.lastName ?? "").trim();
      const email = (i.email ?? "").trim().toLowerCase();
      const phone = (i.phone ?? "").trim();
      const password = i.password ?? "";
      if (!firstName || firstName.length > 80) throw new Error("First name is required");
      if (!lastName || lastName.length > 80) throw new Error("Last name is required");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required");
      if (normalizePhone(phone).length < 10) throw new Error("A valid phone number is required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      return { firstName, lastName, email, phone, password, status: i.status ?? "active" };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const fullName = `${data.firstName} ${data.lastName}`.trim();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      phone_confirm: false,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create broker");

    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      status: data.status,
    } as any);

    // A broker is never a customer: replace default role assignment.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "broker" } as any);
    if (rErr) throw rErr;

    return { id: userId, email: data.email };
  });

/** Administrator: enable or disable an account. Accounts are never deleted. */
export const adminSetAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; status: "active" | "disabled" }) => {
    if (!i.userId) throw new Error("Missing user");
    if (i.status !== "active" && i.status !== "disabled") throw new Error("Invalid status");
    return i;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot disable your own account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if ((roleRows ?? []).some((r: any) => r.role === "admin")) {
      throw new Error("Administrator accounts cannot be disabled");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status } as any)
      .eq("id", data.userId);
    if (error) throw error;

    // Disabled users are signed out everywhere immediately.
    if (data.status === "disabled") {
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    }
    return { ok: true };
  });

/** Administrator: reset the password of a broker or moving company account. */
export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; password: string }) => {
    if (!i.userId) throw new Error("Missing user");
    if ((i.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    return i;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw error;
    return { ok: true };
  });

/**
 * Public: a moving company registers itself. The account is created with
 * "Pending approval" status — it can sign in and complete its profile, but it
 * receives no leads until an Administrator approves it.
 */
export const registerMovingCompany = createServerFn({ method: "POST" })
  .inputValidator(
    (i: {
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      password: string;
      dotNumber?: string;
      mcNumber?: string;
      serviceStates?: string[];
    }) => {
      const companyName = (i.companyName ?? "").trim();
      const contactName = (i.contactName ?? "").trim();
      const email = (i.email ?? "").trim().toLowerCase();
      const phone = (i.phone ?? "").trim();
      const password = i.password ?? "";
      if (!companyName || companyName.length > 120) throw new Error("Company name is required");
      if (!contactName || contactName.length > 120) throw new Error("Contact name is required");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A valid email is required");
      if (normalizePhone(phone).length < 10) throw new Error("A valid phone number is required");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      return {
        companyName,
        contactName,
        email,
        phone,
        password,
        dotNumber: (i.dotNumber ?? "").trim() || null,
        mcNumber: (i.mcNumber ?? "").trim() || null,
        serviceStates: (i.serviceStates ?? []).slice(0, 60),
      };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.contactName },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create the account");
    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.contactName,
      phone: data.phone,
      status: "active",
    } as any);

    const { data: company, error: cErr } = await supabaseAdmin
      .from("moving_companies")
      .insert({
        name: data.companyName,
        email: data.email,
        phone: data.phone,
        dot_number: data.dotNumber,
        mc_number: data.mcNumber,
        service_states: data.serviceStates,
        license_status: "pending",
        approved: false,
        suspended: false,
        active: true,
      } as any)
      .select("id")
      .single();
    if (cErr) throw cErr;

    await supabaseAdmin
      .from("company_members")
      .insert({ company_id: company.id, user_id: userId, role: "owner" } as any);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "mover" } as any);

    return { companyId: company.id as string };
  });
