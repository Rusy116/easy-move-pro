// ZIP → city/state/coords resolution backed by live Google Geocoding (via the
// Google Maps Platform connector, server-side). No hardcoded ZIP tables: the
// ZIP is resolved against real Google data.
//
// Caching and request de-duplication live in `zip-cities.ts` — this module is a
// thin projection of that single lookup into a flat location shape.

import { lookupZipCities, isValidZipFormat } from "./zip-cities";

export interface ZipLocation {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export function isValidZip(zip: string): boolean {
  return isValidZipFormat(zip);
}

/** Resolve a ZIP to its real city, state and coordinates using Google Geocoding. */
export async function resolveZip(zip: string): Promise<ZipLocation | null> {
  const res = await lookupZipCities(zip);
  if (!res) return null;
  return { zip: res.zip, city: res.primary, state: res.state, lat: res.lat, lng: res.lng };
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
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
