// Distance API abstraction. Today: haversine over ZIP centroids + a road-distance
// multiplier. Tomorrow: swap in Google Maps Distance Matrix via the Google Maps
// connector without touching the calculator UI.

import { haversineMiles, resolveZip, type ZipLocation } from "./zip-database";

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
  destinationZip: string
): Promise<DistanceResult | null> {
  const [origin, destination] = await Promise.all([
    resolveZip(originZip),
    resolveZip(destinationZip),
  ]);
  if (!origin || !destination) return null;

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
