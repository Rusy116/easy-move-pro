// ZIP → city/state/coords resolution backed by live Google Geocoding (via the
// Google Maps Platform connector, server-side). No hardcoded ZIP tables: the
// ZIP is resolved against real Google data and cached per session.

import { lookupZipCities } from "./zip-cities";

export interface ZipLocation {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

const cache = new Map<string, ZipLocation | null>();
const inflight = new Map<string, Promise<ZipLocation | null>>();

/** Resolve a ZIP to its real city, state and coordinates using Google Geocoding. */
export async function resolveZip(zip: string): Promise<ZipLocation | null> {
  if (!isValidZip(zip)) return null;
  if (cache.has(zip)) return cache.get(zip)!;

  const existing = inflight.get(zip);
  if (existing) return existing;

  const promise = lookupZipCities(zip)
    .then((res) => {
      const loc: ZipLocation | null = res
        ? { zip: res.zip, city: res.primary, state: res.state, lat: res.lat, lng: res.lng }
        : null;
      cache.set(zip, loc);
      return loc;
    })
    .catch(() => null)
    .finally(() => inflight.delete(zip));

  inflight.set(zip, promise);
  return promise;
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
