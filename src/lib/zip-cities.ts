// Client-side ZIP → city list using Google Maps Geocoder (Maps JS API).
// Uses `postcode_localities` when the ZIP spans multiple cities, otherwise
// falls back to the single locality returned by the geocoder.

import { loadGoogleMaps } from "./google-maps-loader";

export interface ZipCitiesResult {
  zip: string;
  state: string;
  cities: string[];
  lat: number;
  lng: number;
}

export async function lookupZipCities(zip: string): Promise<ZipCitiesResult | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  try {
    const g = await loadGoogleMaps();
    await g.maps.importLibrary("geocoding");
    const geocoder = new g.maps.Geocoder();
    const { results } = await geocoder.geocode({
      componentRestrictions: { country: "US", postalCode: zip },
    });
    if (!results || results.length === 0) return null;
    const r = results[0];
    const comps = r.address_components ?? [];
    const state =
      comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ?? "";
    const locality =
      comps.find((c) => c.types.includes("locality"))?.long_name ||
      comps.find((c) => c.types.includes("sublocality"))?.long_name ||
      comps.find((c) => c.types.includes("postal_town"))?.long_name ||
      "";
    // `postcode_localities` is present when a ZIP covers several localities.
    const many = (r as unknown as { postcode_localities?: string[] }).postcode_localities;
    const cities = many && many.length > 0 ? many : locality ? [locality] : [];
    const loc = r.geometry?.location;
    return {
      zip,
      state,
      cities: Array.from(new Set(cities)),
      lat: loc ? loc.lat() : 0,
      lng: loc ? loc.lng() : 0,
    };
  } catch {
    return null;
  }
}
