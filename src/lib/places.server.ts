// Server-side Places API (New) access through the Lovable Google Maps connector
// gateway. Used as a fallback when the browser-side Maps JS Places request is
// blocked (e.g. the managed browser key is referrer-restricted on this origin).

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

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

function keys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !connKey) return null;
  return { lovableKey, connKey };
}

function gatewayHeaders(extra: Record<string, string> = {}) {
  const k = keys()!;
  return {
    Authorization: `Bearer ${k.lovableKey}`,
    "X-Connection-Api-Key": k.connKey,
    "Content-Type": "application/json",
    ...extra,
  };
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
  if (!keys()) return [];
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
  const resp = await fetch(`${GATEWAY}/places/v1/places:autocomplete`, {
    method: "POST",
    headers: gatewayHeaders(),
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
  if (!keys()) return null;
  const resp = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: gatewayHeaders({
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location",
    }),
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
