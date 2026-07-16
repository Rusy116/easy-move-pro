import { useMemo, useState } from "react";
import {
  Loader2,
  MapPin,
  ArrowRight,
  Home,
  Building2,
  Warehouse,
  Briefcase,
  Layers,
  ArrowUpDown,
  Boxes,
  Archive,
  Wrench,
  Dumbbell,
  Ruler,
  Calendar as CalendarIcon,
  Sparkles,
  Check,
} from "lucide-react";
import { computeEstimate, lookupCity, type QuoteInput } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT: QuoteInput = {
  originZip: "",
  destinationZip: "",
  propertyType: "apartment",
  bedrooms: 2,
  floor: 1,
  elevator: false,
  packing: false,
  storage: false,
  assembly: false,
  heavyItems: false,
  longCarry: false,
};

const PROPERTY_TYPES = [
  { value: "studio", label: "Studio", Icon: Warehouse },
  { value: "apartment", label: "Apartment", Icon: Building2 },
  { value: "house", label: "House", Icon: Home },
  { value: "office", label: "Office", Icon: Briefcase },
] as const;

const ADDONS = [
  { key: "packing", label: "Packing", Icon: Boxes, desc: "Full-service packing" },
  { key: "storage", label: "Storage", Icon: Archive, desc: "30-day secure storage" },
  { key: "assembly", label: "Assembly", Icon: Wrench, desc: "Furniture assembly" },
  { key: "heavyItems", label: "Heavy items", Icon: Dumbbell, desc: "Piano, safe, gym" },
  { key: "longCarry", label: "Long carry", Icon: Ruler, desc: "Over 75 ft from truck" },
] as const;

