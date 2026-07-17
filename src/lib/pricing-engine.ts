// Production moving pricing engine — INVENTORY-DRIVEN.
//
// The final price is derived exclusively from the customer's inventory (cubic
// feet, weight, box count, heavy items) combined with logistics factors
// (distance, move type, floors/elevator/long carry, parking difficulty) and
// selected services. Bedroom count (MoveSize) is only a UI helper that
// pre-fills an inventory preset — it is NEVER passed to this engine.
//
// Every rate lives in a `RateCard`. The default `DEFAULT_RATE_CARD` is
// Easy Moving's baseline. When we ship the Partner Dashboard, each moving
// company will supply their own `RateCard` row and `computeQuote` will be
// called with `{ rateCard: partnerCard }` — no other change required.

import {
  INVENTORY_CATALOG,
  inventoryTotals,
  recommendTruck,
  type InventoryCounts,
} from "./inventory";

export type InsuranceTier = "basic" | "standard" | "full";
export type MoveType = "local" | "interstate";
export type ParkingDifficulty = "easy" | "moderate" | "difficult";

// ---------- Rate card (per-partner-configurable) ----------------------------

export interface RateCard {
  id: string;
  label: string;
  // Labor
  laborPerMoverHour: number;
  laborMinHours: number;
  cubicFeetPerMoverHour: number; // productivity coefficient
  // Truck
  truckDayRate: number;
  // Fuel / distance
  fuelPerMile: number;              // local moves
  fuelMinimum: number;
  interstateLineHaulPerCuFt: number; // interstate: long-haul $/cu-ft
  interstatePerMile: number;         // interstate: $/mile add-on
  interstateOriginDestinationFee: number;
  // Access surcharges (per side)
  stairsPerFlight: number;           // charged when no elevator
  noElevatorPenalty: number;         // flat, applied when floor > 0 and no elevator
  longCarry: number;
  parkingModerate: number;
  parkingDifficult: number;
  // Services
  packingPerCuFt: number;
  packingMaterialsPerCuFt: number;
  packingMaterialsPerBox: number;
  unpackingPerCuFt: number;
  assembly: number;
  storagePerMonth: number;
  junkRemoval: number;
  // Heavy / specialty items
  piano: number;
  safe: number;
  gymEquipment: number;
  appliances: number;
  fragileHandling: number;
  heavyItemPerUnit: number; // charged per catalog item flagged `heavy`
  // Insurance
  insuranceRate: Record<InsuranceTier, number>;
  declaredValuePerLb: number;
  // Timing multipliers
  peakSeasonMultiplier: number;      // May 15 – Sep 15
  weekendSurcharge: number;
  // Tax
  serviceTaxRate: number;
}

export const DEFAULT_RATE_CARD: RateCard = {
  id: "easy-moving-default",
  label: "Easy Moving default",
  laborPerMoverHour: 55,
  laborMinHours: 3,
  cubicFeetPerMoverHour: 85, // one mover clears ~85 cu-ft per hour of on-site work
  truckDayRate: 220,
  fuelPerMile: 1.45,
  fuelMinimum: 60,
  interstateLineHaulPerCuFt: 0.72,
  interstatePerMile: 0.85,
  interstateOriginDestinationFee: 285,
  stairsPerFlight: 40,
  noElevatorPenalty: 55,
  longCarry: 95,
  parkingModerate: 60,
  parkingDifficult: 145,
  packingPerCuFt: 1.1,
  packingMaterialsPerCuFt: 0.15,
  packingMaterialsPerBox: 3.5,
  unpackingPerCuFt: 0.7,
  assembly: 160,
  storagePerMonth: 195,
  junkRemoval: 220,
  piano: 385,
  safe: 260,
  gymEquipment: 175,
  appliances: 140,
  fragileHandling: 130,
  heavyItemPerUnit: 45,
  insuranceRate: { basic: 0, standard: 0.006, full: 0.014 },
  declaredValuePerLb: 6,
  peakSeasonMultiplier: 1.12,
  weekendSurcharge: 0.06,
  serviceTaxRate: 0.0725,
};

// ---------- Input / output ---------------------------------------------------

export interface QuoteInput {
  // Route
  originZip: string;
  destinationZip: string;
  originAddress?: string;
  destinationAddress?: string;
  distanceMiles: number;
  moveType: MoveType;
  // Inventory (the primary pricing driver)
  inventory: InventoryCounts;
  // Access per side
  originFloor: number;         // 0 = ground floor
  destinationFloor: number;
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
  // Specialty items (in addition to what's in the inventory)
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
  // Optional per-partner rate card
  rateCard?: RateCard;
}

export interface QuoteBreakdownLine {
  label: string;
  amount: number;
  group:
    | "labor"
    | "truck"
    | "fuel"
    | "packing"
    | "storage"
    | "insurance"
    | "specialty"
    | "access"
    | "tax";
}

