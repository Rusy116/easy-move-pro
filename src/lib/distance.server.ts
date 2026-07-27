import { haversineMiles, resolveZip, type ZipLocation } from "./zip-database";
import { mapsFetch, mapsTransportMode } from "./google-maps-transport.server";
import { resolveZipCities } from "./zip-cities.server";

export interface ServerDistanceResult {
  miles: number;
  durationMinutes: number;
  origin: ZipLocation;
  destination: ZipLocation;
  provider: "haversine" | "google-maps";
}

const ROAD_MULTIPLIER = 1.18;

function estimateDuration(miles: number): number {
  if (miles < 40) return Math.round((miles / 25) * 60);
  return Math.round((40 / 25) * 60 + ((miles - 40) / 55) * 60);
}

async function zipLocation(zip: string): Promise<ZipLocation | null> {
  const [zipCities, fallback] = await Promise.all([
    resolveZipCities(zip).catch(() => null),
    resolveZip(zip),
  ]);

  if (zipCities) {
    return {
      zip: zipCities.zip,
      city: zipCities.primary,
      state: zipCities.state,
      lat: zipCities.lat,
      lng: zipCities.lng,
    };
  }

  return fallback;
}

function approximateDistance(origin: ZipLocation, destination: ZipLocation): ServerDistanceResult {
  const straight = haversineMiles(origin, destination);
  const miles = Math.max(3, Math.round(straight * ROAD_MULTIPLIER));

  return {
    miles,
    durationMinutes: estimateDuration(miles),
    origin,
    destination,
    provider: "haversine",
  };
}

async function googleDrivingDistance(
  origin: ZipLocation,
  destination: ZipLocation
): Promise<Pick<ServerDistanceResult, "miles" | "durationMinutes" | "provider"> | null> {
  if (mapsTransportMode() === "unavailable") return null;

  const response = await mapsFetch("routes/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      computeAlternativeRoutes: false,
      units: "IMPERIAL",
    }),
  });

  if (!response.ok) {
    console.error(`routes distance failed [${response.status}]: ${await response.text()}`);
    return null;
  }

  const data = (await response.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const route = data.routes?.[0];
  if (!route?.distanceMeters) return null;

  const seconds = Number(route.duration?.replace("s", "")) || 0;
  return {
    miles: Math.max(1, Math.round(route.distanceMeters / 1609.344)),
    durationMinutes: seconds > 0 ? Math.round(seconds / 60) : estimateDuration(route.distanceMeters / 1609.344),
    provider: "google-maps",
  };
}

export async function computeServerDistance(
  originZip: string,
  destinationZip: string,
  originCoords?: { lat: number; lng: number } | null,
  destinationCoords?: { lat: number; lng: number } | null
): Promise<ServerDistanceResult | null> {
  const [originZipLoc, destinationZipLoc] = await Promise.all([
    zipLocation(originZip),
    zipLocation(destinationZip),
  ]);
  if (!originZipLoc || !destinationZipLoc) return null;

  const origin = originCoords
    ? { ...originZipLoc, lat: originCoords.lat, lng: originCoords.lng }
    : originZipLoc;
  const destination = destinationCoords
    ? { ...destinationZipLoc, lat: destinationCoords.lat, lng: destinationCoords.lng }
    : destinationZipLoc;

  const google = await googleDrivingDistance(origin, destination).catch((error) => {
    console.error("google routes distance threw", error);
    return null;
  });

  if (google) return { ...google, origin, destination };
  return approximateDistance(origin, destination);
}
