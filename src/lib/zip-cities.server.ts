// Server-side ZIP → city/state resolution.
// Primary source: Google Geocoding (through the Lovable Google Maps connector).
// Fallback: Zippopotam (keyless, public) so the ZIP is always the source of truth.

export interface ZipCitiesResult {
  zip: string;
  state: string;
  /** Primary (preferred) city for this ZIP — always one of `cities` when present. */
  primary: string;
  cities: string[];
  lat: number;
  lng: number;
}

interface GeocodeComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: GeocodeComponent[];
  postcode_localities?: string[];
  geometry?: { location?: { lat: number; lng: number } };
}

async function viaGoogle(zip: string): Promise<ZipCitiesResult | null> {
  if (mapsTransportMode() === "unavailable") return null;
  const resp = await mapsFetch(
    `maps/api/geocode/json?components=${encodeURIComponent(`country:US|postal_code:${zip}`)}`
  );
  if (!resp.ok) {
    console.error("zip geocode failed", resp.status, await resp.text());
    return null;
  }

  const body = (await resp.json()) as { status: string; results: GeocodeResult[] };
  if (body.status !== "OK" || !body.results?.length) return null;
  const r = body.results[0];
  const comps = r.address_components ?? [];
  const state =
    comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ?? "";
  const locality =
    comps.find((c) => c.types.includes("locality"))?.long_name ||
    comps.find((c) => c.types.includes("sublocality"))?.long_name ||
    comps.find((c) => c.types.includes("postal_town"))?.long_name ||
    "";
  const many = r.postcode_localities;
  const list = many && many.length > 0 ? many : locality ? [locality] : [];
  const cities = Array.from(new Set(list));
  if (!cities.length) return null;
  const primary = locality && cities.includes(locality) ? locality : cities[0];
  const loc = r.geometry?.location;
  return {
    zip,
    state,
    primary,
    cities,
    lat: loc?.lat ?? 0,
    lng: loc?.lng ?? 0,
  };
}

interface ZippoPlace {
  "place name": string;
  latitude: string;
  longitude: string;
  "state abbreviation": string;
}

async function viaZippopotam(zip: string): Promise<ZipCitiesResult | null> {
  try {
    const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!resp.ok) return null;
    const body = (await resp.json()) as { places?: ZippoPlace[] };
    const places = body.places ?? [];
    if (!places.length) return null;
    const cities = Array.from(new Set(places.map((p) => p["place name"])));
    return {
      zip,
      state: places[0]["state abbreviation"] ?? "",
      primary: cities[0],
      cities,
      lat: Number(places[0].latitude) || 0,
      lng: Number(places[0].longitude) || 0,
    };
  } catch (e) {
    console.error("zippopotam lookup failed", e);
    return null;
  }
}

export async function resolveZipCities(zip: string): Promise<ZipCitiesResult | null> {
  const google = await viaGoogle(zip).catch((e) => {
    console.error("google zip lookup threw", e);
    return null;
  });
  if (google) return google;
  return viaZippopotam(zip);
}
