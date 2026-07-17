// Production-oriented moving pricing engine.
// Pure function — deterministic, unit-tested-friendly. The `computeQuote` output
// is what the calculator UI renders and what we persist to `quotes`.
//
// A future AI pricing engine can call `computeQuote` for a baseline, then blend
// its own signals (seasonality, carrier load, historical bookings) on top.

import {
  MOVE_SIZE_BASELINE,
  inventoryTotals,
  recommendTruck,
  type InventoryCounts,
  type MoveSize,
} from "./inventory";

export type InsuranceTier = "basic" | "standard" | "full";
export type MoveType = "local" | "interstate";

export interface QuoteInput {
  originZip: string;
  destinationZip: string;
  originAddress?: string;
  destinationAddress?: string;
  distanceMiles: number;
  moveType: MoveType;
  moveSize: MoveSize;
  inventory: InventoryCounts;
  // Per-side access
  originStairs: number;
  destinationStairs: number;
  originElevator: boolean;
  destinationElevator: boolean;
  originLongCarry: boolean;
  destinationLongCarry: boolean;
  // Services
  packing: boolean;
  unpacking: boolean;
  storage: boolean;
  junkRemoval: boolean;
  assembly: boolean;
  // Specialty items
  piano: boolean;
  safe: boolean;
  gymEquipment: boolean;
  appliances: boolean;
  fragileItems: boolean;
  // Coverage
  insurance: InsuranceTier;
  // Timing
  moveDate: string;
  preferredTime: "morning" | "midday" | "afternoon" | "flexible";
  flexibleDate: boolean;
}

export interface QuoteBreakdownLine {
  label: string;
  amount: number;
  group: "labor" | "truck" | "fuel" | "packing" | "storage" | "insurance" | "specialty" | "access" | "tax";
}

export interface QuoteResult {
  low: number;
  high: number;
  point: number;
  breakdown: QuoteBreakdownLine[];
  cubicFeet: number;
  weightLbs: number;
  truckSize: string;
  numMovers: number;
  laborHours: number;
  distanceMiles: number;
  moveType: MoveType;
  taxes: number;
  subtotal: number;
  total: number;
}

// --- Rate card (single source of truth) --------------------------------------
const RATES = {
  laborPerMoverHour: 55,
  laborMinHours: 3,
  truckDayRate: 220,
  fuelPerMile: 1.45,
  interstateLineHaulPerCuFt: 0.72, // long-haul household goods baseline
  interstateOriginDestinationFee: 285,
  peakSeasonMultiplier: 1.12, // May 15 – Sep 15
  weekendSurcharge: 0.06,
  // Access
  stairsPerFlight: 40,
  longCarry: 95,
  noElevatorPenalty: 55,
  // Services
  packingPerCuFt: 1.1,
  packingMaterialsPerCuFt: 0.55,
  unpackingPerCuFt: 0.7,
  assembly: 160,
  storagePerMonth: 195,
  junkRemoval: 220,
  // Specialty items
  piano: 385,
  safe: 260,
  gymEquipment: 175,
  appliances: 140,
  fragileHandling: 130,
  // Insurance (percent of declared value; declared value proxied from weight)
  insuranceRate: { basic: 0, standard: 0.006, full: 0.014 } as Record<InsuranceTier, number>,
  declaredValuePerLb: 6, // industry-standard released value
  // Tax
  serviceTaxRate: 0.0725,
} as const;

function isPeakSeason(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const after = m > 5 || (m === 5 && day >= 15);
  const before = m < 9 || (m === 9 && day <= 15);
  return after && before;
}

