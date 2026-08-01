import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin "View as user" (impersonation).
 *
 * A super admin (any account holding the `admin` role) can mint a REAL Supabase
 * session for another account. Because the browser then holds that user's own
 * JWT, every RLS policy, RPC and server function behaves exactly as it does for
 * the real user — no shadow permissions, no duplicate dashboards.
 *
 * The admin's own session tokens are kept client-side (sessionStorage) so
 * "Return to Admin" restores them without a new login.
 *
 * Every impersonation session and every action performed while impersonating is
 * written to `impersonation_sessions` / `impersonation_events`.
 */

export type ImpersonationRole = "admin" | "broker" | "mover" | "customer";

export type ImpersonatableUser = {
  id: string;
  email: string;
  name: string;
  role: ImpersonationRole;
  status: string;
  company_name: string | null;
};

export type StartImpersonationResult = {
  sessionId: string;
  tokenHash: string;
  target: { id: string; email: string; name: string; role: ImpersonationRole };
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: super administrator access required");
}

function clientMeta() {
  let ip: string | undefined;
  let ua: string | undefined;
  try {
    ip = getRequestIP({ xForwardedFor: true });
    ua = getRequestHeader("user-agent");
  } catch {
    /* not in a request context */
  }
  return { ip_address: ip ?? null, user_agent: ua ?? null };
}

const PRECEDENCE: ImpersonationRole[] = ["admin", "broker", "mover", "customer"];

function pickRole(roles: string[]): ImpersonationRole {
  for (const r of PRECEDENCE) if (roles.includes(r)) return r;
  return "customer";
}

/** Admin: searchable directory of every account that can be impersonated. */
export const adminListImpersonatableUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { search?: string; role?: string } | undefined) => ({
    search: (i?.search ?? "").trim().toLowerCase(),
    role: i?.role ?? "all",
  }))
  .handler(async ({ data, context }): Promise<ImpersonatableUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: roleRows }, { data: profiles }, { data: members }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, full_name, status")
        .limit(2000),
      supabaseAdmin.from("company_members").select("user_id, company_id"),
    ]);

    const { data: companies } = await supabaseAdmin.from("moving_companies").select("id, name");
    const companyById = new Map((companies ?? []).map((c: any) => [c.id as string, c.name as string]));
    const companyForUser = new Map(
      (members ?? []).map((m: any) => [m.user_id as string, companyById.get(m.company_id) ?? null]),
    );

    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const list = rolesByUser.get((r as any).user_id) ?? [];
      list.push((r as any).role);
      rolesByUser.set((r as any).user_id, list);
    }

    // Emails come from auth (profiles do not store them).
    const emailById = new Map<string, string>();
    for (let page = 1; page <= 5; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of list?.users ?? []) emailById.set(u.id, u.email ?? "");
      if ((list?.users?.length ?? 0) < 1000) break;
    }

    const rows: ImpersonatableUser[] = (profiles ?? []).map((p: any) => {
      const roles = rolesByUser.get(p.id) ?? [];
      return {
        id: p.id as string,
        email: emailById.get(p.id) ?? "",
        name:
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          (p.full_name as string) ||
          emailById.get(p.id) ||
          "Unnamed account",
        role: pickRole(roles),
        status: (p.status as string) ?? "active",
        company_name: companyForUser.get(p.id) ?? null,
      };
    });

    const filtered = rows.filter((r) => {
      if (data.role !== "all" && r.role !== data.role) return false;
      if (!data.search) return true;
      return (
        r.name.toLowerCase().includes(data.search) ||
        r.email.toLowerCase().includes(data.search) ||
        (r.company_name ?? "").toLowerCase().includes(data.search)
      );
    });

    filtered.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
    return filtered.slice(0, 300);
  });

/** Admin: resolve the account that owns / belongs to a moving company. */
export const adminCompanyPrimaryUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { companyId: string }) => {
    if (!i?.companyId) throw new Error("companyId is required");
    return { companyId: i.companyId };
  })
  .handler(async ({ data, context }): Promise<ImpersonatableUser | null> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabaseAdmin
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", data.companyId);
    if (!members?.length) return null;

    const owner =
      (members as any[]).find((m) => m.role === "owner") ?? (members as any[])[0];
    const userId = owner.user_id as string;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, full_name, status")
      .eq("id", userId)
      .maybeSingle();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const { data: company } = await supabaseAdmin
      .from("moving_companies")
      .select("name")
      .eq("id", data.companyId)
      .maybeSingle();

    return {
      id: userId,
      email: u?.user?.email ?? "",
      name:
        [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") ||
        ((profile as any)?.full_name as string) ||
        u?.user?.email ||
        "Company account",
      role: "mover",
      status: ((profile as any)?.status as string) ?? "active",
      company_name: ((company as any)?.name as string) ?? null,
    };
  });

/**
 * Admin: begin impersonating a user. Returns a one-time magic-link token hash
 * that the browser exchanges for that user's real session via `verifyOtp`.
 */
