// ZIP → city list via server-side Google Geocoding (through the Lovable
// Google Maps connector gateway). The browser key is not authorized for
// Geocoding, so this call must happen server-side.

import { lookupZipCitiesFn, type ZipCitiesResult } from "./zip-cities.functions";

export type { ZipCitiesResult };

export async function lookupZipCities(zip: string): Promise<ZipCitiesResult | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    return await lookupZipCitiesFn({ data: { zip } });
  } catch (e) {
    console.error("lookupZipCities failed", e);
    return null;
  }
}
