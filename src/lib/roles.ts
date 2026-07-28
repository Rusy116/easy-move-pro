import { supabase } from "@/integrations/supabase/client";

/** The only four roles that may exist on the platform. */
export type PlatformRole = "admin" | "broker" | "mover" | "customer";

export const ROLE_HOME: Record<PlatformRole, string> = {
  admin: "/admin",
  broker: "/broker",
  mover: "/company",
  customer: "/customer",
};

export const ROLE_LABEL: Record<PlatformRole, string> = {
  admin: "Administrator",
  broker: "Broker",
  mover: "Moving company",
  customer: "Customer",
};

export type RoleContext = {
  userId: string;
  email: string;
  roles: PlatformRole[];
  primaryRole: PlatformRole;
  status: string;
};

const PRECEDENCE: PlatformRole[] = ["admin", "broker", "mover", "customer"];

export function pickPrimaryRole(roles: string[]): PlatformRole {
  for (const r of PRECEDENCE) if (roles.includes(r)) return r;
  return "customer";
}

/** Reads the signed-in user's roles + account status. Returns null when signed out. */
export async function loadRoleContext(): Promise<RoleContext | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("status").eq("id", user.id).maybeSingle(),
  ]);

  const roles = ((roleRows ?? []).map((r) => r.role as string).filter((r) =>
    PRECEDENCE.includes(r as PlatformRole),
  ) as PlatformRole[]);

  return {
    userId: user.id,
    email: user.email ?? "",
    roles: roles.length ? roles : ["customer"],
    primaryRole: pickPrimaryRole(roles),
    status: (profile?.status as string) ?? "active",
  };
}

export function homeForRoles(roles: PlatformRole[]) {
  return ROLE_HOME[pickPrimaryRole(roles)];
}
