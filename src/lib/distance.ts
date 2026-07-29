// Distance API abstraction. Uses Google Routes server-side when configured and
// falls back to deterministic ZIP-centroid road estimates when unavailable.

import { haversineMiles, resolveZip, type ZipLocation } from "./zip-database";
import { computeDistanceFn } from "./distance.functions";

export interface DistanceResult {
  miles: number;
  durationMinutes: number;
  origin: ZipLocation;
  destination: ZipLocation;
  provider: "haversine" | "google-maps";
}

// Road distances typically exceed great-circle by ~18% in the US.
const ROAD_MULTIPLIER = 1.18;
// Rough highway average once distance exceeds 40 mi; urban crawl otherwise.
function estimateDuration(miles: number): number {
  if (miles < 40) return Math.round((miles / 25) * 60);
  return Math.round((40 / 25) * 60 + ((miles - 40) / 55) * 60);
}

export async function computeDistance(
  originZip: string,
  destinationZip: string,
  originCoords?: { lat: number; lng: number } | null,
  destinationCoords?: { lat: number; lng: number } | null,
): Promise<DistanceResult | null> {
  try {
    const precise = await computeDistanceFn({
      data: {
        originZip,
        destinationZip,
        originCoords: originCoords ?? null,
        destinationCoords: destinationCoords ?? null,
      },
    });
    if (precise) return precise;
  } catch (error) {
    console.error("server distance failed", error);
  }

  const [originZipLoc, destinationZipLoc] = await Promise.all([
    resolveZip(originZip),
    resolveZip(destinationZip),
  ]);
  if (!originZipLoc || !destinationZipLoc) return null;

  // Prefer precise coords from Google Places when available; fall back to ZIP centroid.
  const origin = originCoords
    ? { ...originZipLoc, lat: originCoords.lat, lng: originCoords.lng }
    : originZipLoc;
  const destination = destinationCoords
    ? { ...destinationZipLoc, lat: destinationCoords.lat, lng: destinationCoords.lng }
    : destinationZipLoc;

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
