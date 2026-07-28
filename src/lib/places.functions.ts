import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  autocompleteAddresses,
  placeDetailsById,
  placesConfigured,
  type PlaceDetailsResult,
  type PlaceSuggestion,
} from "./places.server";

export type { PlaceDetailsResult, PlaceSuggestion };

export interface AutocompleteResponse {
  suggestions: PlaceSuggestion[];
  /** Present when the lookup could not run — surfaced in the UI instead of an empty dropdown. */
  error?: "not_configured" | "request_failed";
}

export const placesAutocomplete = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        input: z.string().min(2).max(200),
        zip: z.string().regex(/^\d{5}$/).optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        radius: z.number().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<AutocompleteResponse> => {
    if (!placesConfigured()) {
      console.error(
        "[places] no server-side Google Maps credential available in this environment"
      );
      return { suggestions: [], error: "not_configured" };
    }
    const bias =
      typeof data.lat === "number" && typeof data.lng === "number"
        ? { lat: data.lat, lng: data.lng, radius: data.radius }
        : null;
    try {
      return { suggestions: await autocompleteAddresses(data.input, bias, data.zip) };
    } catch (e) {
      console.error("[places] autocomplete failed", e);
      return { suggestions: [], error: "request_failed" };
    }
  });

export const placeDetails = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ placeId: z.string().min(1).max(400) }).parse(data))
  .handler(async ({ data }): Promise<PlaceDetailsResult | null> => {
    if (!placesConfigured()) return null;
    try {
      return await placeDetailsById(data.placeId);
    } catch (e) {
      console.error("[places] details failed", e);
      return null;
    }
  });