function isWeekend(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function computeQuote(input: QuoteInput): QuoteResult {
  const baseline = MOVE_SIZE_BASELINE[input.moveSize];
  const inv = inventoryTotals(input.inventory);
  const cubicFeet = Math.max(inv.cubicFeet, baseline.cubicFeet);
  const weightLbs = Math.max(inv.weightLbs, baseline.weightLbs);

  // Volume drives extra time on top of baseline for that move size.
  const volumeFactor = cubicFeet / baseline.cubicFeet;
  const laborHours = Math.max(
    RATES.laborMinHours,
    Math.round(baseline.laborHours * Math.min(1.6, volumeFactor) * 10) / 10
  );
  const numMovers = Math.min(6, baseline.movers + (volumeFactor > 1.3 ? 1 : 0));
  const truck = recommendTruck(cubicFeet);

  const lines: QuoteBreakdownLine[] = [];

  // Labor
  const labor = Math.round(laborHours * numMovers * RATES.laborPerMoverHour);
  lines.push({ label: `Labor · ${numMovers} movers × ${laborHours} hr`, amount: labor, group: "labor" });

  // Truck
  const truckDays = input.moveType === "interstate" ? Math.max(1, Math.ceil(input.distanceMiles / 500)) : 1;
  const truckCost = truckDays * RATES.truckDayRate;
  lines.push({ label: `${truck.size} · ${truckDays} day${truckDays > 1 ? "s" : ""}`, amount: truckCost, group: "truck" });

  // Fuel / mileage
  if (input.moveType === "local") {
    const fuel = Math.round(input.distanceMiles * RATES.fuelPerMile + 60);
    lines.push({ label: `Fuel & mileage (${input.distanceMiles} mi)`, amount: fuel, group: "fuel" });
  } else {
    const lineHaul = Math.round(cubicFeet * RATES.interstateLineHaulPerCuFt + input.distanceMiles * 0.85);
    lines.push({ label: `Interstate line haul (${input.distanceMiles} mi)`, amount: lineHaul, group: "fuel" });
    lines.push({
      label: "Origin & destination service fee",
      amount: RATES.interstateOriginDestinationFee,
      group: "fuel",
    });
  }

  // Access surcharges (per side)
  const originStairs = input.originElevator ? 0 : input.originStairs * RATES.stairsPerFlight;
  const destStairs = input.destinationElevator ? 0 : input.destinationStairs * RATES.stairsPerFlight;
  if (originStairs) lines.push({ label: `Origin stairs (${input.originStairs} flights)`, amount: originStairs, group: "access" });
  if (destStairs) lines.push({ label: `Destination stairs (${input.destinationStairs} flights)`, amount: destStairs, group: "access" });
  if (!input.originElevator && input.originStairs === 0)
    lines.push({ label: "No elevator at origin", amount: RATES.noElevatorPenalty, group: "access" });
  if (!input.destinationElevator && input.destinationStairs === 0)
    lines.push({ label: "No elevator at destination", amount: RATES.noElevatorPenalty, group: "access" });
  if (input.originLongCarry) lines.push({ label: "Long carry at origin", amount: RATES.longCarry, group: "access" });
  if (input.destinationLongCarry) lines.push({ label: "Long carry at destination", amount: RATES.longCarry, group: "access" });

  // Packing
  if (input.packing) {
    const packing = Math.round(cubicFeet * RATES.packingPerCuFt);
    const materials = Math.round(cubicFeet * RATES.packingMaterialsPerCuFt);
    lines.push({ label: "Full-service packing", amount: packing, group: "packing" });
    lines.push({ label: "Packing materials", amount: materials, group: "packing" });
  }
  if (input.unpacking) {
    lines.push({ label: "Unpacking service", amount: Math.round(cubicFeet * RATES.unpackingPerCuFt), group: "packing" });
  }
  if (input.assembly) lines.push({ label: "Furniture assembly", amount: RATES.assembly, group: "packing" });

  // Storage / junk
  if (input.storage) lines.push({ label: "Storage (30 days)", amount: RATES.storagePerMonth, group: "storage" });
  if (input.junkRemoval) lines.push({ label: "Junk removal", amount: RATES.junkRemoval, group: "specialty" });

  // Specialty items
  if (input.piano) lines.push({ label: "Piano handling", amount: RATES.piano, group: "specialty" });
  if (input.safe) lines.push({ label: "Safe handling", amount: RATES.safe, group: "specialty" });
  if (input.gymEquipment) lines.push({ label: "Gym equipment", amount: RATES.gymEquipment, group: "specialty" });
  if (input.appliances) lines.push({ label: "Appliance disconnect / reconnect", amount: RATES.appliances, group: "specialty" });
  if (input.fragileItems) lines.push({ label: "Fragile item handling", amount: RATES.fragileHandling, group: "specialty" });

  // Insurance
  const declaredValue = weightLbs * RATES.declaredValuePerLb;
  const insuranceCost =
    input.insurance === "basic" ? 0 : Math.round(declaredValue * RATES.insuranceRate[input.insurance]);
  if (insuranceCost > 0)
    lines.push({
      label: `${input.insurance === "full" ? "Full value" : "Standard"} insurance`,
      amount: insuranceCost,
      group: "insurance",
    });

  // Subtotal + seasonal / day-of-week multipliers
  let subtotal = lines.reduce((s, l) => s + l.amount, 0);
  if (isPeakSeason(input.moveDate)) subtotal = Math.round(subtotal * RATES.peakSeasonMultiplier);
  if (isWeekend(input.moveDate) && !input.flexibleDate)
    subtotal = Math.round(subtotal * (1 + RATES.weekendSurcharge));

  const taxes = Math.round(subtotal * RATES.serviceTaxRate);
  const total = subtotal + taxes;

  // Range from confidence band (tightens as inventory is itemized).
  const itemized = Object.values(input.inventory).reduce((s, n) => s + n, 0) > 0;
  const spread = itemized ? 0.07 : 0.14;

  return {
    low: Math.round(total * (1 - spread)),
    high: Math.round(total * (1 + spread)),
    point: total,
    breakdown: lines,
    cubicFeet,
    weightLbs,
    truckSize: truck.size,
    numMovers,
    laborHours,
    distanceMiles: input.distanceMiles,
    moveType: input.moveType,
    taxes,
    subtotal,
    total,
  };
}

// Placeholder API surface for the future AI pricing engine. The calculator can
// call this instead of `computeQuote` once implemented — same input contract,
// richer output (confidence, comparable moves, carrier bids).
export interface AIPricingContext {
  input: QuoteInput;
  baseline: QuoteResult;
}
export type AIPricingFn = (ctx: AIPricingContext) => Promise<QuoteResult>;
