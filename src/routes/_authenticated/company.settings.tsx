import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyHeader, NoCompanyScreen, useMoverPortal } from "@/components/company/portal-shared";
import { SkeletonRows } from "@/components/shell/Chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Building2,
  MapPin,
  Clock,
  Truck,
  Users,
  Bell,
  Plus,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/company/settings")({
  head: () => ({ meta: [{ title: "Settings — Company Portal" }] }),
  component: SettingsPage,
});

type Settings = {
  notifications: {
    newLead: boolean;
    slaWarning: boolean;
    leadWon: boolean;
    brokerMessage: boolean;
    invoicePaid: boolean;
  };
  businessHours: { start: string; end: string; days: string[] };
  workingRadiusMiles: number | null;
  autoQuote: boolean;
};

const DEFAULTS: Settings = {
  notifications: {
    newLead: true,
    slaWarning: true,
    leadWon: true,
    brokerMessage: true,
    invoicePaid: true,
  },
  businessHours: { start: "08:00", end: "18:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  workingRadiusMiles: 100,
  autoQuote: false,
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Area = { id: string; kind: string; value: string; radius_miles: number | null };
type TruckRow = {
  id: string;
  name: string;
  plate: string | null;
  capacity_cuft: number | null;
  capacity_lbs: number | null;
  status: string;
};
type Crew = {
  id: string;
  name: string;
  size: number;
  lead_name: string | null;
  phone: string | null;
  status: string;
};

function SettingsPage() {
  const { loading, company, reload } = useMoverPortal();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [biz, setBiz] = useState({
    name: "",
    dot_number: "",
    mc_number: "",
    phone: "",
    email: "",
    insurance_policy: "",
    license_status: "",
  });
  const [areas, setAreas] = useState<Area[]>([]);
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [newArea, setNewArea] = useState({ kind: "city", value: "", radius: "" });
  const [newTruck, setNewTruck] = useState({
    name: "",
    plate: "",
    capacity_cuft: "",
    capacity_lbs: "",
  });
  const [newCrew, setNewCrew] = useState({ name: "", size: "2", lead_name: "", phone: "" });

  useEffect(() => {
    if (!company) return;
    const cur = (company.settings ?? {}) as Partial<Settings>;
    setS({
      notifications: { ...DEFAULTS.notifications, ...(cur.notifications ?? {}) },
      businessHours: { ...DEFAULTS.businessHours, ...(cur.businessHours ?? {}) },
      workingRadiusMiles: cur.workingRadiusMiles ?? DEFAULTS.workingRadiusMiles,
      autoQuote: cur.autoQuote ?? DEFAULTS.autoQuote,
    });
    setBiz({
      name: company.name ?? "",
      dot_number: company.dot_number ?? "",
      mc_number: company.mc_number ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      insurance_policy: "",
      license_status: company.license_status ?? "",
    });
  }, [company]);

  const loadOps = useCallback(async () => {
    if (!company) return;
    const [{ data: a }, { data: t }, { data: c }] = await Promise.all([
      supabase
        .from("company_service_areas")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at"),
      supabase.from("company_trucks").select("*").eq("company_id", company.id).order("created_at"),
      supabase.from("company_crews").select("*").eq("company_id", company.id).order("created_at"),
    ]);
    setAreas((a as Area[] | null) ?? []);
    setTrucks((t as TruckRow[] | null) ?? []);
    setCrews((c as Crew[] | null) ?? []);
  }, [company]);
  useEffect(() => {
    void loadOps();
  }, [loadOps]);

  async function savePrefs() {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("moving_companies")
      .update({
        settings: s,
        name: biz.name,
        dot_number: biz.dot_number || null,
        mc_number: biz.mc_number || null,
        phone: biz.phone || null,
        email: biz.email || null,
        license_status: biz.license_status || "unknown",
      })
      .eq("id", company.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Settings saved");
      reload();
    }
  }

  async function addArea() {
    if (!company || !newArea.value.trim()) return;
    const { error } = await supabase.from("company_service_areas").insert({
      company_id: company.id,
      kind: newArea.kind as "city",
      value: newArea.value.trim(),
      radius_miles: newArea.radius ? Number(newArea.radius) : null,
    });
    if (error) toast.error(error.message);
    else {
      setNewArea({ kind: "city", value: "", radius: "" });
      void loadOps();
    }
  }
  async function delArea(id: string) {
    await supabase.from("company_service_areas").delete().eq("id", id);
    void loadOps();
  }

  async function addTruck() {
    if (!company || !newTruck.name.trim()) return;
    await supabase.from("company_trucks").insert({
      company_id: company.id,
      name: newTruck.name.trim(),
      plate: newTruck.plate || null,
      capacity_cuft: newTruck.capacity_cuft ? Number(newTruck.capacity_cuft) : null,
      capacity_lbs: newTruck.capacity_lbs ? Number(newTruck.capacity_lbs) : null,
    });
    setNewTruck({ name: "", plate: "", capacity_cuft: "", capacity_lbs: "" });
    void loadOps();
  }
  async function delTruck(id: string) {
    await supabase.from("company_trucks").delete().eq("id", id);
    void loadOps();
  }

  async function addCrew() {
    if (!company || !newCrew.name.trim()) return;
    await supabase.from("company_crews").insert({
      company_id: company.id,
      name: newCrew.name.trim(),
      size: Number(newCrew.size) || 2,
      lead_name: newCrew.lead_name || null,
      phone: newCrew.phone || null,
    });
    setNewCrew({ name: "", size: "2", lead_name: "", phone: "" });
    void loadOps();
  }
  async function delCrew(id: string) {
    await supabase.from("company_crews").delete().eq("id", id);
    void loadOps();
  }

  if (loading && !company) return <SkeletonRows n={4} />;
  if (!company) return <NoCompanyScreen />;

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} onRefresh={reload} />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Business info */}
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Business info</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company name">
              <Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
            </Field>
            <Field label="License status">
              <Input
                value={biz.license_status}
                onChange={(e) => setBiz({ ...biz, license_status: e.target.value })}
                placeholder="active"
              />
            </Field>
            <Field label="USDOT #">
              <Input
                value={biz.dot_number}
                onChange={(e) => setBiz({ ...biz, dot_number: e.target.value })}
              />
            </Field>
            <Field label="MC #">
              <Input
                value={biz.mc_number}
                onChange={(e) => setBiz({ ...biz, mc_number: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={biz.phone}
                onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={biz.email}
                onChange={(e) => setBiz({ ...biz, email: e.target.value })}
              />
            </Field>
          </div>
        </div>

        {/* Preferences */}
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Preferences</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Working radius (miles)">
              <Input
                type="number"
                min={0}
                max={5000}
                value={s.workingRadiusMiles ?? ""}
                onChange={(e) =>
                  setS({ ...s, workingRadiusMiles: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <label className="flex items-center justify-between rounded-lg border border-border p-3 sm:mt-6">
              <span className="text-sm">Auto-quote inbound leads</span>
              <Switch checked={s.autoQuote} onCheckedChange={(v) => setS({ ...s, autoQuote: v })} />
            </label>
          </div>
        </div>

        {/* Working hours */}
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Working hours</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input
                type="time"
                value={s.businessHours.start}
                onChange={(e) =>
                  setS({ ...s, businessHours: { ...s.businessHours, start: e.target.value } })
                }
              />
            </Field>
            <Field label="End">
              <Input
                type="time"
                value={s.businessHours.end}
                onChange={(e) =>
                  setS({ ...s, businessHours: { ...s.businessHours, end: e.target.value } })
                }
              />
            </Field>
          </div>
          <div>
            <Label className="text-xs">Working days</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ALL_DAYS.map((d) => {
                const on = s.businessHours.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setS({
                        ...s,
                        businessHours: {
                          ...s.businessHours,
                          days: on
                            ? s.businessHours.days.filter((x) => x !== d)
                            : [...s.businessHours.days, d],
                        },
                      })
                    }
                    className={`px-3 py-1.5 text-xs rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border"}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-premium p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-xl">Notification preferences</h2>
          </div>
          {(
            [
              ["newLead", "New lead assigned"],
              ["slaWarning", "SLA warnings (before expiry)"],
              ["leadWon", "Lead accepted / won"],
              ["brokerMessage", "Broker messages"],
              ["invoicePaid", "Invoice paid"],
            ] as const
          ).map(([k, label]) => (
            <label
              key={k}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <span className="text-sm">{label}</span>
              <Switch
                checked={s.notifications[k]}
                onCheckedChange={(v) =>
                  setS({ ...s, notifications: { ...s.notifications, [k]: v } })
                }
              />
            </label>
          ))}
        </div>
      </div>

      {/* Service areas */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Service areas</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_140px_auto] gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={newArea.kind}
            onChange={(e) => setNewArea({ ...newArea, kind: e.target.value })}
          >
            <option value="city">City</option>
            <option value="zip">ZIP</option>
            <option value="state">State</option>
            <option value="radius">Radius center</option>
          </select>
          <Input
            placeholder={newArea.kind === "state" ? "e.g. CA" : "e.g. Los Angeles / 90210"}
            value={newArea.value}
            onChange={(e) => setNewArea({ ...newArea, value: e.target.value })}
          />
          <Input
            placeholder="Radius mi (optional)"
            type="number"
            value={newArea.radius}
            onChange={(e) => setNewArea({ ...newArea, radius: e.target.value })}
          />
          <Button onClick={() => void addArea()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <Badge key={a.id} variant="outline" className="text-sm py-1 pr-1 pl-3 gap-2">
              <span className="capitalize text-muted-foreground mr-1">{a.kind}:</span>
              {a.value}
              {a.radius_miles ? ` (${a.radius_miles}mi)` : ""}
              <button
                onClick={() => void delArea(a.id)}
                className="ml-1 rounded p-0.5 hover:bg-muted"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {areas.length === 0 && (
            <span className="text-sm text-muted-foreground">No service areas configured.</span>
          )}
        </div>
      </div>

      {/* Fleet */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Fleet</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input
            placeholder="Truck name"
            value={newTruck.name}
            onChange={(e) => setNewTruck({ ...newTruck, name: e.target.value })}
          />
          <Input
            placeholder="Plate"
            value={newTruck.plate}
            onChange={(e) => setNewTruck({ ...newTruck, plate: e.target.value })}
          />
          <Input
            placeholder="Capacity (cu ft)"
            type="number"
            value={newTruck.capacity_cuft}
            onChange={(e) => setNewTruck({ ...newTruck, capacity_cuft: e.target.value })}
          />
          <Input
            placeholder="Capacity (lbs)"
            type="number"
            value={newTruck.capacity_lbs}
            onChange={(e) => setNewTruck({ ...newTruck, capacity_lbs: e.target.value })}
          />
          <Button onClick={() => void addTruck()}>
            <Plus className="h-4 w-4 mr-1" />
            Add truck
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {trucks.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border p-3 flex items-start justify-between gap-2"
            >
              <div>
                <div className="font-medium">
                  {t.name} <span className="text-xs text-muted-foreground">{t.plate ?? ""}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.capacity_cuft ?? "?"} cu ft · {t.capacity_lbs ?? "?"} lbs
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void delTruck(t.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {trucks.length === 0 && (
            <span className="text-sm text-muted-foreground">No trucks yet.</span>
          )}
        </div>
      </div>

      {/* Crews */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-xl">Crews</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input
            placeholder="Crew name"
            value={newCrew.name}
            onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
          />
          <Input
            placeholder="Size"
            type="number"
            value={newCrew.size}
            onChange={(e) => setNewCrew({ ...newCrew, size: e.target.value })}
          />
          <Input
            placeholder="Lead name"
            value={newCrew.lead_name}
            onChange={(e) => setNewCrew({ ...newCrew, lead_name: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={newCrew.phone}
            onChange={(e) => setNewCrew({ ...newCrew, phone: e.target.value })}
          />
          <Button onClick={() => void addCrew()}>
            <Plus className="h-4 w-4 mr-1" />
            Add crew
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {crews.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border p-3 flex items-start justify-between gap-2"
            >
              <div>
                <div className="font-medium">
                  {c.name} <span className="text-xs text-muted-foreground">· {c.size} people</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.lead_name ?? "—"} {c.phone ? `· ${c.phone}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void delCrew(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {crews.length === 0 && (
            <span className="text-sm text-muted-foreground">No crews yet.</span>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 z-10">
        <div className="card-premium p-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Business info, preferences, hours, and notifications
          </div>
          <Button onClick={() => void savePrefs()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
