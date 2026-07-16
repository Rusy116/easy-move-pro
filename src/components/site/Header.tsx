import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/calculator", label: "Calculator" },
  { to: "/services", label: "Services" },
  { to: "/cities", label: "City Pages" },
  { to: "/store", label: "Store" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
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
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {authed ? (
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
          )}
          <Link to="/calculator">
            <Button size="sm" className="rounded-full">Get Instant Quote</Button>
          </Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {authed ? (
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" className="w-full">Sign in</Button>
                </Link>
              )}
              <Link to="/calculator" onClick={() => setOpen(false)} className="flex-1">
                <Button className="w-full rounded-full">Get Quote</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
