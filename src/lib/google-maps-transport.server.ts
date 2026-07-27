// Single server-side transport for all Google Maps Platform calls.
//
// Two modes, picked automatically at call time:
//
//  1. "gateway"  — running on Lovable, where the Google Maps connector injects
//                  LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY. Requests go through
//                  connector-gateway.lovable.dev.
//  2. "direct"   — running anywhere else (self-hosted, Vercel, Netlify…), where
//                  the connector env vars do not exist. Requests go straight to
//                  Google using GOOGLE_MAPS_SERVER_KEY provided by the operator.
//
// This is what makes the calculator behave identically outside the Lovable
// preview: previously the server fallback silently no-op'd off-platform because
// only the gateway path existed.

const GATEWAY_ORIGIN = "https://connector-gateway.lovable.dev/google_maps";

const SUB_API_HOSTS: Record<string, string> = {
  places: "https://places.googleapis.com",
  routes: "https://routes.googleapis.com",
  airquality: "https://airquality.googleapis.com",
  weather: "https://weather.googleapis.com",
  pollen: "https://pollen.googleapis.com",
};

export type MapsTransportMode = "gateway" | "direct" | "unavailable";

export function mapsTransportMode(): MapsTransportMode {
  if (process.env.LOVABLE_API_KEY && process.env.GOOGLE_MAPS_API_KEY) return "gateway";
  if (process.env.GOOGLE_MAPS_SERVER_KEY) return "direct";
  return "unavailable";
}

/** Thrown when no usable server-side Google Maps credential is configured. */
export class MapsNotConfiguredError extends Error {
  constructor() {
    super(
      "Google Maps is not configured on this server. Set GOOGLE_MAPS_SERVER_KEY " +
        "(an unrestricted or IP-restricted Google Maps API key) in the deployment environment."
    );
    this.name = "MapsNotConfiguredError";
  }
}

/**
 * `path` is the provider path without a leading slash, e.g.
 *   "places/v1/places:autocomplete" or "maps/api/geocode/json?..."
 */
export async function mapsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const mode = mapsTransportMode();
  if (mode === "unavailable") throw new MapsNotConfiguredError();

  const headers = new Headers(init.headers);

  if (mode === "gateway") {
    headers.set("Authorization", `Bearer ${process.env.LOVABLE_API_KEY!}`);
    headers.set("X-Connection-Api-Key", process.env.GOOGLE_MAPS_API_KEY!);
    return fetch(`${GATEWAY_ORIGIN}/${path}`, { ...init, headers });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY!;
  const prefix = path.split("/")[0];
  const host = SUB_API_HOSTS[prefix] ?? "https://maps.googleapis.com";
  const rest = SUB_API_HOSTS[prefix] ? path.slice(prefix.length + 1) : path;
  const url = new URL(`${host}/${rest}`);
  // New-style APIs take the key as a header; legacy ones as a query param.
  if (SUB_API_HOSTS[prefix]) headers.set("X-Goog-Api-Key", key);
  else url.searchParams.set("key", key);

  return fetch(url.toString(), { ...init, headers });
}
