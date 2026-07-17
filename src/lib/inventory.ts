// Inventory catalog + volume/weight estimator.
// Item names use plain everyday English (no moving industry jargon).
// Each item carries an average cubic-feet and weight (lbs) figure plus a
// `heavy` flag that the pricing engine uses to add per-item handling fees.

export interface InventoryItem {
  id: string;
  label: string;
  category: "living" | "bedroom" | "dining" | "kitchen" | "office" | "outdoor" | "tv" | "boxes";
  cubicFeet: number;
  weightLbs: number;
  heavy?: boolean;
}

export const INVENTORY_CATALOG: InventoryItem[] = [
  // Living room
  { id: "sofa", label: "Sofa", category: "living", cubicFeet: 50, weightLbs: 150 },
  { id: "loveseat", label: "Loveseat", category: "living", cubicFeet: 35, weightLbs: 110 },
  { id: "sectional", label: "Sectional", category: "living", cubicFeet: 90, weightLbs: 260, heavy: true },
  { id: "coffee-table", label: "Coffee table", category: "living", cubicFeet: 15, weightLbs: 50 },
  { id: "end-table", label: "End table", category: "living", cubicFeet: 8, weightLbs: 30 },
  { id: "tv-stand", label: "TV stand", category: "living", cubicFeet: 20, weightLbs: 60 },
  { id: "bookshelf", label: "Bookshelf", category: "living", cubicFeet: 25, weightLbs: 80 },

  // Bedroom
  { id: "bed-frame", label: "Bed frame", category: "bedroom", cubicFeet: 30, weightLbs: 100 },
  { id: "mattress", label: "Mattress", category: "bedroom", cubicFeet: 25, weightLbs: 80 },
  { id: "box-spring", label: "Box spring", category: "bedroom", cubicFeet: 20, weightLbs: 60 },
  { id: "nightstand", label: "Nightstand", category: "bedroom", cubicFeet: 8, weightLbs: 30 },
  { id: "dresser", label: "Dresser", category: "bedroom", cubicFeet: 40, weightLbs: 120 },
  { id: "chest", label: "Chest of drawers", category: "bedroom", cubicFeet: 30, weightLbs: 100 },
  { id: "mirror", label: "Mirror", category: "bedroom", cubicFeet: 6, weightLbs: 25 },

  // Dining
  { id: "dining-table", label: "Dining table", category: "dining", cubicFeet: 35, weightLbs: 120 },
  { id: "dining-chair", label: "Dining chair", category: "dining", cubicFeet: 6, weightLbs: 20 },
  { id: "buffet", label: "Buffet", category: "dining", cubicFeet: 40, weightLbs: 140, heavy: true },
  { id: "china-cabinet", label: "China cabinet", category: "dining", cubicFeet: 45, weightLbs: 160, heavy: true },

  // TVs (by screen size)
  { id: "tv-43", label: 'TV up to 43"', category: "tv", cubicFeet: 6, weightLbs: 20 },
  { id: "tv-55", label: 'TV 44–55"', category: "tv", cubicFeet: 9, weightLbs: 35 },
  { id: "tv-65", label: 'TV 56–65"', category: "tv", cubicFeet: 12, weightLbs: 50 },
  { id: "tv-75", label: 'TV 66–75"', category: "tv", cubicFeet: 16, weightLbs: 65 },
  { id: "tv-85", label: 'TV 76" and larger', category: "tv", cubicFeet: 22, weightLbs: 90, heavy: true },

  // Kitchen & appliances
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
  { id: "patio-table", label: "Patio table", category: "outdoor", cubicFeet: 25, weightLbs: 80 },
  { id: "patio-chair", label: "Patio chair", category: "outdoor", cubicFeet: 8, weightLbs: 20 },
  { id: "lounge-chair", label: "Lounge chair", category: "outdoor", cubicFeet: 18, weightLbs: 40 },
  { id: "grill", label: "Grill", category: "outdoor", cubicFeet: 25, weightLbs: 90 },
  { id: "umbrella", label: "Umbrella", category: "outdoor", cubicFeet: 8, weightLbs: 20 },

  // Boxes
  { id: "box-sm", label: "Small box", category: "boxes", cubicFeet: 1.5, weightLbs: 25 },
  { id: "box-md", label: "Medium box", category: "boxes", cubicFeet: 3, weightLbs: 45 },
  { id: "box-lg", label: "Large box", category: "boxes", cubicFeet: 4.5, weightLbs: 60 },
  { id: "wardrobe-box", label: "Wardrobe box (for hanging clothes)", category: "boxes", cubicFeet: 13, weightLbs: 40 },
];

export const CATEGORY_LABEL: Record<InventoryItem["category"], string> = {
  living: "Living room",
  bedroom: "Bedroom",
  dining: "Dining room",
  tv: "TVs",
  kitchen: "Kitchen & appliances",
  office: "Office",
  outdoor: "Outdoor",
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

// Truck size recommendation from cubic-feet capacity.
export function recommendTruck(cubicFeet: number): { size: string; capacityCuFt: number } {
  if (cubicFeet <= 350) return { size: "10 ft truck", capacityCuFt: 400 };
  if (cubicFeet <= 700) return { size: "16 ft truck", capacityCuFt: 800 };
  if (cubicFeet <= 1100) return { size: "20 ft truck", capacityCuFt: 1200 };
  if (cubicFeet <= 1500) return { size: "22 ft truck", capacityCuFt: 1600 };
  if (cubicFeet <= 2100) return { size: "26 ft truck", capacityCuFt: 2200 };
  return { size: "26 ft truck + trailer", capacityCuFt: 2800 };
}
