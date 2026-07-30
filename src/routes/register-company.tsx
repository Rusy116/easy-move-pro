import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Building2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { registerMovingCompany } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/register-company")({
  head: () => ({
    meta: [
      { title: "Register your moving company — Easy Move Pro" },
      {
        name: "description",
        content:
          "Create a moving company account on Easy Move Pro. Complete your profile, upload licensing documents and start receiving verified moving leads once approved.",
      },
      { property: "og:title", content: "Register your moving company — Easy Move Pro" },
      {
        property: "og:description",
        content: "Join the Easy Move Pro carrier network and receive verified moving leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterCompanyPage,
});

function RegisterCompanyPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerMovingCompany);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
    dotNumber: "",
    mcNumber: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ data: form });
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error) throw new Error(error.message);
      toast.success("Account created — your application is pending approval.");
      navigate({ to: "/company/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 sm:px-6 py-14 sm:py-20">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sage-soft text-sage">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Carrier network
            </p>
            <h1 className="font-serif text-3xl font-medium">Register your moving company</h1>
          </div>
        </div>

        <p className="mb-8 text-sm text-muted-foreground">
          Your account is created instantly with <strong>Pending approval</strong> status. You can
          sign in right away to complete your profile, settings and documents. Leads are delivered
          only after an administrator approves your licensing details.
        </p>

        <form
          onSubmit={onSubmit}
          className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                required
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contactName">Contact name</Label>
              <Input
                id="contactName"
                required
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dot">USDOT number</Label>
              <Input
                id="dot"
                value={form.dotNumber}
                onChange={(e) => set("dotNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mc">MC number</Label>
              <Input
                id="mc"
                value={form.mcNumber}
                onChange={(e) => set("mcNumber", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <Button type="submit" disabled={busy} className="rounded-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create company account
          </Button>
        </form>
      </section>
    </SiteLayout>
  );
}
