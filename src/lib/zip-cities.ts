// ZIP → city list via server-side Google Geocoding. Browser keys are not used
// for Geocoding; Preview uses the connector gateway, Production uses its own
// GOOGLE_MAPS_SERVER_KEY.
//
// Single source of truth for ZIP resolution in the browser: every caller goes
// through `lookupZipCities`, which de-duplicates concurrent requests and caches
// results for the session (the calculator resolves the same ZIP from several
// places at once).

import { lookupZipCitiesFn, type ZipCitiesResult } from "./zip-cities.functions";

export type { ZipCitiesResult };

export function isValidZipFormat(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

const cache = new Map<string, ZipCitiesResult | null>();
const inflight = new Map<string, Promise<ZipCitiesResult | null>>();

export async function lookupZipCities(zip: string): Promise<ZipCitiesResult | null> {
  if (!isValidZipFormat(zip)) return null;
  if (cache.has(zip)) return cache.get(zip)!;

  const existing = inflight.get(zip);
  if (existing) return existing;

  const promise = lookupZipCitiesFn({ data: { zip } })
    .then((res) => {
      // Only cache resolvable answers and definitive "no such ZIP" answers.
      cache.set(zip, res ?? null);
      return res ?? null;
    })
    .catch((e) => {
      console.error("lookupZipCities failed", e);
      return null;
    })
    .finally(() => inflight.delete(zip));

  inflight.set(zip, promise);
  return promise;
}
