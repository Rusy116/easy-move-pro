import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, serviceSchema } from "@/lib/seo/schema";
import { ROBOTS_META } from "@/lib/seo-config";
import { landingPathFor, moversPathFor } from "@/lib/city-landing/data";
import { findCounty, parseCountyParam } from "@/lib/city-landing/hierarchy";

/**
 * County hub — step 7 of the City Factory hierarchy. Every city links up to
 * its county, and the county links back down to every city, so no generated
 * page can ever be orphaned.
 */
export const Route = createFileRoute("/counties/$county")({
  loader: ({ params }) => {
    const parsed = parseCountyParam(params.county);
    const node = parsed ? findCounty(parsed.countySlug, parsed.stateCode) : null;
    if (!node) throw notFound();
    return { node };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "County not found" }, { name: "robots", content: "noindex" }] };
    const { node } = loaderData;
    const path = `/counties/${params.county}`;
    const title = `Movers in ${node.name}, ${node.stateCode} — Moving Companies & Instant Quotes`;
    const description = `Licensed moving companies across ${node.name}, ${node.stateName}. Compare instant, itemized moving quotes for ${node.cities.length} cities in the county.`;
    return {
      meta: [...seoMeta({ title, description, path }), ...ROBOTS_META],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(serviceSchema({ name: `Moving services in ${node.name}`, description, areaServed: `${node.name}, ${node.stateCode}` })),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: node.stateName, url: `/states/${node.stateSlug}` },
            { name: node.name, url: path },
          ]),
        ),
      ],
    };
  },
  component: CountyHub,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">County not found</h1>
        <Link to="/cities" className="mt-6 inline-block text-primary underline">
          Browse all cities
        </Link>
      </div>
    </SiteLayout>
  ),
});

function CountyHub() {
  const { node } = Route.useLoaderData();

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: node.stateName, to: `/states/${node.stateSlug}` },
          { label: node.name },
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight">
          Movers in {node.name}, {node.stateCode}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          Easy Moving covers {node.cities.length} {node.cities.length === 1 ? "city" : "cities"} across{" "}
          {node.name} with licensed, insured crews and instant itemized pricing. Pick your city for a
          local moving calculator and a verified local moving company.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {node.cities.map((c) => (
            <div key={`${c.slug}-${c.stateCode}`} className="rounded-2xl border border-border p-5">
              <h2 className="font-serif text-xl font-semibold">
                {c.name}, {c.stateCode}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Population {c.population.toLocaleString()}
              </p>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link to={moversPathFor(c.slug, c.stateCode) as "/"} className="text-primary underline">
                  Movers in {c.name}
                </Link>
                <Link to={landingPathFor(c.slug, c.stateCode) as "/"} className="text-primary underline">
                  {c.name} moving calculator
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <InternalLinks
        title={`More moving resources in ${node.stateName}`}
        links={[
          { label: `Moving services in ${node.stateName}`, to: `/states/${node.stateSlug}` },
          { label: "All U.S. moving calculators", to: "/cities" },
          { label: "HTML sitemap", to: "/sitemap" },
          { label: "Our moving services", to: "/services" },
        ]}
      />
      <Cta />
    </SiteLayout>
  );
}
