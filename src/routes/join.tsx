import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ArrowRight, ArrowLeft, Loader2, PartyPopper } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";
import { supabase } from "@/integrations/supabase/client";
import { STATES } from "@/lib/seo/locations";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: seoMeta({
      title: "Join Easy Moving — Partner Signup for Moving Companies",
      description:
        "Apply to become an Easy Moving partner. Get exclusive moving leads, a CRM, dispatch, and invoicing. Approval in 1–3 business days.",
      path: "/join",
    }),
    links: [{ rel: "canonical", href: absoluteUrl("/join") }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Partners", url: "/partners" },
          { name: "Join", url: "/join" },
        ]),
      ),
    ],
  }),
  component: JoinFunnel,
});

const SERVICES = [
  "Local moves",
  "Long-distance moves",
  "Packing",
  "Storage",
  "Piano/heavy items",
  "Commercial moves",
  "International",
  "Auto transport",
];

type FormState = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  years_in_business: string;
  usdot_number: string;
  mc_number: string;
  insurance_carrier: string;
  insurance_policy: string;
  service_states: string[];
  service_cities: string;
  service_radius_miles: string;
  trucks_count: string;
  crew_size: string;
  services_offered: string[];
  notes: string;
};

const INITIAL: FormState = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  years_in_business: "",
  usdot_number: "",
  mc_number: "",
  insurance_carrier: "",
  insurance_policy: "",
  service_states: [],
  service_cities: "",
  service_radius_miles: "",
  trucks_count: "",
  crew_size: "",
  services_offered: [],
  notes: "",
};

const STEPS = [
  { key: "company", label: "Company" },
  { key: "credentials", label: "Credentials" },
  { key: "areas", label: "Service Areas" },
  { key: "fleet", label: "Fleet" },
  { key: "review", label: "Review" },
  { key: "done", label: "Approval" },
] as const;

