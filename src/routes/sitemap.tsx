import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema } from "@/lib/seo/schema";
import { ROBOTS_META } from "@/lib/seo-config";
import { GEO_STATES } from "@/lib/seo/geo";
import { landingPathFor, moversPathFor } from "@/lib/city-landing/data";
import { allCounties } from "@/lib/city-landing/hierarchy";

/**
 * HTML sitemap (step 8). Guarantees a crawlable path from the USA hub down to
 * every state, county, city SEO page and city calculator — no orphan pages.
 */
export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      ...seoMeta({
        title: "HTML Sitemap — Every City Moving Calculator | Easy Moving",
        description:
          "Browse every Easy Moving page: states, counties, city moving calculators and local mover guides across the United States.",
        path: "/sitemap",
      }),
      ...ROBOTS_META,
    ],
    links: [{ rel: "canonical", href: "/sitemap" }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Sitemap", url: "/sitemap" },
        ]),
      ),
    ],
  }),
  component: HtmlSitemap,
});

function HtmlSitemap() {
  const counties = allCounties();
  const byState = GEO_STATES.map((s) => ({
    state: s,
    counties: counties.filter((c) => c.stateCode === s.code),
  })).filter((g) => g.counties.length > 0);

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Sitemap" }]} />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight">Sitemap</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Every state, county, city moving calculator and local mover guide on Easy Moving.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link to="/" className="text-primary underline">Home</Link>
          <Link to="/calculator" className="text-primary underline">Moving calculator</Link>
          <Link to="/services" className="text-primary underline">Services</Link>
          <Link to="/cities" className="text-primary underline">All cities</Link>
          <Link to="/states" className="text-primary underline">All states</Link>
          <Link to="/blog" className="text-primary underline">Blog</Link>
          <Link to="/products" className="text-primary underline">Store</Link>
          <Link to="/about" className="text-primary underline">About</Link>
          <Link to="/contact" className="text-primary underline">Contact</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-10">
        {byState.map(({ state, counties: cs }) => (
          <div key={state.slug}>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              <Link to={`/states/${state.slug}` as "/"} className="hover:underline">
                {state.name}
              </Link>
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cs.map((county) => (
                <div key={county.path}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Link to={county.path as "/"} className="hover:underline">
                      {county.name}
                    </Link>
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {county.cities.map((c) => (
                      <li key={`${c.slug}-${c.stateCode}`}>
                        <Link to={moversPathFor(c.slug, c.stateCode) as "/"} className="hover:text-primary hover:underline">
                          Movers in {c.name}
                        </Link>
                        {" · "}
                        <Link to={landingPathFor(c.slug, c.stateCode) as "/"} className="hover:text-primary hover:underline">
                          calculator
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
