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
  Briefcase,
  ChevronDown,
  Info,
  Pencil,
  Phone as PhoneIcon,
  BadgeCheck,
  Lock,
  PartyPopper,
  CheckCircle2,
} from "lucide-react";
import { InsuranceInfoModal } from "./InsuranceInfoModal";
import {
  computeQuote,
  type InsuranceTier,
  type MoveType,
  type QuoteResult,
} from "@/lib/pricing-engine";
import {
  INVENTORY_CATALOG,
  CATEGORY_LABEL,
  type InventoryCounts,
  type InventoryItem,
} from "@/lib/inventory";
import type { ParkingDifficulty } from "@/lib/pricing-engine";
import { computeDistance } from "@/lib/distance";
import { isValidZip, resolveZip, type ZipLocation } from "@/lib/zip-database";
import { lookupZipCities } from "@/lib/zip-cities";
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
import { AddressAutocomplete, type PlaceSelection } from "./AddressAutocomplete";

// ---------- Types & defaults -------------------------------------------------

// Property type is a UI-only helper. It does NOT affect pricing.
// Pricing is derived exclusively from the inventory + logistics factors.
export type PropertyType = "apartment" | "house" | "office" | "storage";

const PROPERTY_TYPES: { value: PropertyType; label: string; Icon: typeof Home }[] = [
  { value: "apartment", label: "Apartment", Icon: Building2 },
  { value: "house", label: "House", Icon: Home },
  { value: "office", label: "Office", Icon: Briefcase },
  { value: "storage", label: "Storage", Icon: Warehouse },
];


interface SideState {
  zip: string;
  city: string;
  state: string;
  street: string;          // route (street name only)
  houseNumber: string;     // separate input
  fullAddress: string;     // formatted (for storage / distance)
  lat: number | null;
  lng: number | null;
  placeId: string;
  floor: number;
  elevator: boolean;
  longCarry: boolean;
  parking: ParkingDifficulty;
}

const EMPTY_SIDE: SideState = {
  zip: "",
  city: "",
  state: "",
  street: "",
  houseNumber: "",
  fullAddress: "",
  lat: null,
  lng: null,
  placeId: "",
  floor: 0,
  elevator: false,
  longCarry: false,
  parking: "easy",
};

interface FormState {
  origin: SideState;
  destination: SideState;
  propertyType: PropertyType;
  inventory: InventoryCounts;
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
  fullName: string;
  email: string;
  phone: string;
  contactMethod: "phone" | "sms" | "email";
  contactTime: "morning" | "midday" | "afternoon" | "evening" | "anytime";
  notes: string;
}

const DEFAULT: FormState = {
  origin: { ...EMPTY_SIDE },
  destination: { ...EMPTY_SIDE },
  propertyType: "apartment",
  inventory: {},
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
  fullName: "",
  email: "",
  phone: "",
  contactMethod: "phone",
  contactTime: "anytime",
  notes: "",
};

function createInitialForm(): FormState {
  return {
    ...DEFAULT,
    origin: { ...EMPTY_SIDE },
    destination: { ...EMPTY_SIDE },
    inventory: {},
  };
}

