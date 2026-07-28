import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadRoleContext, ROLE_HOME, type PlatformRole } from "@/lib/roles";

/**
 * Client-side RBAC gate. Every dashboard shell is wrapped in one of these so a
 * user can never render a workspace that belongs to another role.
 * Server-side enforcement lives in RLS + server functions.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: PlatformRole[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = await loadRoleContext();
      if (cancelled) return;

      if (!ctx) {
        navigate({ to: "/auth" });
        return;
      }
      if (ctx.status === "disabled") {
        await supabase.auth.signOut();
        navigate({ to: "/auth", search: { disabled: "1" } as never });
        return;
      }
      // Administrators have unrestricted access to every workspace.
      if (!ctx.roles.includes("admin") && !ctx.roles.some((r) => allow.includes(r))) {
        navigate({ to: ROLE_HOME[ctx.primaryRole] as never });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
