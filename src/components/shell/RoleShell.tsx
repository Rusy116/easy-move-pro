import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isFeatureEnabled, readLocalOverrides, type FeatureFlag } from "@/lib/feature-flags";
import { loadRoleContext, type PlatformRole } from "@/lib/roles";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

/** "Available jobs" -> "nav.availableJobs" so nav labels localize automatically. */
function navKey(label: string) {
  const [first, ...rest] = label.trim().split(/\s+/);
  return `nav.${first.toLowerCase()}${rest.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")}`;
}


export type ShellNavItem = {
  to: string;
  label: string;
  icon?: ReactNode;
  /** Optional feature flag — item is hidden when the flag is off. */
  flag?: FeatureFlag;
};

export type RoleShellProps = {
  brand: string;
  eyebrow: string;
  accent: "admin" | "broker" | "company" | "customer";
  nav: ShellNavItem[];
  children: ReactNode;
};

const ACCENT: Record<RoleShellProps["accent"], string> = {
  admin: "from-slate-900 to-slate-700",
  broker: "from-ochre to-sage",
  company: "from-sage to-emerald-700",
  customer: "from-ochre to-amber-600",
};

export function RoleShell({ brand, eyebrow, accent, nav, children }: RoleShellProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [flagOverrides, setFlagOverrides] = useState<Partial<Record<FeatureFlag, boolean>>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    setFlagOverrides(readLocalOverrides());
    loadRoleContext().then((ctx) => setRole(ctx?.primaryRole ?? null));
  }, []);

  const visibleNav = useMemo(
    () =>
      nav
        .filter((n) => !n.flag || isFeatureEnabled(n.flag, role, flagOverrides))
        .map((n) => {
          const translated = t(navKey(n.label));
          return { ...n, label: translated.startsWith("nav.") ? n.label : translated };
        }),
    [nav, role, flagOverrides, t],
  );

  const eyebrowLabel = (() => {
    const translated = t(`shell.eyebrow.${accent}`);
    return translated.startsWith("shell.") ? eyebrow : translated;
  })();


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex shrink-0 items-center gap-3 min-w-0">
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${ACCENT[accent]} text-white font-serif text-sm shadow-sm`}
                aria-hidden
              >
                {brand.charAt(0)}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {eyebrowLabel}
                </div>
                <div className="truncate font-serif text-base font-medium">{brand}</div>
              </div>
            </div>
            <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1.5 md:flex">
              {visibleNav.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground/5 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    {n.icon}
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <LanguageSwitcher />
            {email && (
              <span className="max-w-[180px] truncate text-xs text-muted-foreground" title={email}>
                {email}
              </span>
            )}
            <Button variant="outline" size="sm" className="rounded-full whitespace-nowrap" onClick={signOut}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t("common.signOut")}
            </Button>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher compact />
            <button
              className="rounded-md p-2 hover:bg-accent"
              onClick={() => setOpen((v) => !v)}
              aria-label={t("shell.toggleMenu")}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
        {open && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3">
              {visibleNav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <span className="inline-flex items-start gap-2 whitespace-normal break-words">
                    {n.icon}
                    {n.label}
                  </span>
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                {email && (
                  <div className="px-3 pb-2 text-xs text-muted-foreground truncate">{email}</div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full"
                  onClick={signOut}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t("common.signOut")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

export function AccessDenied({
  title,
  message,
  backHref = "/",
  backLabel,
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-serif text-3xl">{title ?? t("admin.shell.accessDenied.title")}</h1>
      <p className="mt-3 break-words text-muted-foreground">
        {message ?? t("admin.shell.accessDenied.message")}
      </p>
      <Link to={backHref} className="mt-6 inline-block text-primary hover:underline">
        ← {backLabel ?? t("admin.shell.accessDenied.backHome")}
      </Link>
    </div>
  );
}