// Format a US phone number as the user types. Accepts free input, keeps digits,
// and returns "(XXX) XXX-XXXX" (or a partial prefix while typing).
function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function phoneDigits(v: string): string {
  return v.replace(/\D/g, "");
}
function isValidUsPhone(v: string): boolean {
  return phoneDigits(v).length === 10;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

// ---------- Component --------------------------------------------------------

export function QuoteCalculator({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [originLoc, setOriginLoc] = useState<ZipLocation | null>(null);
  const [destLoc, setDestLoc] = useState<FromMaybeNull>(null);
  const [distance, setDistance] = useState<{ miles: number; type: MoveType } | null>(null);
  const [saving, setSaving] = useState(false);
  const [insuranceModal, setInsuranceModal] = useState<InsuranceTier | null>(null);
  const [stage, setStage] = useState<"form" | "submitting" | "done">("form");
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const setSide = (
    which: "origin" | "destination",
    patch: Partial<SideState>
  ) =>
    setForm((s) => ({
      ...s,
      [which]: { ...s[which], ...patch },
    }));

  const setLocationSide = (
    which: "origin" | "destination",
    patch: Partial<SideState>,
    expectedZip?: string
  ) =>
    setForm((s) => {
      const current = s[which];
      if (expectedZip && current.zip !== expectedZip) return s;
      return {
        ...s,
        [which]: { ...current, ...patch },
      };
    });

  // Resolve ZIPs (async — swap for Google Maps later)
  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.origin.zip)) {
      resolveZip(form.origin.zip).then((r) => !cancelled && setOriginLoc(r));
    } else setOriginLoc(null);
    return () => {
      cancelled = true;
    };
  }, [form.origin.zip]);

  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.destination.zip)) {
      resolveZip(form.destination.zip).then((r) => !cancelled && setDestLoc(r));
    } else setDestLoc(null);
    return () => {
      cancelled = true;
    };
  }, [form.destination.zip]);

  // Compute distance whenever both ZIPs resolved. Use lat/lng from Places when available.
  useEffect(() => {
    let cancelled = false;
    if (isValidZip(form.origin.zip) && isValidZip(form.destination.zip)) {
      const oCoords =
        form.origin.lat != null && form.origin.lng != null
          ? { lat: form.origin.lat, lng: form.origin.lng }
          : null;
      const dCoords =
        form.destination.lat != null && form.destination.lng != null
          ? { lat: form.destination.lat, lng: form.destination.lng }
          : null;
      computeDistance(form.origin.zip, form.destination.zip, oCoords, dCoords).then((r) => {
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
  }, [
    form.origin.zip,
    form.destination.zip,
    form.origin.lat,
    form.origin.lng,
    form.destination.lat,
    form.destination.lng,
  ]);

  const canEstimate = Boolean(distance);

  const quote: QuoteResult | null = useMemo(() => {
    if (!distance) return null;
    return computeQuote({
      originZip: form.origin.zip,
      destinationZip: form.destination.zip,
      originAddress: form.origin.fullAddress,
      destinationAddress: form.destination.fullAddress,
      distanceMiles: distance.miles,
      moveType: distance.type,
      inventory: form.inventory,
      originFloor: form.origin.floor,
      destinationFloor: form.destination.floor,
      originElevator: form.origin.elevator,
      destinationElevator: form.destination.elevator,
      originLongCarry: form.origin.longCarry,
      destinationLongCarry: form.destination.longCarry,
      originParking: form.origin.parking,
      destinationParking: form.destination.parking,
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

  function resetCalculatorForm() {
    setForm(createInitialForm());
    setOriginLoc(null);
    setDestLoc(null);
    setDistance(null);
    setInsuranceModal(null);
  }

  async function saveQuote(): Promise<string> {
    if (!quote || !distance) throw new Error("Quote not ready");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id ?? null;
    const inventoryArray = Object.entries(form.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => ({ id, quantity }));

    const o = form.origin;
    const d = form.destination;

    const clientQuoteId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { error } = await supabase.from("quotes").insert({
      id: clientQuoteId,
      user_id: userId,
      origin_zip: o.zip,
      destination_zip: d.zip,
      origin_address: o.fullAddress || null,
      destination_address: d.fullAddress || null,
      origin_lat: o.lat,
      origin_lng: o.lng,
      destination_lat: d.lat,
      destination_lng: d.lng,
      origin_place_id: o.placeId || null,
      destination_place_id: d.placeId || null,
      origin_city: o.city || originLoc?.city || null,
      destination_city: d.city || destLoc?.city || null,
      origin_state: o.state || originLoc?.state || null,
      destination_state: d.state || destLoc?.state || null,
      distance_miles: distance.miles,
      move_type: distance.type,
      move_size: form.propertyType,
      property_type: form.propertyType,
      bedrooms: 0,
      floor: Math.max(o.floor, d.floor) + 1,
      elevator: o.elevator || d.elevator,
      packing: form.packing,
      storage: form.storage,
      assembly: form.assembly,
      heavy_items: form.piano || form.safe || form.gymEquipment,
      long_carry: o.longCarry || d.longCarry,
      unpacking: form.unpacking,
      junk_removal: form.junkRemoval,
      piano: form.piano,
      safe: form.safe,
      gym_equipment: form.gymEquipment,
      appliances: form.appliances,
      fragile_items: form.fragileItems,
      insurance_tier: form.insurance,
      origin_stairs: o.floor,
      destination_stairs: d.floor,
      origin_elevator: o.elevator,
      destination_elevator: d.elevator,
      origin_long_carry: o.longCarry,
      destination_long_carry: d.longCarry,
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
      details: {
        preferredTime: form.preferredTime,
        provider: "haversine-v1",
        clientQuoteId,
        originHouseNumber: o.houseNumber,
        originStreet: o.street,
        destinationHouseNumber: d.houseNumber,
        destinationStreet: d.street,
        fullName: form.fullName,
        contactMethod: form.contactMethod,
        contactTime: form.contactTime,
      } as unknown as never,
    });
    if (error) throw error;
    return clientQuoteId;
  }

  async function handleSubmit() {
    if (saving || stage !== "form") return;
    if (
      !canEstimate ||
      !form.fullName.trim() ||
      !isValidUsPhone(form.phone) ||
      !isValidEmail(form.email)
    ) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitError(null);
    setSaving(true);
    setStage("submitting");
    const start = Date.now();
    try {
      const savedQuoteId = await saveQuote();
      setQuoteId(savedQuoteId);
      resetCalculatorForm();
      toast.success("Your moving quote request was submitted.");
    } catch (e) {
      const message = e instanceof Error && e.message
        ? e.message
        : "We couldn't submit your quote. Please try again.";
      setSubmitError(message);
      setStage("form");
      toast.error(message);
      setSaving(false);
      return;
    }
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 2500 - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    setSaving(false);
    setStage("done");
  }


  // ---------- Render ---------------------------------------------------------

  if (stage === "done") {
    return (
      <ThankYouScreen
        quoteId={quoteId}
        onEdit={() => {
          resetCalculatorForm();
          setQuoteId(null);
          setSubmitError(null);
          setSaving(false);
          setStage("form");
        }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[0_30px_80px_-40px_rgba(20,40,25,0.35)] ring-1 ring-black/5">
      <PriceHeader quote={quote} distance={distance} propertyType={form.propertyType} />

      {stage === "form" && (
      <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-2">
        {/* Origin ----------------------------------------------------------- */}
        <SectionCard step="01" label="Origin">
          <LocationBlock
            side={form.origin}
            onChange={(patch, expectedZip) => setLocationSide("origin", patch, expectedZip)}
            fallbackLoc={originLoc}
          />
        </SectionCard>

        {/* Destination ------------------------------------------------------ */}
        <SectionCard step="02" label="Destination">
          <LocationBlock
            side={form.destination}
            onChange={(patch, expectedZip) => setLocationSide("destination", patch, expectedZip)}
            fallbackLoc={destLoc}
          />
        </SectionCard>

        {distance && (
          <div className="md:col-span-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 text-sage" />
            <span className="font-medium text-foreground">{distance.miles} mi</span>
            <span>·</span>
            <span className="capitalize">{distance.type} move</span>
          </div>
        )}

        {/* Property type --------------------------------------------------- */}
        <SectionCard step="03" label="Property type" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROPERTY_TYPES.map(({ value, label, Icon }) => {
              const active = form.propertyType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("propertyType", value)}
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
        <SectionCard step="04" label="Inventory (optional but recommended)" className="md:col-span-2">
          <InventoryBuilder
            counts={form.inventory}
            onChange={(inv) => set("inventory", inv)}
            cubicFeet={quote?.cubicFeet ?? 0}
            weightLbs={quote?.weightLbs ?? 0}
            truckSize={quote?.truckSize ?? "—"}
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
                <div
                  key={v}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-xl border p-3 transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 animate-scale-in"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => set("insurance", v)}
                    className="flex flex-1 items-start gap-3 text-left"
                    aria-pressed={active}
                  >
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {active ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{t}</div>
                      <div className="text-[11px] text-muted-foreground">{d}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInsuranceModal(v);
                    }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`More details about ${t}`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <InsuranceInfoModal
          tier={insuranceModal}
          open={insuranceModal !== null}
          onOpenChange={(o) => !o && setInsuranceModal(null)}
          onSelect={(t) => set("insurance", t)}
        />


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
              <div className="grid gap-3">
                <div>
                  <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Full name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Jane Doe"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value.slice(0, 100))}
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="(555) 123-4567"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", formatUsPhone(e.target.value))}
                      maxLength={20}
                      className={cn(
                        form.phone && !isValidUsPhone(form.phone) && "border-destructive"
                      )}
                    />
                    {form.phone && !isValidUsPhone(form.phone) && (
                      <p className="mt-1 text-[11px] text-destructive">
                        Please enter a valid US phone number.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Email address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      maxLength={255}
                      className={cn(
                        form.email && !isValidEmail(form.email) && "border-destructive"
                      )}
                    />
                    {form.email && !isValidEmail(form.email) && (
                      <p className="mt-1 text-[11px] text-destructive">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3 text-sage" />
                  Your information is private. We never sell or share your personal information.
                </p>
              </div>
            </SectionCard>

            <SectionCard step="11" label="How would you like us to contact you?" className="md:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: "phone", l: "Phone Call" },
                    { v: "sms", l: "Text (SMS)" },
                    { v: "email", l: "Email" },
                  ] as { v: FormState["contactMethod"]; l: string }[]
                ).map(({ v, l }) => {
                  const active = form.contactMethod === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("contactMethod", v)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard step="12" label="Best time to contact you" className="md:col-span-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    { v: "morning", l: "Morning" },
                    { v: "midday", l: "Midday" },
                    { v: "afternoon", l: "Afternoon" },
                    { v: "evening", l: "Evening" },
                    { v: "anytime", l: "Anytime" },
                  ] as { v: FormState["contactTime"]; l: string }[]
                ).map(({ v, l }) => {
                  const active = form.contactTime === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("contactTime", v)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard step="13" label="Additional information (optional)" className="md:col-span-2">
              <Textarea
                placeholder="Gate code, HOA requirements, fragile items, piano, safe, narrow stairs, parking restrictions, or anything else we should know."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value.slice(0, 1000))}
                rows={3}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
                Examples: Gate code • Fragile items • HOA requirements • Narrow stairs • Parking restrictions • Special instructions
              </p>
            </SectionCard>
          </>
        )}
      </div>
      )}

      {/* Stage: form → trust section + final CTA */}
      {stage === "form" && !compact && (
        <div className="border-t border-border bg-muted/40 px-5 py-6 sm:px-8 sm:py-8">
          {/* Trust section */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-1 text-ochre" aria-label="5 out of 5 stars">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-lg leading-none">{s}</span>
                ))}
              </div>
              <p className="text-sm font-semibold">Trusted by Hundreds of Customers</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {[
                "Free Instant Quote",
                "No Hidden Fees",
                "Licensed & Insured Movers",
                "Response Within 5–15 Minutes",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2"
                >
                  <Check className="h-4 w-4 shrink-0 text-sage" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="h-3 w-3 text-sage" />
              Your information is encrypted and will never be shared with third parties.
            </p>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-3">
            <Button
              onClick={handleSubmit}
              disabled={
                !canEstimate ||
                !form.fullName.trim() ||
                !isValidUsPhone(form.phone) ||
                !isValidEmail(form.email) ||
                saving ||
                stage !== "form"
              }
              size="lg"
              className="w-full rounded-full bg-primary py-6 text-base font-semibold uppercase tracking-wide text-primary-foreground shadow-lg transition-transform hover:scale-[1.01] hover:bg-primary/90 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Get My Free Moving Quote
                </>
              )}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By clicking Get My Free Moving Quote, you agree to our{" "}
              <a href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
                Terms of Service
              </a>
              .
            </p>
            {submitError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm font-medium text-destructive" role="alert">
                {submitError}
              </div>
            )}
          </div>
        </div>
      )}
      {stage === "form" && quote && compact && (
        <div className="border-t border-border bg-muted/40 px-5 py-4 text-xs text-muted-foreground sm:px-8">
          Open the full calculator to book
        </div>
      )}

      {/* Stage: submitting */}
      {stage === "submitting" && <SubmittingScreen />}

    </div>
  );
}

type FromMaybeNull = ZipLocation | null;

// ---------- Sub-components ---------------------------------------------------

function PriceHeader({
  quote,
  distance,
  propertyType,
}: {
  quote: QuoteResult | null;
  distance: { miles: number; type: MoveType } | null;
  propertyType: PropertyType;
}) {
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === propertyType)?.label ?? "";
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
              ? `${distance.miles} mi ${distance.type} · ${propertyLabel}${quote ? ` · ${quote.numMovers} movers · ${quote.truckSize}` : ""}`
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

function LocationBlock({
  side,
  onChange,
  fallbackLoc,
}: {
  side: SideState;
  onChange: (patch: Partial<SideState>, expectedZip?: string) => void;
  fallbackLoc: ZipLocation | null;
}) {
  const [cities, setCities] = useState<string[]>([]);
  const [zipCenter, setZipCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);

  // Look up cities + state from ZIP via Google Geocoder.
  useEffect(() => {
    let cancelled = false;
    const zipAtLookupStart = side.zip;
    if (!isValidZip(zipAtLookupStart)) {
      setCities([]);
      setZipCenter(null);
      return;
    }
    if (fallbackLoc) {
      setCities([fallbackLoc.city]);
      setZipCenter({ lat: fallbackLoc.lat, lng: fallbackLoc.lng });
      const patch: Partial<SideState> = {};
      if (side.state !== fallbackLoc.state) patch.state = fallbackLoc.state;
      if (!side.city) patch.city = fallbackLoc.city;
      if (Object.keys(patch).length) onChange(patch, zipAtLookupStart);
    }
    setLoadingCities(true);
    lookupZipCities(zipAtLookupStart)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          // Fallback to local DB
          setCities(fallbackLoc ? [fallbackLoc.city] : []);
          setZipCenter(fallbackLoc ? { lat: fallbackLoc.lat, lng: fallbackLoc.lng } : null);
          if (fallbackLoc && !side.state) {
            onChange({ state: fallbackLoc.state, city: side.city || fallbackLoc.city }, zipAtLookupStart);
          }
          return;
        }
        setCities(r.cities);
        setZipCenter({ lat: r.lat, lng: r.lng });
        const patch: Partial<SideState> = {};
        if (r.state && side.state !== r.state) patch.state = r.state;
        // Auto-select when only one city
        if (r.cities.length === 1 && side.city !== r.cities[0]) patch.city = r.cities[0];
        // If current city isn't in the list, clear it
        if (side.city && r.cities.length > 0 && !r.cities.includes(side.city)) {
          patch.city = r.cities.length === 1 ? r.cities[0] : "";
        }
        if (Object.keys(patch).length) onChange(patch, zipAtLookupStart);
      })
      .finally(() => !cancelled && setLoadingCities(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side.zip]);

  const invalidZip = side.zip.length === 5 && !isValidZip(side.zip);

  return (
    <div className="grid gap-2.5">
      {/* ZIP */}
      <div>
        <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          ZIP code
        </Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="5-digit ZIP"
            inputMode="numeric"
            maxLength={5}
            value={side.zip}
            onChange={(e) =>
              onChange({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })
            }
            className={cn("pl-9 font-mono tracking-wider", invalidZip && "border-destructive")}
          />
        </div>
      </div>

      {/* City */}
      <div>
        <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          City
        </Label>
        {cities.length > 1 ? (
          <select
            value={side.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select a city…</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <Input
            placeholder={
              loadingCities
                ? "Looking up city…"
                : invalidZip
                ? "Enter a valid ZIP"
                : side.zip.length === 5
                ? "Enter city"
                : "Enter ZIP first"
            }
            value={side.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        )}
      </div>

      {/* Street (Google Places) — enabled only after city is selected */}
      <div>
        <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Street
        </Label>
        <AddressAutocomplete
          placeholder={side.city ? "Start typing street name" : "Select city first"}
          value={side.street}
          onChangeText={(v) => onChange({ street: v })}
          bias={zipCenter}
          disabled={!side.city}
          onSelect={(p: PlaceSelection) => {
            const parts = p.streetAddress.trim().split(/\s+/);
            const first = parts[0] ?? "";
            const hasHouseNum = /^\d/.test(first);
            const houseNumber = hasHouseNum ? first : side.houseNumber;
            const streetName = hasHouseNum ? parts.slice(1).join(" ") : p.streetAddress;
            onChange({
              street: streetName || p.streetAddress || p.formattedAddress,
              houseNumber,
              fullAddress: p.formattedAddress,
              lat: p.lat,
              lng: p.lng,
              placeId: p.placeId,
              zip: p.zip || side.zip,
              city: p.city || side.city,
              state: p.state || side.state,
            });
          }}
        />
      </div>

      {/* House number + State */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            House number
          </Label>
          <Input
            placeholder="e.g. 123"
            value={side.houseNumber}
            onChange={(e) => onChange({ houseNumber: e.target.value.slice(0, 15) })}
          />
        </div>
        <div>
          <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            State
          </Label>
          <Input readOnly value={side.state} placeholder="—" className="bg-muted/40" />
        </div>
      </div>

      {/* Floor */}
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">Floor</div>
          <div className="text-[11px] text-muted-foreground">0 = ground floor</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ floor: Math.max(0, side.floor - 1) })}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Decrease floor"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">
            {side.floor}
          </span>
          <button
            type="button"
            onClick={() => onChange({ floor: Math.min(50, side.floor + 1) })}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Increase floor"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Elevator Yes / No */}
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
        <div className="mb-1.5 font-medium">Elevator</div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map(({ v, l }) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ elevator: v })}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition-all",
                side.elevator === v
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Parking distance */}
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
        <div className="mb-1.5 font-medium">
          How far can the moving truck park from your entrance?
        </div>
        <div className="grid gap-1">
          {(
            [
              { v: "easy", l: "Right at the entrance (0–25 ft)", longCarry: false },
              { v: "moderate", l: "Short walk (25–75 ft)", longCarry: false },
              { v: "difficult", l: "Long walk (75+ ft)", longCarry: true },
            ] as { v: ParkingDifficulty; l: string; longCarry: boolean }[]
          ).map(({ v, l, longCarry }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ parking: v, longCarry })}
              className={cn(
                "rounded-md border px-2 py-1.5 text-xs font-medium text-left transition-all",
                side.parking === v
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          This affects labor time if movers must carry your items a long distance.
        </p>
      </div>
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
  parking,
  onStairs,
  onElevator,
  onLongCarry,
  onParking,
}: {
  stairs: number;
  elevator: boolean;
  longCarry: boolean;
  parking: ParkingDifficulty;
  onStairs: (n: number) => void;
  onElevator: (v: boolean) => void;
  onLongCarry: (v: boolean) => void;
  onParking: (v: ParkingDifficulty) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">Floor</div>
          <div className="text-[11px] text-muted-foreground">0 = ground floor</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStairs(Math.max(0, stairs - 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Decrease floor"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">{stairs}</span>
          <button
            type="button"
            onClick={() => onStairs(Math.min(50, stairs + 1))}
            className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent"
            aria-label="Increase floor"
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
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
        <div className="mb-1.5 font-medium">Parking difficulty</div>
        <div className="grid grid-cols-3 gap-1">
          {(["easy", "moderate", "difficult"] as ParkingDifficulty[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onParking(p)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium capitalize transition-all",
                parking === p
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
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

// ---------- Review & confirmation screens -----------------------------------

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
        <span>{label}</span>
      </div>
      <div className="text-right text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function ReviewScreen({
  form,
  quote,
  distance,
  onEdit,
  onSubmit,
  saving,
}: {
  form: FormState;
  quote: QuoteResult;
  distance: { miles: number; type: MoveType };
  onEdit: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === form.propertyType)?.label ?? "";

  const inventorySummary = Object.entries(form.inventory)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const item = INVENTORY_CATALOG.find((i) => i.id === id);
      return item ? `${item.label} ×${n}` : null;
    })
    .filter(Boolean) as string[];

  const services: string[] = [];
  if (form.packing) services.push("Packing");
  if (form.unpacking) services.push("Unpacking");
  if (form.assembly) services.push("Furniture assembly");
  if (form.storage) services.push("30-day storage");
  if (form.junkRemoval) services.push("Junk removal");
  if (form.appliances) services.push("Appliance disconnect/reconnect");
  if (form.piano) services.push("Piano");
  if (form.safe) services.push("Safe");
  if (form.gymEquipment) services.push("Gym equipment");
  if (form.fragileItems) services.push("Fragile items");

  const insuranceLabel =
    form.insurance === "basic"
      ? "Basic (included)"
      : form.insurance === "standard"
      ? "Standard coverage"
      : "Full value protection";

  function addressLine(s: SideState): string {
    const line1 = [s.houseNumber, s.street].filter(Boolean).join(" ");
    const line2 = [s.city, s.state, s.zip].filter(Boolean).join(", ");
    return [line1, line2].filter(Boolean).join(" · ") || s.fullAddress || "—";
  }

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Almost done
          </span>
          <h3 className="mt-3 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            Review your move
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Double-check everything below. You can edit any section before submitting.
          </p>
        </div>

        {/* Premium estimate card */}
        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-[0_20px_60px_-30px_rgba(20,40,25,0.5)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ochre/30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
              Your estimated moving quote
            </div>
            <div className="mt-2 font-serif text-4xl font-medium tabular-nums sm:text-5xl">
              ${quote.low.toLocaleString()}
              <span className="mx-2 opacity-40">–</span>${quote.high.toLocaleString()}
            </div>
            <div className="mt-1 text-sm opacity-80">
              {distance.miles} mi {distance.type} move · {quote.numMovers} movers · {quote.truckSize}
            </div>

            <div className="mt-5 grid gap-1.5 text-sm sm:grid-cols-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70 sm:col-span-2">
                Included in your estimate
              </div>
              {[
                "Professional movers",
                "Moving truck",
                "Loading & unloading",
                "Fuel",
                "Mileage",
                "Basic moving equipment",
                `${insuranceLabel}`,
              ].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-ochre" /> {s}
                </div>
              ))}
            </div>

            {services.length > 0 && (
              <div className="mt-5 grid gap-1.5 text-sm sm:grid-cols-2">
                <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70 sm:col-span-2">
                  Optional services selected
                </div>
                {services.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-ochre" /> {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trust row */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 text-xs sm:grid-cols-4">
          {[
            { Icon: BadgeCheck, label: "Licensed & insured" },
            { Icon: Check, label: "No hidden fees" },
            { Icon: Truck, label: "Professional movers" },
            { Icon: Lock, label: "Secure online quote" },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <Icon className="h-4 w-4 text-sage" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="grid gap-3">
          <ReviewSection title="Route" onEdit={onEdit}>
            <ReviewRow label="Origin address" value={addressLine(form.origin)} />
            <ReviewRow label="Destination address" value={addressLine(form.destination)} />
            <ReviewRow label="Estimated distance" value={`${distance.miles} mi (${distance.type})`} />
          </ReviewSection>

          <ReviewSection title="Move details" onEdit={onEdit}>
            <ReviewRow label="Move date" value={form.moveDate || "Flexible"} />
            <ReviewRow label="Property type" value={propertyLabel} />
            <ReviewRow label="Estimated move size" value={quote.truckSize} />
            <ReviewRow label="Estimated volume" value={`${quote.cubicFeet.toLocaleString()} ft³`} />
            <ReviewRow label="Estimated weight" value={`${quote.weightLbs.toLocaleString()} lb`} />
          </ReviewSection>

          <ReviewSection title="Inventory" onEdit={onEdit}>
            <ReviewRow
              label="Items"
              value={
                inventorySummary.length > 0
                  ? `${inventorySummary.reduce((s, x) => s + parseInt(x.split("×")[1] || "0", 10), 0)} items`
                  : "No items added"
              }
            />
            {inventorySummary.length > 0 && (
              <div className="pt-2 text-right text-xs text-muted-foreground">
                {inventorySummary.slice(0, 8).join(" · ")}
                {inventorySummary.length > 8 ? ` · +${inventorySummary.length - 8} more` : ""}
              </div>
            )}
          </ReviewSection>

          <ReviewSection title="Services & coverage" onEdit={onEdit}>
            <ReviewRow
              label="Selected services"
              value={services.length ? services.join(", ") : "None"}
            />
            <ReviewRow label="Insurance coverage" value={insuranceLabel} />
          </ReviewSection>

          <ReviewSection title="Contact" onEdit={onEdit}>
            <ReviewRow label="Full name" value={form.fullName} />
            <ReviewRow label="Phone" value={form.phone} />
            <ReviewRow label="Email" value={form.email} />
            {form.notes && <ReviewRow label="Notes" value={form.notes} />}
          </ReviewSection>

          <ReviewSection title="Estimated price" onEdit={onEdit}>
            <ReviewRow
              label="Price range"
              value={`$${quote.low.toLocaleString()} – $${quote.high.toLocaleString()}`}
            />
            <ReviewRow label="Point estimate" value={`$${quote.total.toLocaleString()}`} />
          </ReviewSection>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={onEdit}
            className="rounded-full"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit details
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving}
            size="lg"
            className="rounded-full bg-sage text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] hover:bg-sage/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get My Final Quote
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubmittingScreen() {
  return (
    <div className="border-t border-border bg-muted/30 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-sm text-center animate-fade-up">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h3 className="font-serif text-2xl font-medium tracking-tight">Preparing your quote…</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while our logistics engine calculates your final estimate.
        </p>
      </div>
    </div>
  );
}

function ThankYouScreen({
  quoteId,
  onEdit,
}: {
  quoteId: string | null;
  onEdit: () => void;
}) {
  const shortId = quoteId ? quoteId.slice(0, 8).toUpperCase() : null;
  return (
    <div className="border-t border-border bg-gradient-to-b from-primary/5 to-transparent px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-xl text-center animate-fade-up">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h3 className="mt-5 font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Thank you!
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          We've received your moving request.
          <br />
          Our moving specialists will contact you within 5–15 minutes.
        </p>

        {shortId && (
          <div className="mx-auto mt-6 inline-flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quote ID
            </span>
            <span className="font-mono text-base font-semibold text-foreground">
              #{shortId}
            </span>
          </div>
        )}

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={onEdit}
            variant="outline"
            size="lg"
            className="rounded-full"
          >
            Edit Request
          </Button>
          <Button asChild size="lg" className="rounded-full">
            <a href="/">Back to Home</a>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {[
            { Icon: BadgeCheck, label: "Licensed & insured" },
            { Icon: Check, label: "No hidden fees" },
            { Icon: Truck, label: "Professional movers" },
            { Icon: Lock, label: "Secure online quote" },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2 py-2">
              <Icon className="h-3.5 w-3.5 text-sage" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
