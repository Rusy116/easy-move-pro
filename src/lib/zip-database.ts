// Local ZIP → city/state lookup for common US metros used by the instant quote calculator.
// Real deployments will proxy to a ZIP/geocoding API (Google Maps, USPS, Zippopotam).
// The `resolveZip` function is async so the future API swap is a drop-in replacement.

export interface ZipLocation {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// A small but representative set of US ZIPs across metros. First-digit fallback below.
const ZIPS: ZipLocation[] = [
  { zip: "10001", city: "New York", state: "NY", lat: 40.7506, lng: -73.9972 },
  { zip: "10011", city: "New York", state: "NY", lat: 40.7419, lng: -74.0007 },
  { zip: "11201", city: "Brooklyn", state: "NY", lat: 40.6959, lng: -73.9903 },
  { zip: "07030", city: "Hoboken", state: "NJ", lat: 40.7439, lng: -74.0324 },
  { zip: "02108", city: "Boston", state: "MA", lat: 42.3583, lng: -71.0603 },
  { zip: "02139", city: "Cambridge", state: "MA", lat: 42.3648, lng: -71.1044 },
  { zip: "20001", city: "Washington", state: "DC", lat: 38.9109, lng: -77.0163 },
  { zip: "22201", city: "Arlington", state: "VA", lat: 38.8871, lng: -77.0947 },
  { zip: "19103", city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1739 },
  { zip: "30303", city: "Atlanta", state: "GA", lat: 33.7525, lng: -84.3888 },
  { zip: "33139", city: "Miami Beach", state: "FL", lat: 25.7825, lng: -80.134 },
  { zip: "33101", city: "Miami", state: "FL", lat: 25.7743, lng: -80.1937 },
  { zip: "32801", city: "Orlando", state: "FL", lat: 28.5427, lng: -81.3789 },
  { zip: "60601", city: "Chicago", state: "IL", lat: 41.8858, lng: -87.6181 },
  { zip: "44113", city: "Cleveland", state: "OH", lat: 41.4844, lng: -81.7015 },
  { zip: "48226", city: "Detroit", state: "MI", lat: 42.3299, lng: -83.0466 },
  { zip: "55401", city: "Minneapolis", state: "MN", lat: 44.9848, lng: -93.2708 },
  { zip: "63101", city: "St. Louis", state: "MO", lat: 38.6297, lng: -90.1927 },
  { zip: "78701", city: "Austin", state: "TX", lat: 30.2711, lng: -97.7437 },
  { zip: "75201", city: "Dallas", state: "TX", lat: 32.7876, lng: -96.7994 },
  { zip: "77002", city: "Houston", state: "TX", lat: 29.7563, lng: -95.3628 },
  { zip: "73102", city: "Oklahoma City", state: "OK", lat: 35.4696, lng: -97.5195 },
  { zip: "80202", city: "Denver", state: "CO", lat: 39.7491, lng: -104.9997 },
  { zip: "84101", city: "Salt Lake City", state: "UT", lat: 40.7573, lng: -111.8944 },
  { zip: "85004", city: "Phoenix", state: "AZ", lat: 33.4507, lng: -112.0693 },
  { zip: "87501", city: "Santa Fe", state: "NM", lat: 35.6779, lng: -105.9394 },
  { zip: "89101", city: "Las Vegas", state: "NV", lat: 36.1751, lng: -115.1401 },
  { zip: "90001", city: "Los Angeles", state: "CA", lat: 33.9731, lng: -118.2479 },
  { zip: "90210", city: "Beverly Hills", state: "CA", lat: 34.0901, lng: -118.4065 },
  { zip: "94103", city: "San Francisco", state: "CA", lat: 37.7726, lng: -122.4099 },
  { zip: "95101", city: "San Jose", state: "CA", lat: 37.3382, lng: -121.8863 },
  { zip: "92101", city: "San Diego", state: "CA", lat: 32.7175, lng: -117.1628 },
  { zip: "97205", city: "Portland", state: "OR", lat: 45.5222, lng: -122.6852 },
  { zip: "98101", city: "Seattle", state: "WA", lat: 47.6106, lng: -122.3358 },
  { zip: "99501", city: "Anchorage", state: "AK", lat: 61.2181, lng: -149.9003 },
  { zip: "96813", city: "Honolulu", state: "HI", lat: 21.3099, lng: -157.8581 },
];

const BY_ZIP = new Map(ZIPS.map((z) => [z.zip, z]));

// Approximate centroids by ZIP first digit — used only when no exact match.
const REGION: Record<string, { city: string; state: string; lat: number; lng: number }> = {
  "0": { city: "Boston", state: "MA", lat: 42.36, lng: -71.06 },
  "1": { city: "New York", state: "NY", lat: 40.75, lng: -74.0 },
  "2": { city: "Washington", state: "DC", lat: 38.9, lng: -77.03 },
  "3": { city: "Atlanta", state: "GA", lat: 33.75, lng: -84.39 },
  "4": { city: "Columbus", state: "OH", lat: 39.96, lng: -83.0 },
  "5": { city: "Minneapolis", state: "MN", lat: 44.98, lng: -93.27 },
  "6": { city: "Chicago", state: "IL", lat: 41.88, lng: -87.63 },
  "7": { city: "Houston", state: "TX", lat: 29.76, lng: -95.37 },
  "8": { city: "Denver", state: "CO", lat: 39.74, lng: -104.99 },
  "9": { city: "Los Angeles", state: "CA", lat: 34.05, lng: -118.24 },
};

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Async so this can be swapped for a Google Maps / USPS call later
 * without touching the calculator UI.
 */
export async function resolveZip(zip: string): Promise<ZipLocation | null> {
  if (!isValidZip(zip)) return null;
  const exact = BY_ZIP.get(zip);
  if (exact) return exact;
  const region = REGION[zip[0]];
  if (!region) return null;
  return { zip, city: region.city, state: region.state, lat: region.lat, lng: region.lng };
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
