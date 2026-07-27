// Server-side Places API (New) access.
//
// Works both on Lovable (Google Maps connector gateway) and on any other host
// (direct Google call using GOOGLE_MAPS_SERVER_KEY) — see google-maps-transport.

import { mapsFetch, mapsTransportMode } from "./google-maps-transport.server";

export interface PlaceSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetailsResult {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  placeId: string;
}

export function placesConfigured(): boolean {
  return mapsTransportMode() !== "unavailable";
}

async function guard(resp: Response, label: string) {
  if (resp.ok) return;
  const body = await resp.text();
  console.error(`places ${label} failed [${resp.status}]: ${body}`);
  throw new Error(`Places ${label} failed [${resp.status}]`);
}

export async function autocompleteAddresses(
  input: string,
  bias?: { lat: number; lng: number; radius?: number } | null
): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ["us"],
  };
  if (bias) {
    body.locationBias = {
      circle: {
        center: { latitude: bias.lat, longitude: bias.lng },
        radius: bias.radius ?? 15000,
      },
    };
  }
  const resp = await mapsFetch("places/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await guard(resp, "autocomplete");

  const json = (await resp.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .map((p) => ({
      placeId: p.placeId!,
      text: p.text?.text ?? "",
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .slice(0, 6);
}

export async function placeDetailsById(placeId: string): Promise<PlaceDetailsResult | null> {
  const resp = await mapsFetch(`places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location",
    },
  });

  await guard(resp, "details");
  const p = (await resp.json()) as {
    id?: string;
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    addressComponents?: Array<{ longText?: string; shortText?: string; types: string[] }>;
  };
  const comps = p.addressComponents ?? [];
  const short = (t: string) => comps.find((c) => c.types.includes(t))?.shortText ?? "";
  const long = (t: string) => comps.find((c) => c.types.includes(t))?.longText ?? "";
  const streetAddress = [short("street_number"), long("route")].filter(Boolean).join(" ");
  return {
    formattedAddress: p.formattedAddress ?? "",
    streetAddress: streetAddress || (p.formattedAddress ?? ""),
    city:
      long("locality") ||
      long("sublocality") ||
      long("postal_town") ||
      long("administrative_area_level_2"),
    state: short("administrative_area_level_1"),
    zip: short("postal_code"),
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    placeId: p.id ?? placeId,
  };
}
