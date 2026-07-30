import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/auth.functions";
import { devQuickSignIn } from "@/lib/dev-login.functions";
import { DEV_ACCOUNTS, DEV_LOGIN_ENABLED, type DevRole } from "@/lib/dev-login";
import { homeForRoles, loadRoleContext, type PlatformRole } from "@/lib/roles";
import { toast } from "sonner";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Easy Move Pro" },
      {
        name: "description",
        content:
          "One secure sign-in for customers, moving companies, brokers and administrators of Easy Move Pro.",
      },
      { property: "og:title", content: "Sign in — Easy Move Pro" },
      {
        property: "og:description",
        content: "Access your Easy Move Pro workspace with your email or phone number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const signIn = useServerFn(signInWithIdentifier);
  const devSignIn = useServerFn(devQuickSignIn);
  const [busy, setBusy] = useState(false);
  const [devBusy, setDevBusy] = useState<DevRole | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    loadRoleContext().then((ctx) => {
      if (ctx && ctx.status !== "disabled") {
        navigate({ to: homeForRoles(ctx.roles) as never });
      }
    });
  }, [navigate]);

  async function applySession(result: {
    access_token: string;
    refresh_token: string;
    roles: string[];
  }) {
    const { error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (error) throw new Error(error.message);
    navigate({ to: homeForRoles(result.roles as PlatformRole[]) as never });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await signIn({ data: { identifier, password } });
      toast.success("Welcome back.");
      await applySession(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you in");
    } finally {
      setBusy(false);
    }
  }

  async function onDevLogin(role: DevRole) {
    setDevBusy(role);
    try {
      const result = await devSignIn({ data: { role } });
      toast.success("Signed in with a demo account.");
      await applySession(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo sign-in failed");
    } finally {
      setDevBusy(null);
    }
  }


  return (
    <SiteLayout>
      <section className="mx-auto flex max-w-md flex-col justify-center px-4 sm:px-6 py-16 sm:py-24">
        <Link to="/" className="mb-6 text-sm text-muted-foreground hover:text-foreground">
          ← Back home
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-serif text-3xl font-medium">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One sign-in for customers, moving companies, brokers and administrators. We send you to
            the right workspace automatically.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="identifier">Email or phone number</Label>
              <Input
                id="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@company.com or (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          {DEV_LOGIN_ENABLED && (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Development login — QA only
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                One-click access to seeded demo accounts. Hidden in production.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEV_ACCOUNTS.map((a) => (
                  <Button
                    key={a.role}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start rounded-full"
                    disabled={devBusy !== null || busy}
                    onClick={() => onDevLogin(a.role as DevRole)}
                  >
                    {devBusy === a.role && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Login as {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}



          <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
            <p>
              Moving company?{" "}
              <Link to="/register-company" className="font-medium text-foreground underline">
                Apply to join the network
              </Link>
            </p>
            <p>
              Customer without an account? Start with an{" "}
              <Link to="/calculator" className="font-medium text-foreground underline">
                instant moving quote
              </Link>{" "}
              — we create your account for you.
            </p>
            <p className="flex items-start gap-2 pt-2 text-xs">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Broker and administrator accounts are issued by the platform administrator only.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
