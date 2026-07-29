// Server-side Places API (New) access.
//
// Works both on Lovable (Google Maps connector gateway) and on any other host
// (direct Google call using GOOGLE_MAPS_SERVER_KEY) — see google-maps-transport.

import { mapsFetch, mapsTransportMode } from "./google-maps-transport.server";
import { resolveZipCities } from "./zip-cities.server";

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
  bias?: { lat: number; lng: number; radius?: number } | null,
  zip?: string,
): Promise<PlaceSuggestion[]> {
  const zipContext = zip ? await resolveZipCities(zip).catch(() => null) : null;
  const scopedInput = zipContext
    ? `${input}, ${zipContext.primary}, ${zipContext.state} ${zipContext.zip}`
    : input;
  const body: Record<string, unknown> = {
    input: scopedInput,
    includedRegionCodes: ["us"],
  };

  if (zipContext?.lat && zipContext.lng) {
    body.locationRestriction = {
      circle: {
        center: { latitude: zipContext.lat, longitude: zipContext.lng },
        radius: Math.max(8000, Math.min(bias?.radius ?? 15000, 25000)),
      },
    };
  } else if (bias) {
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
  const mappedSuggestions = (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .map((p) => ({
      placeId: p.placeId ?? "",
      text: p.text?.text ?? "",
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((s) => s.placeId);

  const textScopedSuggestions = zipContext
    ? mappedSuggestions.filter((s) => {
        const hay = `${s.text} ${s.mainText} ${s.secondaryText}`.toLowerCase();
        const state = zipContext.state.toLowerCase();
        const cityMatches = zipContext.cities.some((city) => hay.includes(city.toLowerCase()));
        return cityMatches && (!state || hay.includes(state));
      })
    : mappedSuggestions;

  const suggestions = (textScopedSuggestions.length > 0 ? textScopedSuggestions : mappedSuggestions)
    .sort((a, b) => {
      if (!zipContext) return 0;
      const hayA = `${a.text} ${a.mainText} ${a.secondaryText}`.toLowerCase();
      const hayB = `${b.text} ${b.mainText} ${b.secondaryText}`.toLowerCase();
      const city = zipContext.primary.toLowerCase();
      const state = zipContext.state.toLowerCase();
      const score = (hay: string) =>
        (hay.includes(city) ? 2 : 0) + (state && hay.includes(state) ? 1 : 0);
      return score(hayB) - score(hayA);
    })
    .slice(0, 6);

  if (zipContext && mappedSuggestions.length > 0 && textScopedSuggestions.length === 0) {
    console.warn(
      `[places] ZIP-restricted suggestions for ${zipContext.zip} did not include city/state text; using provider-restricted results`,
    );
  } else if (zipContext && suggestions.length === 0) {
    console.warn(
      `[places] no ZIP-scoped autocomplete suggestions for ${zipContext.zip} (${zipContext.cities.join(", ")}, ${zipContext.state})`,
    );
  }

  return suggestions;
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
