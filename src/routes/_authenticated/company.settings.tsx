import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/settings")({
  head: () => ({ meta: [{ title: "Settings — Company Portal" }] }),
  component: SettingsPage,
});

type Settings = {
  notifications: { newLead: boolean; slaWarning: boolean; leadWon: boolean };
  businessHours: { start: string; end: string };
  workingRadiusMiles: number | null;
  autoQuote: boolean;
};

const DEFAULTS: Settings = {
  notifications: { newLead: true, slaWarning: true, leadWon: true },
  businessHours: { start: "08:00", end: "18:00" },
  workingRadiusMiles: 100,
  autoQuote: false,
};

function SettingsPage() {
  const { loading, company, reload } = useMoverPortal();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    const cur = (company.settings ?? {}) as Partial<Settings>;
    setS({
      notifications: { ...DEFAULTS.notifications, ...(cur.notifications ?? {}) },
      businessHours: { ...DEFAULTS.businessHours, ...(cur.businessHours ?? {}) },
      workingRadiusMiles: cur.workingRadiusMiles ?? DEFAULTS.workingRadiusMiles,
      autoQuote: cur.autoQuote ?? DEFAULTS.autoQuote,
    });
  }, [company]);

  async function save() {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase.from("moving_companies").update({ settings: s }).eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Settings saved"); reload(); }
  }

  if (loading && !company) return <SkeletonRows rows={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="card-premium p-5 md:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Preferences</h2>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h3>
          {([
            ["newLead", "New lead assigned"],
            ["slaWarning", "SLA warnings (before expiry)"],
            ["leadWon", "Lead accepted / won"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{label}</span>
              <Switch
                checked={s.notifications[k]}
                onCheckedChange={(v) => setS((x) => ({ ...x, notifications: { ...x.notifications, [k]: v } }))}
              />
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Business hours</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="time" value={s.businessHours.start}
                onChange={(e) => setS((x) => ({ ...x, businessHours: { ...x.businessHours, start: e.target.value } }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="time" value={s.businessHours.end}
                onChange={(e) => setS((x) => ({ ...x, businessHours: { ...x.businessHours, end: e.target.value } }))} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="radius">Working radius (miles)</Label>
            <Input id="radius" type="number" min={0} max={5000} value={s.workingRadiusMiles ?? ""}
              onChange={(e) => setS((x) => ({ ...x, workingRadiusMiles: e.target.value === "" ? null : Number(e.target.value) }))} />
          </div>
          <label className="flex items-center justify-between rounded-lg border border-border p-3 sm:mt-6">
            <span className="text-sm">Auto-quote inbound leads</span>
            <Switch checked={s.autoQuote} onCheckedChange={(v) => setS((x) => ({ ...x, autoQuote: v }))} />
          </label>
        </div>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
