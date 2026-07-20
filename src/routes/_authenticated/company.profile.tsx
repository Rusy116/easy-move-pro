import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/profile")({
  head: () => ({ meta: [{ title: "Company Profile — Company Portal" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { loading, company, reload } = useMoverPortal();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dot, setDot] = useState("");
  const [mc, setMc] = useState("");
  const [states, setStates] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setName(company.name ?? "");
    setLogoUrl(company.logo_url ?? "");
    setPhone(company.phone ?? "");
    setEmail(company.email ?? "");
    setDot(company.dot_number ?? "");
    setMc(company.mc_number ?? "");
    setStates((company.service_states ?? []).join(", "));
  }, [company]);

  async function save() {
    if (!company) return;
    setSaving(true);
    const service_states = states.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const { error } = await supabase.from("moving_companies").update({
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      dot_number: dot.trim() || null,
      mc_number: mc.trim() || null,
      service_states,
    }).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); reload(); }
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Company profile</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo">Logo URL</Label>
            <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dot">DOT number</Label>
            <Input id="dot" value={dot} onChange={(e) => setDot(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc">MC number</Label>
            <Input id="mc" value={mc} onChange={(e) => setMc(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="states">Service states (comma-separated codes)</Label>
            <Textarea id="states" n={2} value={states} onChange={(e) => setStates(e.target.value)} placeholder="NY, NJ, CT" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>License status: <b className="text-foreground">{company.license_status}</b></span>
          <span>
            {company.approved === false && "Pending approval · "}
            {company.suspended === true ? "Suspended" : "Active partner"}
          </span>
        </div>

        <Button onClick={() => void save()} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
