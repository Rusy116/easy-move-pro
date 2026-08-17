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
import { useI18n } from "@/i18n";


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
  // `?signup=1&email=...` comes from the estimate email. It only pre-fills the
  // sign-up form — the quote itself is linked server-side by email through
  // fn_claim_my_records, never through anything passed in the URL.
  validateSearch: (
    search: Record<string, unknown>,
  ): { signup?: boolean; email?: string } => ({
    ...(search['signup'] === "1" || search['signup'] === true ? { signup: true } : {}),
    ...(typeof search['email'] === "string" ? { email: search['email'].slice(0, 200) } : {}),
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const search = Route.useSearch();
  const signIn = useServerFn(signInWithIdentifier);
  const devSignIn = useServerFn(devQuickSignIn);
  const [busy, setBusy] = useState(false);
  const [devBusy, setDevBusy] = useState<DevRole | null>(null);
  const [identifier, setIdentifier] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">(search.signup ? "signup" : "signin");
  const [confirmSent, setConfirmSent] = useState(false);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const email = identifier.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/customer/dashboard` },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        setConfirmSent(true);
        toast.success("Check your email to confirm your account.");
        return;
      }
      // Session is live: attach any guest quotes/orders placed with this email.
      await (supabase as unknown as { rpc: (fn: string) => Promise<unknown> })
        .rpc("fn_claim_my_records")
        .catch(() => undefined);
      toast.success("Your account is ready.");
      navigate({ to: "/customer/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't create your account.");
    } finally {
      setBusy(false);
    }
  }

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
      toast.success(t("auth.welcome"));
      await applySession(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onDevLogin(role: DevRole) {
    setDevBusy(role);
    try {
      const result = await devSignIn({ data: { role } });
      toast.success(t("auth.dev.success"));
      await applySession(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.dev.failed"));
    } finally {
      setDevBusy(null);
    }
  }


  return (
    <SiteLayout>
      <section className="mx-auto flex max-w-md flex-col justify-center px-4 sm:px-6 py-16 sm:py-24">
        <Link to="/" className="mb-6 text-sm text-muted-foreground hover:text-foreground">
          ← {t("auth.backHome")}
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-serif text-3xl font-medium">
            {mode === "signup" ? "Create your account" : t("auth.heading")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Set a password to save your estimate and track your move. We'll link the quote you already submitted with this email — nothing is duplicated."
              : t("auth.intro")}
          </p>

          {confirmSent ? (
            <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Confirm your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a confirmation link to <span className="font-medium">{identifier}</span>.
                Open it and you'll land straight in your dashboard with your estimate attached.
              </p>
            </div>
          ) : (
          <form
            onSubmit={mode === "signup" ? onSignUp : onSubmit}
            className="mt-6 space-y-4"
          >
            <div>
              <Label htmlFor="identifier">{t("auth.identifier")}</Label>
              <Input
                id="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("auth.identifierPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="password">{t("common.password")}</Label>
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
              {t("common.signIn")}
            </Button>
          </form>

          {DEV_LOGIN_ENABLED && (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("auth.dev.title")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.dev.copy")}
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
                    {t("auth.dev.loginAs", { role: a.label })}
                  </Button>
                ))}
              </div>
            </div>
          )}



          <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
            <p>
              {t("auth.company.question")}{" "}
              <Link to="/register-company" className="font-medium text-foreground underline">
                {t("auth.company.apply")}
              </Link>
            </p>
            <p>
              {t("auth.customer.question")}{" "}
              <Link to="/calculator" className="font-medium text-foreground underline">
                {t("auth.customer.quote")}
              </Link>{" "}
              {t("auth.customer.tail")}
            </p>
            <p className="flex items-start gap-2 pt-2 text-xs">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("auth.adminNote")}
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
