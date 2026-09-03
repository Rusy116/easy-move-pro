import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  getImpersonation,
  installImpersonationAudit,
  ROLE_TITLE,
  stopViewAs,
  subscribeImpersonation,
  type ImpersonationMeta,
} from "@/lib/impersonation";
import { useI18n } from "@/i18n";

export function useImpersonation(): ImpersonationMeta | null {
  return useSyncExternalStore(
    subscribeImpersonation,
    () => getImpersonation(),
    () => null,
  );
}

/**
 * Persistent "you are viewing as another user" banner. Rendered once at the
 * root so it appears on every page of every workspace.
 */
export function ImpersonationBanner() {
  const meta = useImpersonation();
  const navigate = useNavigate();
  const { t: tr } = useI18n();
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    installImpersonationAudit();
  }, []);

  if (!mounted || !meta) return null;

  async function onReturn() {
    setBusy(true);
    try {
      await stopViewAs();
      toast.success(tr("admin.shell.impersonation.returned"));
      navigate({ to: "/admin/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("admin.shell.impersonation.restoreError"));
      navigate({ to: "/auth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-[60] w-full border-b border-amber-400/60 bg-amber-100 text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <Eye className="h-4 w-4 shrink-0" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="min-w-0 break-words">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
              {tr("admin.shell.impersonation.viewingAs")}
            </span>{" "}
            <span className="font-semibold">{meta.name}</span>
          </span>
          <span className="min-w-0 break-words">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
              {tr("admin.shell.impersonation.role")}
            </span>{" "}
            <span className="font-semibold">{ROLE_TITLE[meta.role]}</span>
          </span>
          <span className="hidden opacity-80 md:inline">
            {tr("admin.shell.impersonation.notice")}
          </span>
        </div>
        <button
          onClick={() => void onReturn()}
          disabled={busy}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-950 px-4 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-900 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          {tr("admin.shell.impersonation.returnAdmin")}
        </button>
      </div>
    </div>
  );
}
