import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  autocompleteAddresses,
  placeDetailsById,
  type PlaceDetailsResult,
  type PlaceSuggestion,
} from "./places.server";

export type { PlaceDetailsResult, PlaceSuggestion };

const autocompleteInput = z.object({
  input: z.string().min(2).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
});

export const placesAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => autocompleteInput.parse(data))
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const bias =
      typeof data.lat === "number" && typeof data.lng === "number"
        ? { lat: data.lat, lng: data.lng, radius: data.radius }
        : null;
    try {
      return await autocompleteAddresses(data.input, bias);
    } catch {
      return [];
    }
  });

export const placeDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().min(1).max(400) }).parse(data))
  .handler(async ({ data }): Promise<PlaceDetailsResult | null> => {
    try {
      return await placeDetailsById(data.placeId);
    } catch {
      return null;
    }
  });
