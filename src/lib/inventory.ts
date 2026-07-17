// Inventory catalog + volume/weight estimator.
// Each item carries an average cubic-feet and weight (lbs) figure from
// household-goods movers' industry references, plus a `heavy` flag that
// the pricing engine uses to add per-item heavy-handling fees.

export interface InventoryItem {
  id: string;
  label: string;
  category: "living" | "bedroom" | "dining" | "kitchen" | "office" | "outdoor" | "boxes";
  cubicFeet: number;
  weightLbs: number;
  heavy?: boolean;
}

export const INVENTORY_CATALOG: InventoryItem[] = [
  // Living
  { id: "sofa-3", label: "Sofa (3-seat)", category: "living", cubicFeet: 50, weightLbs: 150 },
  { id: "sofa-sectional", label: "Sectional sofa", category: "living", cubicFeet: 90, weightLbs: 260, heavy: true },
  { id: "armchair", label: "Armchair", category: "living", cubicFeet: 25, weightLbs: 70 },
  { id: "coffee-table", label: "Coffee table", category: "living", cubicFeet: 15, weightLbs: 50 },
  { id: "tv-stand", label: "TV stand", category: "living", cubicFeet: 20, weightLbs: 60 },
  { id: "tv", label: 'TV (55"+)', category: "living", cubicFeet: 12, weightLbs: 45 },
  { id: "bookcase", label: "Bookcase", category: "living", cubicFeet: 25, weightLbs: 80 },
  { id: "rug-large", label: "Area rug (large)", category: "living", cubicFeet: 10, weightLbs: 40 },
  // Bedroom
  { id: "bed-king", label: "King bed set", category: "bedroom", cubicFeet: 70, weightLbs: 200, heavy: true },
  { id: "bed-queen", label: "Queen bed set", category: "bedroom", cubicFeet: 60, weightLbs: 170 },
  { id: "bed-full", label: "Full bed set", category: "bedroom", cubicFeet: 45, weightLbs: 130 },
  { id: "bed-twin", label: "Twin bed set", category: "bedroom", cubicFeet: 35, weightLbs: 100 },
  { id: "dresser", label: "Dresser", category: "bedroom", cubicFeet: 40, weightLbs: 120 },
  { id: "nightstand", label: "Nightstand", category: "bedroom", cubicFeet: 8, weightLbs: 30 },
  { id: "wardrobe", label: "Wardrobe / armoire", category: "bedroom", cubicFeet: 55, weightLbs: 180, heavy: true },
  // Dining
  { id: "dining-table", label: "Dining table", category: "dining", cubicFeet: 35, weightLbs: 120 },
  { id: "dining-chair", label: "Dining chair", category: "dining", cubicFeet: 6, weightLbs: 20 },
  { id: "china-cabinet", label: "China cabinet", category: "dining", cubicFeet: 45, weightLbs: 160, heavy: true },
  // Kitchen
  { id: "fridge", label: "Refrigerator", category: "kitchen", cubicFeet: 45, weightLbs: 250, heavy: true },
  { id: "washer", label: "Washer", category: "kitchen", cubicFeet: 20, weightLbs: 180, heavy: true },
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
  { id: "treadmill", label: "Treadmill", category: "outdoor", cubicFeet: 35, weightLbs: 220, heavy: true },
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

export type MoveSize = "studio" | "1br" | "2br" | "3br" | "4br" | "5br";

export const MOVE_SIZE_LABEL: Record<MoveSize, string> = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
  "3br": "3 Bedroom",
  "4br": "4 Bedroom",
  "5br": "5+ Bedroom",
};

// ---------- Move-size PRESETS (helper only — never used for pricing) --------
// Bedroom count is a UX shortcut: selecting one pre-fills a typical inventory.
// The pricing engine reads only the resulting `InventoryCounts`.
export const MOVE_SIZE_PRESETS: Record<MoveSize, InventoryCounts> = {
  studio: {
    "sofa-3": 1, "armchair": 1, "coffee-table": 1, "tv": 1, "tv-stand": 1,
    "bed-full": 1, "dresser": 1, "nightstand": 1,
    "desk": 1, "office-chair": 1,
    "microwave": 1,
    "box-sm": 10, "box-md": 5, "wardrobe-box": 1,
  },
  "1br": {
    "sofa-3": 1, "armchair": 1, "coffee-table": 1, "tv": 1, "tv-stand": 1, "bookcase": 1,
    "bed-queen": 1, "dresser": 1, "nightstand": 2,
    "dining-table": 1, "dining-chair": 2,
    "desk": 1, "office-chair": 1,
    "microwave": 1,
    "box-sm": 15, "box-md": 8, "box-lg": 3, "wardrobe-box": 2,
  },
  "2br": {
    "sofa-sectional": 1, "armchair": 1, "coffee-table": 1, "tv": 2, "tv-stand": 1, "bookcase": 1, "rug-large": 1,
    "bed-queen": 1, "bed-full": 1, "dresser": 2, "nightstand": 3,
    "dining-table": 1, "dining-chair": 4,
    "desk": 1, "office-chair": 1, "filing-cabinet": 1,
    "fridge": 1, "microwave": 1,
    "box-sm": 22, "box-md": 12, "box-lg": 5, "wardrobe-box": 3,
  },
  "3br": {
    "sofa-sectional": 1, "sofa-3": 1, "armchair": 2, "coffee-table": 1, "tv": 3, "tv-stand": 2, "bookcase": 2, "rug-large": 2,
    "bed-king": 1, "bed-queen": 1, "bed-twin": 1, "dresser": 3, "nightstand": 4, "wardrobe": 1,
    "dining-table": 1, "dining-chair": 6, "china-cabinet": 1,
    "desk": 1, "office-chair": 1, "filing-cabinet": 1,
    "fridge": 1, "washer": 1, "dryer": 1, "microwave": 1,
    "box-sm": 30, "box-md": 18, "box-lg": 8, "wardrobe-box": 4,
  },
  "4br": {
    "sofa-sectional": 1, "sofa-3": 1, "armchair": 2, "coffee-table": 2, "tv": 4, "tv-stand": 2, "bookcase": 3, "rug-large": 2,
    "bed-king": 1, "bed-queen": 2, "bed-twin": 1, "dresser": 4, "nightstand": 5, "wardrobe": 2,
    "dining-table": 1, "dining-chair": 8, "china-cabinet": 1,
    "desk": 2, "office-chair": 2, "filing-cabinet": 2,
    "fridge": 1, "washer": 1, "dryer": 1, "dishwasher": 1, "microwave": 1,
    "patio-set": 1, "bbq": 1,
    "box-sm": 40, "box-md": 24, "box-lg": 12, "wardrobe-box": 6,
  },
  "5br": {
    "sofa-sectional": 2, "sofa-3": 1, "armchair": 3, "coffee-table": 2, "tv": 5, "tv-stand": 3, "bookcase": 4, "rug-large": 3,
    "bed-king": 2, "bed-queen": 2, "bed-twin": 1, "dresser": 5, "nightstand": 6, "wardrobe": 2,
    "dining-table": 1, "dining-chair": 10, "china-cabinet": 1,
    "desk": 2, "office-chair": 2, "filing-cabinet": 2,
    "fridge": 2, "washer": 1, "dryer": 1, "dishwasher": 1, "microwave": 1,
    "patio-set": 1, "bbq": 1, "treadmill": 1,
    "box-sm": 55, "box-md": 32, "box-lg": 16, "wardrobe-box": 8,
  },
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