export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string }) => {
    if (!i?.userId) throw new Error("userId is required");
    return { userId: i.userId };
  })
  .handler(async ({ data, context }): Promise<StartImpersonationResult> => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You are already signed in as this user");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(
      data.userId,
    );
    if (targetErr || !target?.user?.email) throw new Error("That account cannot be impersonated");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, full_name, status")
      .eq("id", data.userId)
      .maybeSingle();
    if (((profile as any)?.status as string) === "disabled") {
      throw new Error("This account is disabled — re-enable it before viewing as this user");
    }

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const role = pickRole((roleRows ?? []).map((r: any) => r.role as string));

    const name =
      [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") ||
      ((profile as any)?.full_name as string) ||
      target.user.email;

    // Mint a one-time login token for the target account.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
    });
    const tokenHash = (link as any)?.properties?.hashed_token as string | undefined;
    if (linkErr || !tokenHash) {
      throw new Error(linkErr?.message ?? "Could not create an impersonation session");
    }

    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const meta = clientMeta();

    const { data: sessionRow, error: sessionErr } = await supabaseAdmin
      .from("impersonation_sessions")
      .insert({
        admin_user_id: context.userId,
        admin_email: adminUser?.user?.email ?? null,
        target_user_id: data.userId,
        target_email: target.user.email,
        target_name: name,
        target_role: role,
        ...meta,
      } as never)
      .select("id")
      .single();
    if (sessionErr) throw new Error(sessionErr.message);

    await supabaseAdmin.from("impersonation_events").insert({
      session_id: (sessionRow as any).id,
      admin_user_id: context.userId,
      target_user_id: data.userId,
      target_role: role,
      action: "impersonation.start",
      detail: { email: target.user.email },
      ...meta,
    } as never);

    return {
      sessionId: (sessionRow as any).id as string,
      tokenHash,
      target: { id: data.userId, email: target.user.email, name, role },
    };
  });

/** Admin: end an impersonation session (called once the admin session is restored). */
export const stopImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { sessionId: string }) => {
    if (!i?.sessionId) throw new Error("sessionId is required");
    return { sessionId: i.sessionId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("impersonation_sessions")
      .select("id, admin_user_id, target_user_id, target_role, ended_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!row) throw new Error("Impersonation session not found");
    if ((row as any).admin_user_id !== context.userId) throw new Error("Forbidden");

    const meta = clientMeta();
    if (!(row as any).ended_at) {
      await supabaseAdmin
        .from("impersonation_sessions")
        .update({ ended_at: new Date().toISOString() } as never)
        .eq("id", data.sessionId);

      await supabaseAdmin.from("impersonation_events").insert({
        session_id: data.sessionId,
        admin_user_id: context.userId,
        target_user_id: (row as any).target_user_id,
        target_role: (row as any).target_role,
        action: "impersonation.stop",
        detail: {},
        ...meta,
      } as never);
    }
    return { ok: true };
  });

/**
 * Records one action performed while impersonating. Called with the
 * IMPERSONATED user's bearer token, so it verifies the caller really is the
 * target of that open session before writing the audit row.
 */
export const logImpersonationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { sessionId: string; action: string; detail?: Record<string, unknown> }) => {
    if (!i?.sessionId || !i?.action) throw new Error("sessionId and action are required");
    return {
      sessionId: i.sessionId,
      action: i.action.slice(0, 200),
      detail: i.detail ?? {},
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("impersonation_sessions")
      .select("id, admin_user_id, target_user_id, target_role, ended_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!row) return { ok: false };
    if ((row as any).ended_at) return { ok: false };
    if ((row as any).target_user_id !== context.userId) return { ok: false };

    await supabaseAdmin.from("impersonation_events").insert({
      session_id: data.sessionId,
      admin_user_id: (row as any).admin_user_id,
      target_user_id: (row as any).target_user_id,
      target_role: (row as any).target_role,
      action: data.action,
      detail: data.detail as never,
      ...clientMeta(),
    } as never);

    return { ok: true };
  });

export type ImpersonationSessionRow = {
  id: string;
  admin_email: string | null;
  target_name: string | null;
  target_email: string | null;
  target_role: string;
  ip_address: string | null;
  user_agent: string | null;
  started_at: string;
  ended_at: string | null;
  event_count: number;
};

/** Admin: audit trail of impersonation sessions. */
export const adminListImpersonationSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImpersonationSessionRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sessions } = await supabaseAdmin
      .from("impersonation_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);
    const { data: events } = await supabaseAdmin
      .from("impersonation_events")
      .select("session_id");

    const counts = new Map<string, number>();
    for (const e of events ?? [])
      counts.set((e as any).session_id, (counts.get((e as any).session_id) ?? 0) + 1);

    return (sessions ?? []).map((s: any) => ({
      id: s.id,
      admin_email: s.admin_email,
      target_name: s.target_name,
      target_email: s.target_email,
      target_role: s.target_role,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      started_at: s.started_at,
      ended_at: s.ended_at,
      event_count: counts.get(s.id) ?? 0,
    }));
  });

export type ImpersonationEventRow = {
  id: string;
  action: string;
  detail: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

/** Admin: every action recorded for one impersonation session. */
export const adminListImpersonationEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { sessionId: string }) => {
    if (!i?.sessionId) throw new Error("sessionId is required");
    return { sessionId: i.sessionId };
  })
  .handler(async ({ data, context }): Promise<ImpersonationEventRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("impersonation_events")
      .select("id, action, detail, ip_address, user_agent, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false })
      .limit(500);

    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      action: r.action as string,
      detail: JSON.stringify(r.detail ?? {}),
      ip_address: r.ip_address ?? null,
      user_agent: r.user_agent ?? null,
      created_at: r.created_at as string,
    }));
  });
