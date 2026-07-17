import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  ArrowRight,
  Sparkles,
  Check,
  Minus,
  Plus,
  Truck,
  Package,
  Shield,
  Clock,
  Calendar as CalendarIcon,
  Home,
  Building2,
  Warehouse,
  BedDouble,
  ChevronDown,
} from "lucide-react";
import {
  computeQuote,
  type InsuranceTier,
  type MoveType,
  type QuoteResult,
} from "@/lib/pricing-engine";
import {
  INVENTORY_CATALOG,
  CATEGORY_LABEL,
  MOVE_SIZE_LABEL,
  MOVE_SIZE_PRESETS,
  type InventoryCounts,
  type MoveSize,
  type InventoryItem,
} from "@/lib/inventory";
import type { ParkingDifficulty } from "@/lib/pricing-engine";
import { computeDistance } from "@/lib/distance";
import { isValidZip, resolveZip, type ZipLocation } from "@/lib/zip-database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------- Types & defaults -------------------------------------------------

interface FormState {
  originZip: string;
  destinationZip: string;
  originAddress: string;
  destinationAddress: string;
  moveSize: MoveSize;
  inventory: InventoryCounts;
  // Access per side
  originStairs: number;
  destinationStairs: number;
  originElevator: boolean;
  destinationElevator: boolean;
  originLongCarry: boolean;
  destinationLongCarry: boolean;
  originParking: ParkingDifficulty;
  destinationParking: ParkingDifficulty;
  // Services
  packing: boolean;
  unpacking: boolean;
  storage: boolean;
  junkRemoval: boolean;
  assembly: boolean;
  // Specialty
  piano: boolean;
  safe: boolean;
  gymEquipment: boolean;
  appliances: boolean;
  fragileItems: boolean;
  // Coverage & timing
  insurance: InsuranceTier;
  moveDate: string;
  preferredTime: "morning" | "midday" | "afternoon" | "flexible";
  flexibleDate: boolean;
  // Contact
  email: string;
  phone: string;
  notes: string;
}

const DEFAULT: FormState = {
  originZip: "",
  destinationZip: "",
  originAddress: "",
  destinationAddress: "",
  moveSize: "2br",
  inventory: {},
  originStairs: 0,
  destinationStairs: 0,
  originElevator: false,
  destinationElevator: false,
  originLongCarry: false,
  destinationLongCarry: false,
  originParking: "easy",
  destinationParking: "easy",
  packing: false,
  unpacking: false,
  storage: false,
  junkRemoval: false,
  assembly: false,
  piano: false,
  safe: false,
  gymEquipment: false,
  appliances: false,
  fragileItems: false,
  insurance: "basic",
  moveDate: "",
  preferredTime: "flexible",
  flexibleDate: false,
  email: "",
  phone: "",
  notes: "",
};

const MOVE_SIZES: { value: MoveSize; label: string; Icon: typeof Home }[] = [
  { value: "studio", label: MOVE_SIZE_LABEL.studio, Icon: Warehouse },
  { value: "1br", label: MOVE_SIZE_LABEL["1br"], Icon: BedDouble },
  { value: "2br", label: MOVE_SIZE_LABEL["2br"], Icon: Building2 },
  { value: "3br", label: MOVE_SIZE_LABEL["3br"], Icon: Home },
  { value: "4br", label: MOVE_SIZE_LABEL["4br"], Icon: Home },
  { value: "5br", label: MOVE_SIZE_LABEL["5br"], Icon: Home },
];

// ---------- Component --------------------------------------------------------

