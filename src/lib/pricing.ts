// Local pricing engine used by the instant quote calculator.
// Pure function — safe to run on the client. Server can validate the same way.

export interface QuoteInput {
  originZip: string;
  destinationZip: string;
  propertyType: "studio" | "apartment" | "house" | "office";
  bedrooms: number;
  floor: number;
  elevator: boolean;
  packing: boolean;
  storage: boolean;
  assembly: boolean;
  heavyItems: boolean;
  longCarry: boolean;
}

export interface QuoteEstimate {
  low: number;
  high: number;
  breakdown: { label: string; amount: number }[];
  distanceMiles: number;
}

// Approximate US ZIP centroids by first digit — good enough for an instant estimate.
const ZIP_REGION: Record<string, [number, number]> = {
  "0": [42.36, -71.06], "1": [40.75, -74.0], "2": [38.9, -77.03], "3": [33.75, -84.39],
  "4": [39.96, -83.0], "5": [44.98, -93.27], "6": [41.88, -87.63], "7": [29.76, -95.37],
  "8": [39.74, -104.99], "9": [34.05, -118.24],
};

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function estimateDistance(originZip: string, destZip: string): number {
  const a = ZIP_REGION[originZip[0]];
  const b = ZIP_REGION[destZip[0]];
  if (!a || !b) return 25;
  const d = haversine(a, b);
  return d < 15 ? 25 : Math.round(d);
}

const PROPERTY_BASE = { studio: 500, apartment: 700, house: 1100, office: 1300 } as const;
const PER_BEDROOM = 220;

export function computeEstimate(input: QuoteInput): QuoteEstimate {
  const distanceMiles = estimateDistance(input.originZip, input.destinationZip);

  const base = PROPERTY_BASE[input.propertyType] + input.bedrooms * PER_BEDROOM;
  const mileage =
    distanceMiles <= 50
      ? distanceMiles * 4
      : 200 + Math.max(0, distanceMiles - 50) * 1.35;

  const floorSurcharge = !input.elevator && input.floor > 1 ? (input.floor - 1) * 60 : 0;

  const breakdown: { label: string; amount: number }[] = [
    { label: "Base labor & truck", amount: Math.round(base) },
    { label: `Mileage (${distanceMiles} mi)`, amount: Math.round(mileage) },
  ];
  if (floorSurcharge) breakdown.push({ label: "Stair carry", amount: floorSurcharge });
  if (input.packing) breakdown.push({ label: "Full packing service", amount: 350 });
  if (input.storage) breakdown.push({ label: "30-day storage", amount: 220 });
  if (input.assembly) breakdown.push({ label: "Furniture assembly", amount: 140 });
  if (input.heavyItems) breakdown.push({ label: "Heavy items (piano/safe)", amount: 260 });
  if (input.longCarry) breakdown.push({ label: "Long carry", amount: 120 });

  const subtotal = breakdown.reduce((s, b) => s + b.amount, 0);
  return {
    low: Math.round(subtotal * 0.92),
    high: Math.round(subtotal * 1.15),
    breakdown,
    distanceMiles,
  };
}

// Naïve ZIP → city map for common metros. Real integration would call a ZIP API.
export const ZIP_CITY: Record<string, string> = {
  "10001": "New York, NY",
  "10011": "New York, NY",
  "11201": "Brooklyn, NY",
  "90210": "Beverly Hills, CA",
  "94103": "San Francisco, CA",
  "60601": "Chicago, IL",
  "78701": "Austin, TX",
  "33139": "Miami Beach, FL",
  "98101": "Seattle, WA",
  "02108": "Boston, MA",
  "20001": "Washington, DC",
  "30303": "Atlanta, GA",
  "80202": "Denver, CO",
  "85004": "Phoenix, AZ",
  "97205": "Portland, OR",
};

export function lookupCity(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return ZIP_CITY[zip] ?? null;
}
