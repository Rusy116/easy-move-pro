// ZIP → city list via server-side Google Geocoding. Browser keys are not used
// for Geocoding; Preview uses the connector gateway, Production uses its own
// GOOGLE_MAPS_SERVER_KEY.

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
