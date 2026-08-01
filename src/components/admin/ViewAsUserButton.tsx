import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { impersonationHome, startViewAs } from "@/lib/impersonation";
import type { ImpersonationRole } from "@/lib/impersonation.functions";

/**
 * "View as User" — available from every admin directory. Opens a real session
 * for the selected account without signing the administrator out.
 */
export function ViewAsUserButton({
  userId,
  label = "View as User",
  size = "sm",
  variant = "outline",
  className,
  disabled,
  onResolveUserId,
}: {
  userId?: string | null;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "default" | "ghost" | "secondary";
  className?: string;
  disabled?: boolean;
  /** Optional async resolver, e.g. company → owner account. */
  onResolveUserId?: () => Promise<string | null>;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const id = userId ?? (onResolveUserId ? await onResolveUserId() : null);
      if (!id) throw new Error("This record has no linked user account");
      const meta = await startViewAs(id);
      toast.success(`Now viewing as ${meta.name}`);
      navigate({ to: impersonationHome(meta.role as ImpersonationRole) as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start impersonation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className ?? "rounded-full"}
      disabled={busy || disabled}
      onClick={() => void go()}
    >
      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}
      {label}
    </Button>
  );
}
