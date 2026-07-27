import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeServerDistance, type ServerDistanceResult } from "./distance.server";

const distanceInput = z.object({
  originZip: z.string().regex(/^\d{5}$/),
  destinationZip: z.string().regex(/^\d{5}$/),
  originCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  destinationCoords: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

export const computeDistanceFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => distanceInput.parse(data))
  .handler(async ({ data }): Promise<ServerDistanceResult | null> =>
    computeServerDistance(
      data.originZip,
      data.destinationZip,
      data.originCoords ?? null,
      data.destinationCoords ?? null
    )
  );
