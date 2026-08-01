import { supabase } from "@/integrations/supabase/client";
import {
  logImpersonationAction,
  startImpersonation,
  stopImpersonation,
  type ImpersonationRole,
} from "@/lib/impersonation.functions";
import { ROLE_HOME } from "@/lib/roles";

/**
 * Client side of the admin "View as user" system.
 *
 * The browser holds the impersonated user's REAL Supabase session, so every
 * request runs under that user's RLS context and executes real business logic.
 * The admin's own tokens are parked in sessionStorage so returning to admin is
 * a session swap, not a new login.
 */

const META_KEY = "em.impersonation.meta";
const ADMIN_KEY = "em.impersonation.adminSession";

export type ImpersonationMeta = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: ImpersonationRole;
  startedAt: string;
};

const listeners = new Set<() => void>();
let cached: ImpersonationMeta | null | undefined;

function emit() {
  cached = undefined;
  for (const l of listeners) l();
}

export function subscribeImpersonation(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getImpersonation(): ImpersonationMeta | null {
  if (typeof window === "undefined") return null;
  if (cached !== undefined) return cached;
  try {
    const raw = window.sessionStorage.getItem(META_KEY);
    cached = raw ? (JSON.parse(raw) as ImpersonationMeta) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isImpersonating() {
  return getImpersonation() !== null;
}

function clearImpersonation() {
  window.sessionStorage.removeItem(META_KEY);
  window.sessionStorage.removeItem(ADMIN_KEY);
  emit();
}

export const ROLE_TITLE: Record<ImpersonationRole, string> = {
  admin: "Administrator",
  broker: "Broker",
  mover: "Moving Company",
  customer: "Customer",
};

/** Fire-and-forget audit entry for one impersonated action. */
export function recordImpersonatedAction(action: string, detail: Record<string, unknown> = {}) {
  const meta = getImpersonation();
  if (!meta) return;
  void logImpersonationAction({ data: { sessionId: meta.sessionId, action, detail } }).catch(
    () => undefined,
  );
}

/* ------------------------------------------------------------------ */
/*            Automatic auditing of every impersonated write           */
/* ------------------------------------------------------------------ */

let interceptorInstalled = false;

/** Wraps window.fetch so every data-changing call made while impersonating is logged. */
export function installImpersonationAudit() {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input as never, init);
    try {
      const meta = getImpersonation();
      if (!meta) return response;

      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      const method = (
        init?.method ??
        (typeof input === "object" && "method" in (input as Request)
          ? (input as Request).method
          : "GET")
      ).toUpperCase();

      const isSupabase = supabaseUrl && url.startsWith(supabaseUrl);
      const isServerFn = url.includes("_serverFn");
      const isAuditCall = url.includes("logImpersonationAction");
      const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

      if (!isAuditCall && mutating && (isSupabase || isServerFn)) {
        const path = url.replace(supabaseUrl, "").split("?")[0] ?? url;
        let action = `${method} ${path}`;
        if (path.includes("/rest/v1/rpc/")) action = `rpc:${path.split("/rpc/")[1]}`;
        else if (path.includes("/rest/v1/")) action = `${method.toLowerCase()}:${path.split("/rest/v1/")[1]}`;
        else if (isServerFn) {
          const fn = new URL(url, window.location.origin).searchParams.get("_serverFnId") ?? path;
          action = `fn:${fn}`;
        }
        recordImpersonatedAction(action, { url: path, method, status: response.status });
      }
    } catch {
      /* auditing must never break the app */
    }
    return response;
  };
}

/* ------------------------------------------------------------------ */
/*                          Start / stop                               */
/* ------------------------------------------------------------------ */

/** Super admin: swap the browser into the target user's real session. */
export async function startViewAs(userId: string): Promise<ImpersonationMeta> {
  const { data: current } = await supabase.auth.getSession();
  const adminSession = current.session;
  if (!adminSession) throw new Error("Your admin session expired — sign in again");

  const result = await startImpersonation({ data: { userId } });

  // Park the admin tokens BEFORE swapping sessions.
  window.sessionStorage.setItem(
    ADMIN_KEY,
    JSON.stringify({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    }),
  );

  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: result.tokenHash,
  });
  if (error) {
    window.sessionStorage.removeItem(ADMIN_KEY);
    throw new Error(error.message);
  }

  const meta: ImpersonationMeta = {
    sessionId: result.sessionId,
    userId: result.target.id,
    name: result.target.name,
    email: result.target.email,
    role: result.target.role,
    startedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  emit();
  installImpersonationAudit();
  return meta;
}

export function impersonationHome(role: ImpersonationRole) {
  return ROLE_HOME[role];
}

/** Restore the admin session and close the impersonation audit record. */
export async function stopViewAs(): Promise<void> {
  const meta = getImpersonation();
  const raw = window.sessionStorage.getItem(ADMIN_KEY);
  if (!raw) {
    clearImpersonation();
    throw new Error("Admin session was lost — please sign in again");
  }

  const tokens = JSON.parse(raw) as { access_token: string; refresh_token: string };
  const { error } = await supabase.auth.setSession(tokens);
  if (error) {
    clearImpersonation();
    throw new Error("Admin session expired — please sign in again");
  }

  clearImpersonation();
  if (meta) {
    await stopImpersonation({ data: { sessionId: meta.sessionId } }).catch(() => undefined);
  }
}
