import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Building2, Upload, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { registerPartnerCompany } from "@/lib/partners.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/partners/apply")({
  head: () => ({
    meta: [
      { title: "Apply to Join — Easy Moving Carrier Network" },
      {
        name: "description",
        content:
          "Register your moving company with Easy Moving. Submit your DOT, MC, insurance and licensing documents and start receiving verified moving leads once approved.",
      },
      { property: "og:title", content: "Apply to Join — Easy Moving Carrier Network" },
      {
        property: "og:description",
        content:
          "Create a moving company account, upload your licensing documents and get approved to receive verified moving leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerApplyPage,
});

const SERVICES = [
  "Local moving",
  "Long distance",
  "Packing",
  "Storage",
  "Piano moving",
  "Office moving",
  "Auto transport",
  "Junk removal",
];

type DocSlot = { key: "license" | "insurance" | "dot"; label: string; kind: string };
const DOC_SLOTS: DocSlot[] = [
  { key: "license", label: "Business license", kind: "license" },
  { key: "insurance", label: "Insurance certificate", kind: "insurance" },
  { key: "dot", label: "DOT documents", kind: "other" },
];

function PartnerApplyPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerPartnerCompany);
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const files = useRef<Record<string, File | null>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    companyName: "",
    ownerFirstName: "",
    ownerLastName: "",
    phone: "",
    email: "",
    password: "",
    dotNumber: "",
    mcNumber: "",
    addressLine1: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    website: "",
    insuranceCarrier: "",
    insurancePolicy: "",
    insuranceExpires: "",
    fleetSize: "",
    moversCount: "",
    serviceStates: "",
    serviceCities: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickFile(slot: DocSlot, f: File | null) {
    files.current[slot.key] = f;
    setFileNames((n) => ({ ...n, [slot.key]: f?.name ?? "" }));
  }

  async function uploadDocuments(companyId: string, userId: string) {
    for (const slot of DOC_SLOTS) {
      const file = files.current[slot.key];
      if (!file) continue;
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/onboarding/${Date.now()}-${slot.key}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("company-documents")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        toast.error(`${slot.label}: ${upErr.message}`);
        continue;
      }
      await supabase.from("company_documents").insert({
        company_id: companyId,
        kind: slot.kind as never,
        name: `${slot.label} — ${file.name}`,
        storage_path: path,
        mime: file.type || null,
        size_bytes: file.size,
        uploaded_by: userId,
      } as never);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { companyId } = await register({
        data: { ...form, servicesOffered: services },
      });

      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (error || !signIn.user) throw new Error(error?.message ?? "Could not sign in");

      await uploadDocuments(companyId, signIn.user.id);

      toast.success("Application submitted — awaiting administrator approval.");
      navigate({ to: "/company/profile" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-sage-soft text-sage">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Carrier network
            </p>
            <h1 className="font-serif text-3xl font-medium">Apply to join Easy Moving</h1>
          </div>
        </div>

        <p className="mb-8 text-sm text-muted-foreground">
          Your account is created instantly with <strong>Pending approval</strong> status. Sign in
          right away to manage your profile, documents and settings. Leads are delivered only after
          an administrator reviews and approves your licensing details.
        </p>

        <form
          onSubmit={onSubmit}
          className="grid gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <Section title="Company">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Company name *">
                <Input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </F>
              <F label="Website">
                <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
              </F>
              <F label="Owner first name *">
                <Input required value={form.ownerFirstName} onChange={(e) => set("ownerFirstName", e.target.value)} />
              </F>
              <F label="Owner last name *">
                <Input required value={form.ownerLastName} onChange={(e) => set("ownerLastName", e.target.value)} />
              </F>
              <F label="Phone *">
                <Input required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </F>
              <F label="Email *">
                <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </F>
              <F label="Password * (min. 8 characters)">
                <Input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
              </F>
            </div>
          </Section>

          <Section title="Licensing">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="USDOT number">
                <Input value={form.dotNumber} onChange={(e) => set("dotNumber", e.target.value)} />
              </F>
              <F label="MC number">
                <Input value={form.mcNumber} onChange={(e) => set("mcNumber", e.target.value)} />
              </F>
              <F label="Insurance carrier">
                <Input value={form.insuranceCarrier} onChange={(e) => set("insuranceCarrier", e.target.value)} />
              </F>
              <F label="Insurance policy number">
                <Input value={form.insurancePolicy} onChange={(e) => set("insurancePolicy", e.target.value)} />
              </F>
              <F label="Insurance expiry">
                <Input type="date" value={form.insuranceExpires} onChange={(e) => set("insuranceExpires", e.target.value)} />
              </F>
            </div>
          </Section>

          <Section title="Business address">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Street address">
                <Input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
              </F>
              <F label="City">
                <Input value={form.addressCity} onChange={(e) => set("addressCity", e.target.value)} />
              </F>
              <F label="State">
                <Input maxLength={2} value={form.addressState} onChange={(e) => set("addressState", e.target.value)} placeholder="CA" />
              </F>
              <F label="ZIP code">
                <Input value={form.addressZip} onChange={(e) => set("addressZip", e.target.value)} />
              </F>
            </div>
          </Section>

          <Section title="Operations">
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Fleet size (trucks)">
                <Input type="number" min="0" value={form.fleetSize} onChange={(e) => set("fleetSize", e.target.value)} />
              </F>
              <F label="Number of movers">
                <Input type="number" min="0" value={form.moversCount} onChange={(e) => set("moversCount", e.target.value)} />
              </F>
            </div>
            <div className="mt-4 grid gap-4">
              <F label="States served (comma separated, e.g. CA, NV, AZ)">
                <Input value={form.serviceStates} onChange={(e) => set("serviceStates", e.target.value)} />
              </F>
              <F label="Cities served (comma separated)">
                <Textarea rows={2} value={form.serviceCities} onChange={(e) => set("serviceCities", e.target.value)} />
              </F>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Services offered
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICES.map((s) => {
                    const on = services.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setServices((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {on && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Documents">
            <p className="-mt-2 mb-3 text-sm text-muted-foreground">
              Upload PDFs or images. You can also add these later from your portal.
            </p>
            <div className="grid gap-3">
              {DOC_SLOTS.map((slot) => (
                <label
                  key={slot.key}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm hover:border-primary/50"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    {slot.label}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {fileNames[slot.key] || "Choose file"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => pickFile(slot, e.target.files?.[0] ?? null)}
                  />
                </label>
              ))}
            </div>
          </Section>

          <Button type="submit" disabled={busy} size="lg">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busy ? "Submitting application…" : "Submit application"}
          </Button>
        </form>
      </section>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-serif text-xl font-medium">{title}</h2>
      {children}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
