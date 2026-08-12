import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";
import { GEO_ROUTES } from "@/lib/seo/geo";

const TITLE = "Popular Moving Routes — Costs, Distance & Transit Times | Easy Moving";
const DESC =
  "Compare cost, distance and transit time for the most requested long-distance moving routes in the United States, then get an instant itemized quote.";

export const Route = createFileRoute("/routes/")({
  head: () => ({
    meta: seoMeta({ title: TITLE, description: DESC, path: "/routes" }),
    links: [{ rel: "canonical", href: absoluteUrl("/routes") }],
    scripts: [
      jsonLd(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Moving routes", url: "/routes" },
        ]),
      ),
    ],
  }),
  component: RoutesIndex,
});

function RoutesIndex() {
  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Moving routes" }]} />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
          Long distance
        </span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Popular moving routes.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Real distance, drive time and cost ranges for the corridors our partner network moves
          most.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GEO_ROUTES.map((r) => (
            <Link
              key={r.slug}
              to="/routes/$route"
              params={{ route: r.slug }}
              className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="font-serif text-xl font-medium group-hover:text-primary transition-colors">
                {r.from.name} → {r.to.name}
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-medium">{r.miles.toLocaleString()} mi</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Drive</div>
                  <div className="font-medium">{r.driveHours} hrs</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Typical</div>
                  <div className="font-medium">${(r.low / 1000).toFixed(1)}k+</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <InternalLinks
        title="Explore more"
        links={[
          { label: "Movers by state", to: "/states" },
          { label: "Moving cost calculator", to: "/calculator" },
          { label: "Resources center", to: "/resources" },
          { label: "AI moving tools", to: "/ai-tools" },
        ]}
      />
      <Cta
        title="Price your route in seconds"
        subhead="Inventory-based pricing for local, long-distance and interstate moves."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}