export interface QuoteResult {
  low: number;
  high: number;
  point: number;
  breakdown: QuoteBreakdownLine[];
  cubicFeet: number;
  weightLbs: number;
  boxCount: number;
  heavyItemCount: number;
  truckSize: string;
  numMovers: number;
  laborHours: number;
  distanceMiles: number;
  moveType: MoveType;
  taxes: number;
  subtotal: number;
  total: number;
  rateCardId: string;
}

// ---------- Helpers ----------------------------------------------------------

function isPeakSeason(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (m > 5 || (m === 5 && day >= 15)) && (m < 9 || (m === 9 && day <= 15));
}

function isWeekend(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

// Movers required as a function of volume — inventory-driven, no bedroom count.
function crewSize(cubicFeet: number): number {
  if (cubicFeet <= 300) return 2;
  if (cubicFeet <= 700) return 3;
  if (cubicFeet <= 1200) return 4;
  if (cubicFeet <= 1800) return 5;
  return 6;
}

// Count boxes and heavy items from the inventory catalog.
function inventoryFacets(inventory: InventoryCounts) {
  let boxCount = 0;
  let heavyItemCount = 0;
  for (const item of INVENTORY_CATALOG) {
    const qty = inventory[item.id] ?? 0;
    if (!qty) continue;
    if (item.category === "boxes") boxCount += qty;
    if (item.heavy) heavyItemCount += qty;
  }
  return { boxCount, heavyItemCount };
}

function parkingCost(p: ParkingDifficulty, r: RateCard): number {
  if (p === "moderate") return r.parkingModerate;
  if (p === "difficult") return r.parkingDifficult;
  return 0;
}

// ---------- Engine -----------------------------------------------------------

export function computeQuote(input: QuoteInput): QuoteResult {
  const r = input.rateCard ?? DEFAULT_RATE_CARD;
  const inv = inventoryTotals(input.inventory);
  const { boxCount, heavyItemCount } = inventoryFacets(input.inventory);

  // Volume drives everything.
  const cubicFeet = Math.max(50, inv.cubicFeet); // floor so empty carts still price
  const weightLbs = Math.max(inv.weightLbs, cubicFeet * 7);
  const truck = recommendTruck(cubicFeet);
  const numMovers = crewSize(cubicFeet);

  // Labor hours from productivity coefficient (round to nearest 0.5h, min floor).
  const rawHours = cubicFeet / (numMovers * r.cubicFeetPerMoverHour);
  const laborHours = Math.max(r.laborMinHours, Math.round(rawHours * 2) / 2);

  const lines: QuoteBreakdownLine[] = [];

  // Labor -------------------------------------------------------------------
  const labor = Math.round(laborHours * numMovers * r.laborPerMoverHour);
  lines.push({
    label: `Labor · ${numMovers} movers × ${laborHours} hr`,
    amount: labor,
    group: "labor",
  });

  // Truck -------------------------------------------------------------------
  const truckDays =
    input.moveType === "interstate"
      ? Math.max(1, Math.ceil(input.distanceMiles / 500))
      : 1;
  const truckCost = truckDays * r.truckDayRate;
  lines.push({
    label: `${truck.size} · ${truckDays} day${truckDays > 1 ? "s" : ""}`,
    amount: truckCost,
    group: "truck",
  });

  // Fuel / distance ---------------------------------------------------------
  if (input.moveType === "local") {
    const fuel = Math.round(input.distanceMiles * r.fuelPerMile + r.fuelMinimum);
    lines.push({
      label: `Fuel & mileage (${input.distanceMiles} mi)`,
      amount: fuel,
      group: "fuel",
    });
  } else {
    const lineHaul = Math.round(
      cubicFeet * r.interstateLineHaulPerCuFt + input.distanceMiles * r.interstatePerMile
    );
    lines.push({
      label: `Interstate line haul (${input.distanceMiles} mi)`,
      amount: lineHaul,
      group: "fuel",
    });
    lines.push({
      label: "Origin & destination service fee",
      amount: r.interstateOriginDestinationFee,
      group: "fuel",
    });
  }

  // Access ------------------------------------------------------------------
  // Stairs are only charged when there is no elevator AND floor > 0.
  const originStairsCost =
    !input.originElevator && input.originFloor > 0
      ? input.originFloor * r.stairsPerFlight + r.noElevatorPenalty
      : 0;
  const destStairsCost =
    !input.destinationElevator && input.destinationFloor > 0
      ? input.destinationFloor * r.stairsPerFlight + r.noElevatorPenalty
      : 0;
  if (originStairsCost)
    lines.push({
      label: `Origin floor ${input.originFloor} (no elevator)`,
      amount: originStairsCost,
      group: "access",
    });
  if (destStairsCost)
    lines.push({
      label: `Destination floor ${input.destinationFloor} (no elevator)`,
      amount: destStairsCost,
      group: "access",
    });
  if (input.originLongCarry)
    lines.push({ label: "Long carry at origin", amount: r.longCarry, group: "access" });
  if (input.destinationLongCarry)
    lines.push({ label: "Long carry at destination", amount: r.longCarry, group: "access" });

  const originPark = parkingCost(input.originParking, r);
  const destPark = parkingCost(input.destinationParking, r);
  if (originPark)
    lines.push({
      label: `Parking (${input.originParking}) at origin`,
      amount: originPark,
      group: "access",
    });
  if (destPark)
    lines.push({
      label: `Parking (${input.destinationParking}) at destination`,
      amount: destPark,
      group: "access",
    });

  // Packing / assembly ------------------------------------------------------
  if (input.packing) {
    const packing = Math.round(cubicFeet * r.packingPerCuFt);
    const materials =
      Math.round(cubicFeet * r.packingMaterialsPerCuFt) +
      Math.round(boxCount * r.packingMaterialsPerBox);
    lines.push({ label: "Full-service packing", amount: packing, group: "packing" });
    lines.push({
      label: `Packing materials${boxCount ? ` (${boxCount} boxes)` : ""}`,
      amount: materials,
      group: "packing",
    });
  }
  if (input.unpacking)
    lines.push({
      label: "Unpacking service",
      amount: Math.round(cubicFeet * r.unpackingPerCuFt),
      group: "packing",
    });
  if (input.assembly)
    lines.push({ label: "Furniture assembly", amount: r.assembly, group: "packing" });

  // Storage / junk ----------------------------------------------------------
  if (input.storage)
    lines.push({ label: "Storage (30 days)", amount: r.storagePerMonth, group: "storage" });
  if (input.junkRemoval)
    lines.push({ label: "Junk removal", amount: r.junkRemoval, group: "specialty" });

  // Heavy items from inventory ---------------------------------------------
  if (heavyItemCount > 0) {
    lines.push({
      label: `Heavy items handling (${heavyItemCount})`,
      amount: heavyItemCount * r.heavyItemPerUnit,
      group: "specialty",
    });
  }

  // Explicit specialty toggles ---------------------------------------------
  if (input.piano) lines.push({ label: "Piano handling", amount: r.piano, group: "specialty" });
  if (input.safe) lines.push({ label: "Safe handling", amount: r.safe, group: "specialty" });
  if (input.gymEquipment)
    lines.push({ label: "Gym equipment", amount: r.gymEquipment, group: "specialty" });
  if (input.appliances)
    lines.push({
      label: "Appliance disconnect / reconnect",
      amount: r.appliances,
      group: "specialty",
    });
  if (input.fragileItems)
    lines.push({
      label: "Fragile item handling",
      amount: r.fragileHandling,
      group: "specialty",
    });

  // Insurance ---------------------------------------------------------------
  const declaredValue = weightLbs * r.declaredValuePerLb;
  const insuranceCost =
    input.insurance === "basic"
      ? 0
      : Math.round(declaredValue * r.insuranceRate[input.insurance]);
  if (insuranceCost > 0)
    lines.push({
      label: `${input.insurance === "full" ? "Full value" : "Standard"} insurance`,
      amount: insuranceCost,
      group: "insurance",
    });

  // Subtotal + seasonal / day-of-week multipliers ---------------------------
  let subtotal = lines.reduce((s, l) => s + l.amount, 0);
  if (isPeakSeason(input.moveDate)) subtotal = Math.round(subtotal * r.peakSeasonMultiplier);
  if (isWeekend(input.moveDate) && !input.flexibleDate)
    subtotal = Math.round(subtotal * (1 + r.weekendSurcharge));

  const taxes = Math.round(subtotal * r.serviceTaxRate);
  const total = subtotal + taxes;

  // Range — tightens as the inventory becomes more itemized.
  const itemCount = Object.values(input.inventory).reduce((s, n) => s + n, 0);
  const spread = itemCount === 0 ? 0.18 : itemCount < 10 ? 0.12 : itemCount < 25 ? 0.08 : 0.05;

  return {
    low: Math.round(total * (1 - spread)),
    high: Math.round(total * (1 + spread)),
    point: total,
    breakdown: lines,
    cubicFeet,
    weightLbs,
    boxCount,
    heavyItemCount,
    truckSize: truck.size,
    numMovers,
    laborHours,
    distanceMiles: input.distanceMiles,
    moveType: input.moveType,
    taxes,
    subtotal,
    total,
    rateCardId: r.id,
  };
}

// ---------- Future AI pricing surface ---------------------------------------
// The AI engine will take `computeQuote` output as a deterministic baseline,
// then adjust for seasonality, carrier load, historical bookings, etc.
export interface AIPricingContext {
  input: QuoteInput;
  baseline: QuoteResult;
}
export type AIPricingFn = (ctx: AIPricingContext) => Promise<QuoteResult>;