function JoinFunnel() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.company_name.trim()) return "Company name is required.";
      if (!form.contact_name.trim()) return "Contact name is required.";
      if (!/^\S+@\S+\.\S+$/.test(form.contact_email)) return "Valid email is required.";
      if (form.contact_phone.replace(/\D/g, "").length < 10) return "Valid phone is required.";
    }
    if (step === 2 && form.service_states.length === 0) return "Select at least one state.";
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const row = {
        user_id: sess.session?.user.id ?? null,
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim(),
        website: form.website.trim() || null,
        years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
        usdot_number: form.usdot_number.trim() || null,
        mc_number: form.mc_number.trim() || null,
        insurance_carrier: form.insurance_carrier.trim() || null,
        insurance_policy: form.insurance_policy.trim() || null,
        service_states: form.service_states,
        service_cities: form.service_cities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        service_radius_miles: form.service_radius_miles ? Number(form.service_radius_miles) : null,
        trucks_count: form.trucks_count ? Number(form.trucks_count) : null,
        crew_size: form.crew_size ? Number(form.crew_size) : null,
        services_offered: form.services_offered,
        admin_notes: form.notes.trim() || null,
        source: "seo_partners",
      };
      // partner_applications is a new table — types regenerate after migration approval
      const { data, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (r: unknown) => {
              select: (c: string) => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from("partner_applications")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      setAppId(data?.id ?? null);
      setStep(STEPS.length - 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout hideFooter>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Partners", to: "/partners" },
          { label: "Join" },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
            Become an Easy Moving partner
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete this application. Approval takes 1–3 business days.
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={current ? "font-semibold text-foreground" : "text-muted-foreground"}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="text-muted-foreground/50">·</span>}
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-border bg-card p-6">
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company name *">
                <Input
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
              </Field>
              <Field label="Website">
                <Input
                  placeholder="https://"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                />
              </Field>
              <Field label="Your name *">
                <Input
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </Field>
              <Field label="Years in business">
                <Input
                  type="number"
                  min="0"
                  value={form.years_in_business}
                  onChange={(e) => set("years_in_business", e.target.value)}
                />
              </Field>
              <Field label="Email *">
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </Field>
              <Field label="Phone *">
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="US DOT number">
                <Input
                  value={form.usdot_number}
                  onChange={(e) => set("usdot_number", e.target.value)}
                />
              </Field>
              <Field label="MC number">
                <Input value={form.mc_number} onChange={(e) => set("mc_number", e.target.value)} />
              </Field>
              <Field label="Insurance carrier">
                <Input
                  value={form.insurance_carrier}
                  onChange={(e) => set("insurance_carrier", e.target.value)}
                />
              </Field>
              <Field label="Insurance policy #">
                <Input
                  value={form.insurance_policy}
                  onChange={(e) => set("insurance_policy", e.target.value)}
                />
              </Field>
              <p className="md:col-span-2 text-xs text-muted-foreground">
                We verify DOT/MC and insurance during approval. You can update these later in
                Settings.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">States you serve *</Label>
                <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-72 overflow-auto rounded-lg border border-border p-3">
                  {STATES.map((s) => {
                    const checked = form.service_states.includes(s.state!);
                    return (
                      <label
                        key={s.slug}
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer ${checked ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            set(
                              "service_states",
                              e.target.checked
                                ? [...form.service_states, s.state!]
                                : form.service_states.filter((x) => x !== s.state!),
                            )
                          }
                        />
                        {s.state} — {s.name}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Field label="Cities (comma-separated, optional)">
                <Input
                  placeholder="Los Angeles, San Diego, Long Beach"
                  value={form.service_cities}
                  onChange={(e) => set("service_cities", e.target.value)}
                />
              </Field>
              <Field label="Service radius (miles)">
                <Input
                  type="number"
                  min="0"
                  placeholder="50"
                  value={form.service_radius_miles}
                  onChange={(e) => set("service_radius_miles", e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Number of trucks">
                <Input
                  type="number"
                  min="0"
                  value={form.trucks_count}
                  onChange={(e) => set("trucks_count", e.target.value)}
                />
              </Field>
              <Field label="Average crew size">
                <Input
                  type="number"
                  min="1"
                  value={form.crew_size}
                  onChange={(e) => set("crew_size", e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Label className="mb-2 block">Services offered</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map((s) => {
                    const checked = form.services_offered.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() =>
                          set(
                            "services_offered",
                            checked
                              ? form.services_offered.filter((x) => x !== s)
                              : [...form.services_offered, s],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Anything else we should know?">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <ReviewRow label="Company" value={`${form.company_name} · ${form.contact_name}`} />
              <ReviewRow label="Contact" value={`${form.contact_email} · ${form.contact_phone}`} />
              <ReviewRow
                label="Credentials"
                value={`DOT ${form.usdot_number || "—"} · MC ${form.mc_number || "—"}`}
              />
              <ReviewRow label="Service states" value={form.service_states.join(", ") || "—"} />
              <ReviewRow
                label="Radius"
                value={form.service_radius_miles ? `${form.service_radius_miles} mi` : "—"}
              />
              <ReviewRow
                label="Fleet"
                value={`${form.trucks_count || "—"} trucks · ${form.crew_size || "—"} avg crew`}
              />
              <ReviewRow label="Services" value={form.services_offered.join(", ") || "—"} />
              <p className="text-xs text-muted-foreground">
                By submitting, you agree to Easy Moving's partner terms and confirm the information
                above is accurate.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="py-8 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PartyPopper className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-semibold">Application received</h2>
              <p className="mt-2 text-muted-foreground">
                Thanks, {form.contact_name.split(" ")[0] || "partner"}. We'll review your details
                and email {form.contact_email} within 1–3 business days.
              </p>
              {appId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Reference ID: <span className="font-mono">{appId.slice(0, 8).toUpperCase()}</span>
                </p>
              )}
              <div className="mt-6 flex justify-center gap-2">
                <Link to="/">
                  <Button variant="outline">Return home</Button>
                </Link>
                <Link to="/partners">
                  <Button>Explore partners</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={back}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={next}>
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
        {step === 4 && (
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit application"
              )}
            </Button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}