export function QuoteCalculator({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState<QuoteInput>(DEFAULT);
  const [moveDate, setMoveDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const originCity = useMemo(() => lookupCity(input.originZip), [input.originZip]);
  const destCity = useMemo(() => lookupCity(input.destinationZip), [input.destinationZip]);

  const canEstimate =
    /^\d{5}$/.test(input.originZip) && /^\d{5}$/.test(input.destinationZip);
  const estimate = canEstimate ? computeEstimate(input) : null;

  const update = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) =>
    setInput((s) => ({ ...s, [k]: v }));

  async function saveQuote() {
    if (!estimate) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;
      const { error } = await supabase.from("quotes").insert({
        user_id: userId,
        origin_zip: input.originZip,
        destination_zip: input.destinationZip,
        origin_city: originCity,
        destination_city: destCity,
        property_type: input.propertyType,
        bedrooms: input.bedrooms,
        floor: input.floor,
        elevator: input.elevator,
        packing: input.packing,
        storage: input.storage,
        assembly: input.assembly,
        heavy_items: input.heavyItems,
        long_carry: input.longCarry,
        move_date: moveDate || null,
        inventory_notes: notes || null,
        estimated_low: estimate.low,
        estimated_high: estimate.high,
        contact_email: email || null,
        contact_phone: phone || null,
      });
      if (error) throw error;
      toast.success("Quote saved. We'll be in touch shortly.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[0_30px_80px_-40px_rgba(20,40,25,0.35)] ring-1 ring-black/5">
      {/* Price header */}
      <div className="relative overflow-hidden bg-primary px-6 py-6 text-primary-foreground sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ochre/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-ochre/10 blur-3xl" aria-hidden />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">
              <Sparkles className="h-3 w-3 text-ochre" /> Live estimate
            </span>
            <h3 className="mt-3 font-serif text-xl font-medium sm:text-2xl">
              Instant Moving Quote
            </h3>
            <p className="mt-1 text-xs opacity-70 sm:text-sm">
              {canEstimate
                ? `${estimate?.distanceMiles} mi · ${input.bedrooms}BR ${input.propertyType}`
                : "Enter ZIPs to see your live price"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest opacity-60">Estimated range</div>
            <div
              key={estimate ? `${estimate.low}-${estimate.high}` : "empty"}
              className="font-serif text-2xl font-medium tabular-nums animate-fade-up sm:text-4xl"
            >
              {estimate ? (
                <>
                  ${estimate.low.toLocaleString()}
                  <span className="mx-1 opacity-40">–</span>${estimate.high.toLocaleString()}
                </>
              ) : (
                <span className="opacity-40">$— – $—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Geography */}
        <SectionCard label="Route" step="01">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <ZipInput
              placeholder="Origin ZIP"
              value={input.originZip}
              onChange={(v) => update("originZip", v)}
              city={originCity}
            />
            <div className="hidden sm:flex h-10 items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <ZipInput
              placeholder="Destination ZIP"
              value={input.destinationZip}
              onChange={(v) => update("destinationZip", v)}
              city={destCity}
            />
          </div>
        </SectionCard>

        {/* Move date */}
        <SectionCard label="Move date" step="02">
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="pl-9"
            />
          </div>
        </SectionCard>

        {/* Property type */}
        <SectionCard label="Property type" step="03" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROPERTY_TYPES.map(({ value, label, Icon }) => {
              const active = input.propertyType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("propertyType", value)}
                  className={cn(
                    "group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium">{label}</div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Bedrooms */}
        <SectionCard label="Bedrooms" step="04">
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, "6+"].map((n, i) => {
              const num = i === 5 ? 6 : (n as number);
              const active = input.bedrooms === num;
              return (
                <button
                  key={String(n)}
                  type="button"
                  onClick={() => update("bedrooms", num)}
                  className={cn(
                    "min-w-10 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition-all",
                    active
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card text-foreground ring-border hover:bg-accent"
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Floor + elevator */}
        <SectionCard label="Floor & access" step="05">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="relative">
              <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={input.floor}
                onChange={(e) => update("floor", Number(e.target.value))}
                className="h-10 w-full appearance-none rounded-md border border-input bg-card pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Floor {n}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              type="button"
              onClick={() => update("elevator", !input.elevator)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3.5 text-sm font-medium transition-all",
                input.elevator
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-sm border",
                  input.elevator ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {input.elevator && <Check className="h-3 w-3" />}
              </span>
              Elevator
            </button>
          </div>
        </SectionCard>

        {/* Add-ons */}
        <SectionCard label="Add-on services" step="06" className="md:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {ADDONS.map(({ key, label, Icon, desc }) => {
              const on = Boolean(input[key as keyof QuoteInput]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(key as keyof QuoteInput, !on as never)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    on
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {!compact && (
          <>
            <SectionCard label="Contact" step="07" className="md:col-span-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
                <Input
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>
            </SectionCard>

            <SectionCard label="Inventory notes (optional)" step="08" className="md:col-span-2">
              <Textarea
                placeholder="Anything special about your items? Fragile art, oversized furniture, disassembly needs…"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                rows={3}
              />
            </SectionCard>
          </>
        )}
      </div>

      {/* Breakdown + CTA */}
      {estimate && (
        <div className="border-t border-border bg-muted/40 px-5 py-5 sm:px-8 sm:py-6">
          {!compact && (
            <div className="mb-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Breakdown
              </div>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
                {estimate.breakdown.map((b) => (
                  <li key={b.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium tabular-nums">${b.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!compact ? (
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Estimates use live carrier rates and household inventory averages.
              </p>
              <Button
                onClick={saveQuote}
                disabled={!estimate || saving}
                size="lg"
                className="rounded-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & request booking
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Prices update instantly as you edit. No signup required.
            </p>
          )}
        </div>
      )}
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
  city,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  city: string | null;
}) {
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
          className="pl-9 font-mono tracking-wider"
        />
      </div>
      <p className="mt-1 min-h-4 text-xs text-muted-foreground">
        {city ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-sage" /> {city}
          </span>
        ) : value.length === 5 ? (
          "US ZIP recognized"
        ) : (
          ""
        )}
      </p>
    </div>
  );
}
