// ---------------------------------------------------------------------------
// Public (unauthenticated) server functions for the city page network.
// Route loaders call these — they must never touch the bundled static city
// list or an admin Supabase client.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";

export const getCityPageData = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({
    slug: String(input.slug ?? "").toLowerCase().trim(),
  }))
  .handler(async ({ data }) => {
    const { readCityPage, readCitiesByState } = await import("./public-read.server");
    const { factsFromRow, contentFromRow, seoFromRow } = await import("./record-adapter");
    const { buildCityHierarchy } = await import("./hierarchy");
    const { resolveCityHero } = await import("./media");

    const row = await readCityPage(data.slug);
    if (!row) return null;

    const facts = factsFromRow(row);
    const content = contentFromRow(row, facts);
    const seo = seoFromRow(row, facts, content);
    const peers = (await readCitiesByState(facts.stateCode, 400))
      .filter((p) => p.slug !== row.slug)
      .map((p) => ({
        slug: p.slug.replace(new RegExp(`-${p.stateCode.toLowerCase()}$`), ""),
        name: p.city,
        stateCode: p.stateCode,
        population: p.population,
        county: p.county,
      }));

    return {
      facts,
      content,
      seo,
      hero: resolveCityHero(row.media, facts),
      hierarchy: buildCityHierarchy(facts, peers),
      seoPublished: row.seo_status === "published",
    };
  });


export const listPublishedCityPages = createServerFn({ method: "GET" })
  .inputValidator((input: { stateCode?: string; limit?: number; offset?: number }) => ({
    stateCode: input?.stateCode ? String(input.stateCode).toUpperCase() : undefined,
    limit: Math.min(Math.max(Number(input?.limit ?? 200), 1), 500),
    offset: Math.max(Number(input?.offset ?? 0), 0),
  }))
  .handler(async ({ data }) => {
    const { readCitiesByState, readPublishedCities, countPublishedCities } = await import(
      "./public-read.server"
    );
    const cities = data.stateCode
      ? await readCitiesByState(data.stateCode, data.limit)
      : await readPublishedCities(data.limit, data.offset);
    return { cities, total: await countPublishedCities() };
  });

export const listCitySitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { readAllPublishedSlugs } = await import("./public-read.server");
  return await readAllPublishedSlugs();
});
