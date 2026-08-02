import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const nav = [
  { to: "/calculator", key: "site.nav.calculator" },
  { to: "/services", key: "site.nav.services" },
  { to: "/cities", key: "site.nav.cities" },
  { to: "/store", key: "site.nav.store" },
  { to: "/blog", key: "site.nav.blog" },
  { to: "/partners", key: "site.nav.partners" },
  { to: "/about", key: "site.nav.about" },
  { to: "/contact", key: "site.nav.contact" },
] as const;

export function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-serif text-xl font-semibold tracking-tight text-primary">
            Easy Moving
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {authed ? (
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                {t("common.dashboard")}
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                {t("common.signIn")}
              </Button>
            </Link>
          )}
          <Link to="/calculator">
            <Button size="sm" className="rounded-full">
              {t("site.cta.quote")}
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher compact />
          <button onClick={() => setOpen((v) => !v)} aria-label={t("shell.toggleMenu")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t(n.key)}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {authed ? (
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">
                    {t("common.dashboard")}
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">
                    {t("common.signIn")}
                  </Button>
                </Link>
              )}
              <Link to="/calculator" onClick={() => setOpen(false)} className="flex-1">
                <Button className="w-full rounded-full">{t("site.cta.quoteShort")}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
