// Inventory catalog + volume/weight estimator.
// Each item carries an average cubic-feet and weight (lbs) figure from
// household-goods movers' industry references.

export interface InventoryItem {
  id: string;
  label: string;
  category: "living" | "bedroom" | "dining" | "kitchen" | "office" | "outdoor" | "boxes";
  cubicFeet: number;
  weightLbs: number;
}

export const INVENTORY_CATALOG: InventoryItem[] = [
  // Living
  { id: "sofa-3", label: "Sofa (3-seat)", category: "living", cubicFeet: 50, weightLbs: 150 },
  { id: "sofa-sectional", label: "Sectional sofa", category: "living", cubicFeet: 90, weightLbs: 260 },
  { id: "armchair", label: "Armchair", category: "living", cubicFeet: 25, weightLbs: 70 },
  { id: "coffee-table", label: "Coffee table", category: "living", cubicFeet: 15, weightLbs: 50 },
  { id: "tv-stand", label: "TV stand", category: "living", cubicFeet: 20, weightLbs: 60 },
  { id: "tv", label: 'TV (55"+)', category: "living", cubicFeet: 12, weightLbs: 45 },
  { id: "bookcase", label: "Bookcase", category: "living", cubicFeet: 25, weightLbs: 80 },
  { id: "rug-large", label: "Area rug (large)", category: "living", cubicFeet: 10, weightLbs: 40 },
  // Bedroom
  { id: "bed-king", label: "King bed set", category: "bedroom", cubicFeet: 70, weightLbs: 200 },
  { id: "bed-queen", label: "Queen bed set", category: "bedroom", cubicFeet: 60, weightLbs: 170 },
  { id: "bed-full", label: "Full bed set", category: "bedroom", cubicFeet: 45, weightLbs: 130 },
  { id: "bed-twin", label: "Twin bed set", category: "bedroom", cubicFeet: 35, weightLbs: 100 },
  { id: "dresser", label: "Dresser", category: "bedroom", cubicFeet: 40, weightLbs: 120 },
  { id: "nightstand", label: "Nightstand", category: "bedroom", cubicFeet: 8, weightLbs: 30 },
  { id: "wardrobe", label: "Wardrobe / armoire", category: "bedroom", cubicFeet: 55, weightLbs: 180 },
  // Dining
  { id: "dining-table", label: "Dining table", category: "dining", cubicFeet: 35, weightLbs: 120 },
  { id: "dining-chair", label: "Dining chair", category: "dining", cubicFeet: 6, weightLbs: 20 },
  { id: "china-cabinet", label: "China cabinet", category: "dining", cubicFeet: 45, weightLbs: 160 },
  // Kitchen
  { id: "fridge", label: "Refrigerator", category: "kitchen", cubicFeet: 45, weightLbs: 250 },
  { id: "washer", label: "Washer", category: "kitchen", cubicFeet: 20, weightLbs: 180 },
  { id: "dryer", label: "Dryer", category: "kitchen", cubicFeet: 20, weightLbs: 130 },
  { id: "dishwasher", label: "Dishwasher", category: "kitchen", cubicFeet: 15, weightLbs: 100 },
  { id: "microwave", label: "Microwave", category: "kitchen", cubicFeet: 5, weightLbs: 35 },
  // Office
  { id: "desk", label: "Desk", category: "office", cubicFeet: 30, weightLbs: 90 },
  { id: "office-chair", label: "Office chair", category: "office", cubicFeet: 12, weightLbs: 40 },
  { id: "filing-cabinet", label: "Filing cabinet", category: "office", cubicFeet: 15, weightLbs: 90 },
  // Outdoor
  { id: "bbq", label: "BBQ grill", category: "outdoor", cubicFeet: 25, weightLbs: 90 },
  { id: "patio-set", label: "Patio set", category: "outdoor", cubicFeet: 40, weightLbs: 120 },
  { id: "bike", label: "Bicycle", category: "outdoor", cubicFeet: 12, weightLbs: 30 },
  { id: "treadmill", label: "Treadmill", category: "outdoor", cubicFeet: 35, weightLbs: 220 },
  // Boxes
  { id: "box-sm", label: "Small box", category: "boxes", cubicFeet: 1.5, weightLbs: 25 },
  { id: "box-md", label: "Medium box", category: "boxes", cubicFeet: 3, weightLbs: 45 },
  { id: "box-lg", label: "Large box", category: "boxes", cubicFeet: 4.5, weightLbs: 60 },
  { id: "wardrobe-box", label: "Wardrobe box", category: "boxes", cubicFeet: 13, weightLbs: 40 },
];

export const CATEGORY_LABEL: Record<InventoryItem["category"], string> = {
  living: "Living room",
  bedroom: "Bedroom",
  dining: "Dining room",
  kitchen: "Kitchen & appliances",
  office: "Office",
  outdoor: "Outdoor & fitness",
  boxes: "Boxes",
};

export type InventoryCounts = Record<string, number>;

export function inventoryTotals(counts: InventoryCounts) {
  let cubicFeet = 0;
  let weightLbs = 0;
  for (const item of INVENTORY_CATALOG) {
    const qty = counts[item.id] ?? 0;
    if (!qty) continue;
    cubicFeet += qty * item.cubicFeet;
    weightLbs += qty * item.weightLbs;
  }
  return { cubicFeet: Math.round(cubicFeet), weightLbs: Math.round(weightLbs) };
}

// Baseline volume per move size (used when the user hasn't itemized their inventory yet).
export const MOVE_SIZE_BASELINE: Record<
  MoveSize,
  { cubicFeet: number; weightLbs: number; laborHours: number; movers: number }
> = {
  studio: { cubicFeet: 300, weightLbs: 2100, laborHours: 4, movers: 2 },
  "1br": { cubicFeet: 450, weightLbs: 3150, laborHours: 5, movers: 2 },
  "2br": { cubicFeet: 750, weightLbs: 5250, laborHours: 7, movers: 3 },
  "3br": { cubicFeet: 1100, weightLbs: 7700, laborHours: 9, movers: 3 },
  "4br": { cubicFeet: 1500, weightLbs: 10500, laborHours: 11, movers: 4 },
  "5br": { cubicFeet: 2000, weightLbs: 14000, laborHours: 14, movers: 4 },
} as const;

export type MoveSize = "studio" | "1br" | "2br" | "3br" | "4br" | "5br";

export const MOVE_SIZE_LABEL: Record<MoveSize, string> = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
  "3br": "3 Bedroom",
  "4br": "4 Bedroom",
  "5br": "5+ Bedroom",
};

// Truck size recommendation from cubic-feet capacity.
export function recommendTruck(cubicFeet: number): { size: string; capacityCuFt: number } {
  if (cubicFeet <= 350) return { size: "10 ft truck", capacityCuFt: 400 };
  if (cubicFeet <= 700) return { size: "16 ft truck", capacityCuFt: 800 };
  if (cubicFeet <= 1100) return { size: "20 ft truck", capacityCuFt: 1200 };
  if (cubicFeet <= 1500) return { size: "22 ft truck", capacityCuFt: 1600 };
  if (cubicFeet <= 2100) return { size: "26 ft truck", capacityCuFt: 2200 };
  return { size: "26 ft truck + trailer", capacityCuFt: 2800 };
}
