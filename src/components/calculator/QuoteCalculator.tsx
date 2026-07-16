import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { computeEstimate, lookupCity, type QuoteInput } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function QuoteCalculator({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState<QuoteInput>(DEFAULT);
  const [moveDate, setMoveDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const originCity = useMemo(() => lookupCity(input.originZip), [input.originZip]);
  const destCity = useMemo(() => lookupCity(input.destinationZip), [input.destinationZip]);

  const canEstimate = /^\d{5}$/.test(input.originZip) && /^\d{5}$/.test(input.destinationZip);
  const estimate = canEstimate ? computeEstimate(input) : null;

  useEffect(() => {
    if (input.elevator && input.floor === 1) return;
  }, [input.elevator, input.floor]);

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
    <div className="rounded-2xl bg-card p-1 ring-1 ring-black/5 shadow-2xl">
      <div className="rounded-[15px] border border-border bg-muted/40 p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Live Logistics Quote
            </span>
            <h3 className="font-serif text-2xl font-medium text-foreground">Instant Estimate</h3>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs text-muted-foreground">Estimated range</div>
            <div className="font-serif text-3xl font-medium text-primary">
              {estimate ? (
                <>
                  ${estimate.low.toLocaleString()}{" "}
                  <span className="text-muted-foreground/50">/</span> $
                  {estimate.high.toLocaleString()}
                </>
              ) : (
                <span className="text-muted-foreground/60">$— / $—</span>
              )}
            </div>
            {estimate && (
              <div className="text-xs text-muted-foreground">
                {estimate.distanceMiles} mi · {input.bedrooms}BR {input.propertyType}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Geography */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Geography</Label>
            <div className="grid gap-2">
              <div>
                <Input
                  placeholder="Origin ZIP"
                  inputMode="numeric"
                  maxLength={5}
                  value={input.originZip}
                  onChange={(e) => update("originZip", e.target.value.replace(/\D/g, ""))}
                />
                {originCity && (
                  <p className="mt-1 text-xs text-muted-foreground">{originCity}</p>
                )}
              </div>
              <div>
                <Input
                  placeholder="Destination ZIP"
                  inputMode="numeric"
                  maxLength={5}
                  value={input.destinationZip}
                  onChange={(e) => update("destinationZip", e.target.value.replace(/\D/g, ""))}
                />
                {destCity && (
                  <p className="mt-1 text-xs text-muted-foreground">{destCity}</p>
                )}
              </div>
            </div>
          </div>

          {/* Property */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Property</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={input.propertyType}
                onValueChange={(v) => update("propertyType", v as QuoteInput["propertyType"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(input.bedrooms)}
                onValueChange={(v) => update("bedrooms", Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} bedroom{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(input.floor)} onValueChange={(v) => update("floor", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>Floor {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3">
                <Checkbox
                  checked={input.elevator}
                  onCheckedChange={(v) => update("elevator", !!v)}
                />
                <span className="text-sm">Elevator</span>
              </label>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3 md:col-span-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Add-on services</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["packing", "Packing"],
                  ["storage", "Storage"],
                  ["assembly", "Assembly"],
                  ["heavyItems", "Heavy items"],
                  ["longCarry", "Long carry"],
                ] as [keyof QuoteInput, string][]
              ).map(([k, label]) => {
                const on = Boolean(input[k]);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update(k, !on as never)}
                    className={
                      "rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 transition-all " +
                      (on
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card text-muted-foreground ring-border hover:bg-accent")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!compact && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Move date</Label>
                <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Contact</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Inventory notes (optional)
                </Label>
                <Textarea
                  placeholder="Anything special about your items?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        {estimate && !compact && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Breakdown
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {estimate.breakdown.map((b) => (
                <li key={b.label} className="flex justify-between">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium">${b.amount.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!compact && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Estimates use live carrier rates and household inventory averages.
            </p>
            <Button onClick={saveQuote} disabled={!estimate || saving} className="rounded-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & request booking
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
