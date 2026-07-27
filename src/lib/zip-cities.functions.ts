import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveZipCities, type ZipCitiesResult } from "./zip-cities.server";

export type { ZipCitiesResult };

export const lookupZipCitiesFn = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ zip: z.string().regex(/^\d{5}$/) }).parse(data))
  .handler(async ({ data }): Promise<ZipCitiesResult | null> => resolveZipCities(data.zip));
