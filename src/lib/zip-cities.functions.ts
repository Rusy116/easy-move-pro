import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const lookupZipCitiesFn = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ zip: z.string().regex(/^\d{5}$/) }).parse(data))
  .handler(async ({ data }): Promise<ZipCitiesResult | null> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !connKey) return null;
    const url =
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json` +
      `?components=${encodeURIComponent(`country:US|postal_code:${data.zip}`)}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
      },
    });
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
    const cities = many && many.length > 0 ? many : locality ? [locality] : [];
    const loc = r.geometry?.location;
    return {
      zip: data.zip,
      state,
      cities: Array.from(new Set(cities)),
      lat: loc?.lat ?? 0,
      lng: loc?.lng ?? 0,
    };
  });