export function QuoteCalculator({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [originLoc, setOriginLoc] = useState<ZipLocation | null>(null);
  const [destLoc, setDestLoc] = useState<FromMaybeNull>(null);
  const [distance, setDistance] = useState<{ miles: number; type: MoveType } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Resolve ZIPs (async — swap for Google Maps later)
  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.originZip)) {
      resolveZip(form.originZip).then((r) => !cancelled && setOriginLoc(r));
    } else setOriginLoc(null);
    return () => {
      cancelled = true;
    };
  }, [form.originZip]);

  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.destinationZip)) {
      resolveZip(form.destinationZip).then((r) => !cancelled && setDestLoc(r));
    } else setDestLoc(null);
    return () => {
      cancelled = true;
    };
  }, [form.destinationZip]);

  // Compute distance whenever both ZIPs resolved
  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.originZip) && isValidZip(form.destinationZip)) {
      computeDistance(form.originZip, form.destinationZip).then((r) => {
        if (cancelled || !r) return;
        const sameState = r.origin.state === r.destination.state;
        setDistance({ miles: r.miles, type: sameState ? "local" : "interstate" });
      });
    } else {
      setDistance(null);
    }
    return () => {
      cancelled = true;
    };
  }, [form.originZip, form.destinationZip]);

  const canEstimate = Boolean(distance);

  const quote: QuoteResult | null = useMemo(() => {
    if (!distance) return null;
    return computeQuote({
      originZip: form.originZip,
      destinationZip: form.destinationZip,
      originAddress: form.originAddress,
      destinationAddress: form.destinationAddress,
      distanceMiles: distance.miles,
      moveType: distance.type,
      inventory: form.inventory,
      originFloor: form.originStairs,
      destinationFloor: form.destinationStairs,
      originElevator: form.originElevator,
      destinationElevator: form.destinationElevator,
      originLongCarry: form.originLongCarry,
      destinationLongCarry: form.destinationLongCarry,
      originParking: form.originParking,
      destinationParking: form.destinationParking,
      packing: form.packing,
      unpacking: form.unpacking,
      storage: form.storage,
      junkRemoval: form.junkRemoval,
      assembly: form.assembly,
      piano: form.piano,
      safe: form.safe,
      gymEquipment: form.gymEquipment,
      appliances: form.appliances,
      fragileItems: form.fragileItems,
      insurance: form.insurance,
      moveDate: form.moveDate,
      preferredTime: form.preferredTime,
      flexibleDate: form.flexibleDate,
    });
  }, [form, distance]);

  async function saveQuote() {
    if (!quote || !distance) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;
      const inventoryArray = Object.entries(form.inventory)
        .filter(([, n]) => n > 0)
        .map(([id, quantity]) => ({ id, quantity }));

      const { error } = await supabase.from("quotes").insert({
        user_id: userId,
        origin_zip: form.originZip,
        destination_zip: form.destinationZip,
        origin_address: form.originAddress || null,
        destination_address: form.destinationAddress || null,
        origin_city: originLoc?.city ?? null,
        destination_city: destLoc?.city ?? null,
        origin_state: originLoc?.state ?? null,
        destination_state: destLoc?.state ?? null,
        distance_miles: distance.miles,
        move_type: distance.type,
        move_size: form.moveSize,
        // legacy fields kept for backwards compatibility
        property_type: form.moveSize === "studio" ? "studio" : "apartment",
        bedrooms: form.moveSize === "studio" ? 0 : Number(form.moveSize.replace("br", "")) || 1,
        floor: Math.max(form.originStairs, form.destinationStairs) + 1,
        elevator: form.originElevator || form.destinationElevator,
        packing: form.packing,
        storage: form.storage,
        assembly: form.assembly,
        heavy_items: form.piano || form.safe || form.gymEquipment,
        long_carry: form.originLongCarry || form.destinationLongCarry,
        // new fields
        unpacking: form.unpacking,
        junk_removal: form.junkRemoval,
        piano: form.piano,
        safe: form.safe,
        gym_equipment: form.gymEquipment,
        appliances: form.appliances,
        fragile_items: form.fragileItems,
        insurance_tier: form.insurance,
        origin_stairs: form.originStairs,
        destination_stairs: form.destinationStairs,
        origin_elevator: form.originElevator,
        destination_elevator: form.destinationElevator,
        origin_long_carry: form.originLongCarry,
        destination_long_carry: form.destinationLongCarry,
        preferred_time: form.preferredTime,
        flexible_date: form.flexibleDate,
        move_date: form.moveDate || null,
        inventory_notes: form.notes || null,
        inventory: inventoryArray as unknown as never,
        breakdown: quote.breakdown as unknown as never,
        estimated_cubic_feet: quote.cubicFeet,
        estimated_weight_lbs: quote.weightLbs,
        truck_size: quote.truckSize,
        num_movers: quote.numMovers,
        labor_hours: quote.laborHours,
        estimated_low: quote.low,
        estimated_high: quote.high,
        contact_email: form.email || null,
        contact_phone: form.phone || null,
        details: { preferredTime: form.preferredTime, provider: "haversine-v1" } as unknown as never,
      });
      if (error) throw error;
      toast.success("Quote saved. A moving specialist will follow up shortly.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save quote");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Render ---------------------------------------------------------

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[0_30px_80px_-40px_rgba(20,40,25,0.35)] ring-1 ring-black/5">
      <PriceHeader quote={quote} distance={distance} moveSize={form.moveSize} />

      <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2">
        {/* Route ------------------------------------------------------------ */}
        <SectionCard step="01" label="Route">
          <div className="grid gap-3">
            <ZipInput
              placeholder="Origin ZIP"
              value={form.originZip}
              onChange={(v) => set("originZip", v)}
              loc={originLoc}
            />
            <Input
              placeholder="Origin street address (optional)"
              value={form.originAddress}
              onChange={(e) => set("originAddress", e.target.value.slice(0, 200))}
            />
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <ZipInput
              placeholder="Destination ZIP"
              value={form.destinationZip}
              onChange={(v) => set("destinationZip", v)}
              loc={destLoc}
            />
            <Input
              placeholder="Destination street address (optional)"
              value={form.destinationAddress}
              onChange={(e) => set("destinationAddress", e.target.value.slice(0, 200))}
            />
            {distance && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5 text-sage" />
                <span className="font-medium text-foreground">{distance.miles} mi</span>
                <span>·</span>
                <span className="capitalize">{distance.type} move</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Move size -------------------------------------------------------- */}
        <SectionCard step="02" label="Move size">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MOVE_SIZES.map(({ value, label, Icon }) => {
              const active = form.moveSize === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("moveSize", value)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs font-medium">{label}</div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Inventory builder ----------------------------------------------- */}
        <SectionCard step="03" label="Inventory (optional but recommended)" className="md:col-span-2">
          <InventoryBuilder
            counts={form.inventory}
            onChange={(inv) => set("inventory", inv)}
            cubicFeet={quote?.cubicFeet ?? 0}
            weightLbs={quote?.weightLbs ?? 0}
            truckSize={quote?.truckSize ?? "—"}
          />
        </SectionCard>

        {/* Access — origin -------------------------------------------------- */}
        <SectionCard step="04" label="Origin access">
          <AccessGroup
            stairs={form.originStairs}
            elevator={form.originElevator}
            longCarry={form.originLongCarry}
            onStairs={(n) => set("originStairs", n)}
            onElevator={(v) => set("originElevator", v)}
            onLongCarry={(v) => set("originLongCarry", v)}
          />
        </SectionCard>

        {/* Access — destination -------------------------------------------- */}
        <SectionCard step="05" label="Destination access">
          <AccessGroup
            stairs={form.destinationStairs}
            elevator={form.destinationElevator}
            longCarry={form.destinationLongCarry}
            onStairs={(n) => set("destinationStairs", n)}
            onElevator={(v) => set("destinationElevator", v)}
            onLongCarry={(v) => set("destinationLongCarry", v)}
          />
        </SectionCard>

        {/* Services --------------------------------------------------------- */}
        <SectionCard step="06" label="Services & add-ons" className="md:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ToggleCard label="Packing" desc="Full-service packing" active={form.packing} onClick={() => set("packing", !form.packing)} />
            <ToggleCard label="Unpacking" desc="Unpack at destination" active={form.unpacking} onClick={() => set("unpacking", !form.unpacking)} />
            <ToggleCard label="Furniture assembly" desc="Disassemble & reassemble" active={form.assembly} onClick={() => set("assembly", !form.assembly)} />
            <ToggleCard label="Storage" desc="30-day secure storage" active={form.storage} onClick={() => set("storage", !form.storage)} />
            <ToggleCard label="Junk removal" desc="Haul away unwanted items" active={form.junkRemoval} onClick={() => set("junkRemoval", !form.junkRemoval)} />
            <ToggleCard label="Appliances" desc="Disconnect & reconnect" active={form.appliances} onClick={() => set("appliances", !form.appliances)} />
          </div>
        </SectionCard>

        {/* Specialty items -------------------------------------------------- */}
        <SectionCard step="07" label="Specialty items" className="md:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ToggleCard label="Piano" desc="Upright or grand" active={form.piano} onClick={() => set("piano", !form.piano)} />
            <ToggleCard label="Safe" desc="Gun safe or vault" active={form.safe} onClick={() => set("safe", !form.safe)} />
            <ToggleCard label="Gym equipment" desc="Treadmill, rack, etc." active={form.gymEquipment} onClick={() => set("gymEquipment", !form.gymEquipment)} />
            <ToggleCard label="Fragile items" desc="Art, antiques, glass" active={form.fragileItems} onClick={() => set("fragileItems", !form.fragileItems)} />
          </div>
        </SectionCard>

        {/* Insurance -------------------------------------------------------- */}
        <SectionCard step="08" label="Insurance coverage">
          <div className="grid gap-2">
            {(
              [
                { v: "basic", t: "Basic (included)", d: "$0.60 per lb liability" },
                { v: "standard", t: "Standard", d: "Full replacement to declared value" },
                { v: "full", t: "Full value protection", d: "Repair, replace or reimburse" },
              ] as { v: InsuranceTier; t: string; d: string }[]
            ).map(({ v, t, d }) => {
              const active = form.insurance === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("insurance", v)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t}</div>
                    <div className="text-[11px] text-muted-foreground">{d}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Timing ----------------------------------------------------------- */}
        <SectionCard step="09" label="When are you moving?">
          <div className="grid gap-2">
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="date" value={form.moveDate} onChange={(e) => set("moveDate", e.target.value)} className="pl-9" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(["morning", "midday", "afternoon", "flexible"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("preferredTime", t)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-all",
                    form.preferredTime === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Clock className="mr-1 inline h-3 w-3" />
                  {t}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-sm border",
                  form.flexibleDate ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {form.flexibleDate && <Check className="h-3 w-3" />}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={form.flexibleDate}
                onChange={(e) => set("flexibleDate", e.target.checked)}
              />
              My date is flexible (±3 days for a better rate)
            </label>
          </div>
        </SectionCard>

        {!compact && (
          <>
            <SectionCard step="10" label="Contact" className="md:col-span-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
                <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
              </div>
            </SectionCard>
            <SectionCard step="11" label="Notes (optional)" className="md:col-span-2">
              <Textarea
                placeholder="Anything special about your items or building access?"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value.slice(0, 1000))}
                rows={3}
              />
            </SectionCard>
          </>
        )}
      </div>

      {/* Itemized breakdown + CTA */}
      {quote && (
        <div className="border-t border-border bg-muted/40 px-5 py-5 sm:px-8 sm:py-6">
          {!compact && <ItemizedBreakdown quote={quote} />}
          <div className="mt-5 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs text-muted-foreground">
              Live estimate powered by our logistics engine. Final price locks in after a vetted mover reviews your inventory.
            </p>
            {!compact ? (
              <Button onClick={saveQuote} disabled={!canEstimate || saving} size="lg" className="rounded-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & request booking
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Open the full calculator to book</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type FromMaybeNull = ZipLocation | null;

// ---------- Sub-components ---------------------------------------------------

function PriceHeader({
  quote,
  distance,
  moveSize,
}: {
  quote: QuoteResult | null;
  distance: { miles: number; type: MoveType } | null;
  moveSize: MoveSize;
}) {
  return (
    <div className="relative overflow-hidden bg-primary px-6 py-6 text-primary-foreground sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ochre/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-ochre/10 blur-3xl" aria-hidden />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">
            <Sparkles className="h-3 w-3 text-ochre" /> Live estimate
          </span>
          <h3 className="mt-3 font-serif text-xl font-medium sm:text-2xl">Instant Moving Quote</h3>
          <p className="mt-1 text-xs opacity-70 sm:text-sm">
            {distance
              ? `${distance.miles} mi ${distance.type} · ${MOVE_SIZE_LABEL[moveSize]}${quote ? ` · ${quote.numMovers} movers · ${quote.truckSize}` : ""}`
              : "Enter ZIPs to see your live price"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest opacity-60">Estimated range</div>
          <div
            key={quote ? `${quote.low}-${quote.high}` : "empty"}
            className="font-serif text-2xl font-medium tabular-nums animate-fade-up sm:text-4xl"
          >
            {quote ? (
              <>
                ${quote.low.toLocaleString()}
                <span className="mx-1 opacity-40">–</span>${quote.high.toLocaleString()}
              </>
            ) : (
              <span className="opacity-40">$— – $—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  label,
  step,
  children,
  className,
}: {
  label: string;
  step: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2">
        <span className="font-serif text-[11px] italic text-ochre">{step}</span>
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </Label>
      </div>
      {children}
    </div>
  );
}

function ZipInput({
  placeholder,
  value,
  onChange,
  loc,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  loc: ZipLocation | null;
}) {
  const invalid = value.length === 5 && !isValidZip(value);
  return (
    <div>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={5}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className={cn("pl-9 font-mono tracking-wider", invalid && "border-destructive")}
        />
      </div>
      <p className="mt-1 min-h-4 text-xs text-muted-foreground">
        {loc ? (
          <span className="inline-flex items-center gap-1 text-sage">
            <Check className="h-3 w-3" /> {loc.city}, {loc.state}
          </span>
        ) : invalid ? (
          <span className="text-destructive">Enter a valid 5-digit US ZIP</span>
        ) : value.length === 5 ? (
          "Looking up city…"
        ) : (
          ""
        )}
      </p>
    </div>
  );
}

function ToggleCard({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
        active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Package className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function AccessGroup({
  stairs,
  elevator,
  longCarry,
  onStairs,
  onElevator,
  onLongCarry,
}: {
  stairs: number;
  elevator: boolean;
  longCarry: boolean;
  onStairs: (n: number) => void;
  onElevator: (v: boolean) => void;
  onLongCarry: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">Stairs (flights)</div>
          <div className="text-[11px] text-muted-foreground">Excluding ground floor</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStairs(Math.max(0, stairs - 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Decrease stairs"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">{stairs}</span>
          <button
            type="button"
            onClick={() => onStairs(Math.min(20, stairs + 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Increase stairs"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className={cn("grid h-4 w-4 place-items-center rounded-sm border", elevator ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
          {elevator && <Check className="h-3 w-3" />}
        </span>
        <input type="checkbox" className="sr-only" checked={elevator} onChange={(e) => onElevator(e.target.checked)} />
        Elevator available
      </label>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className={cn("grid h-4 w-4 place-items-center rounded-sm border", longCarry ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
          {longCarry && <Check className="h-3 w-3" />}
        </span>
        <input type="checkbox" className="sr-only" checked={longCarry} onChange={(e) => onLongCarry(e.target.checked)} />
        Long carry (over 75 ft from truck)
      </label>
    </div>
  );
}

function InventoryBuilder({
  counts,
  onChange,
  cubicFeet,
  weightLbs,
  truckSize,
}: {
  counts: InventoryCounts;
  onChange: (c: InventoryCounts) => void;
  cubicFeet: number;
  weightLbs: number;
  truckSize: string;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {};
    for (const item of INVENTORY_CATALOG) {
      (map[item.category] ??= []).push(item);
    }
    return map;
  }, []);

  const totalItems = Object.values(counts).reduce((s, n) => s + n, 0);

  const setQty = (id: string, qty: number) => {
    const next = { ...counts };
    if (qty <= 0) delete next[id];
    else next[id] = qty;
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="grid grid-cols-3 gap-2 border-b border-border p-3 text-center sm:grid-cols-4">
        <Stat label="Items" value={totalItems.toString()} />
        <Stat label="Volume" value={`${cubicFeet.toLocaleString()} ft³`} />
        <Stat label="Weight" value={`${weightLbs.toLocaleString()} lb`} />
        <Stat label="Truck" value={truckSize} className="hidden sm:block" />
      </div>
      <Accordion type="multiple" className="w-full">
        {Object.entries(grouped).map(([cat, items]) => {
          const catCount = items.reduce((s, i) => s + (counts[i.id] ?? 0), 0);
          return (
            <AccordionItem key={cat} value={cat} className="border-border">
              <AccordionTrigger className="px-3 py-2.5 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  {CATEGORY_LABEL[cat as InventoryItem["category"]]}
                  {catCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {catCount}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="grid gap-1.5">
                  {items.map((item) => {
                    const qty = counts[item.id] ?? 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.cubicFeet} ft³ · {item.weightLbs} lb
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQty(item.id, qty - 1)}
                            disabled={qty === 0}
                            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground disabled:opacity-40 hover:bg-accent"
                            aria-label={`Decrease ${item.label}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.id, qty + 1)}
                            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
                            aria-label={`Increase ${item.label}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {totalItems === 0 && (
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <ChevronDown className="mr-1 inline h-3 w-3" />
          Expand a category to add items — we'll refine your estimate.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function ItemizedBreakdown({ quote }: { quote: QuoteResult }) {
  const groupOrder: QuoteResult["breakdown"][number]["group"][] = [
    "labor",
    "truck",
    "fuel",
    "access",
    "packing",
    "storage",
    "specialty",
    "insurance",
  ];
  const groupLabel: Record<QuoteResult["breakdown"][number]["group"], string> = {
    labor: "Labor",
    truck: "Truck",
    fuel: "Fuel & mileage",
    packing: "Packing & assembly",
    storage: "Storage",
    insurance: "Insurance",
    specialty: "Specialty items",
    access: "Access surcharges",
    tax: "Taxes",
  };

  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Itemized estimate
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {groupOrder.flatMap((group) => {
          const rows = quote.breakdown.filter((b) => b.group === group);
          if (rows.length === 0) return [];
          return [
            <li key={`h-${group}`} className="bg-muted/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {groupLabel[group]}
            </li>,
            ...rows.map((r) => (
              <li key={`${group}-${r.label}`} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium tabular-nums">${r.amount.toLocaleString()}</span>
              </li>
            )),
          ];
        })}
        <li className="flex items-center justify-between bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">${quote.subtotal.toLocaleString()}</span>
        </li>
        <li className="flex items-center justify-between bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Taxes (7.25%)</span>
          <span className="font-medium tabular-nums">${quote.taxes.toLocaleString()}</span>
        </li>
        <li className="flex items-center justify-between bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-semibold">Total estimate</span>
          <span className="font-serif text-lg font-medium tabular-nums">${quote.total.toLocaleString()}</span>
        </li>
      </ul>
    </div>
  );
}
