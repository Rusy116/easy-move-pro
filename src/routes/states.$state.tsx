import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, Faq, InternalLinks, Cta, Statistics } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema, absoluteUrl } from "@/lib/seo/schema";
import { findState, citiesInStateSlug, cityAverages, cityPath, GEO_ROUTES } from "@/lib/seo/geo";

export const Route = createFileRoute("/states/$state")({
  loader: ({ params }) => {
    const state = findState(params.state);
    if (!state) throw notFound();
    return { state };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "State not found" }, { name: "robots", content: "noindex" }] };
    }
    const s = loaderData.state;
    const path = `/states/${s.slug}`;
    const title = `${s.name} Movers — Moving Companies in ${s.name} | Easy Moving`;
    const description = `Licensed ${s.name} moving companies for local, long-distance and interstate moves. Compare city-level moving costs and get an instant itemized quote.`;
    return {
      meta: seoMeta({ title, description, path }),
      links: [{ rel: "canonical", href: absoluteUrl(path) }],
      scripts: [
        jsonLd(
          serviceSchema({ name: `${s.name} Moving Services`, description, areaServed: s.name }),
        ),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Movers by state", url: "/states" },
            { name: `${s.name} Movers`, url: path },
          ]),
        ),
        jsonLd(faqSchema(stateFaq(s.name))),
      ],
    };
  },
  component: StatePage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">State not found</h1>
        <Link to="/states" className="mt-6 inline-block text-primary hover:underline">
          Browse all states →
        </Link>
      </div>
    </SiteLayout>
  ),
});

function stateFaq(name: string) {
  return [
    {
      q: `How much does a move cost in ${name}?`,
      a: `Local ${name} moves usually land between $900 and $3,500 depending on volume, access and services. Interstate moves out of ${name} are priced by weight, distance and delivery window. The calculator prices your exact inventory instantly.`,
    },
    {
      q: `Are ${name} moving companies on Easy Moving licensed?`,
      a: `Yes. Every partner is verified for state licensing, DOT/MC authority where required, insurance and service area before approval.`,
    },
    {
      q: `Do you cover small towns in ${name}?`,
      a: `Yes. Our partner network covers metros and surrounding suburbs statewide, plus long-distance carriers for rural pickups.`,
    },
    {
      q: `How quickly can I get matched in ${name}?`,
      a: `Most requests are matched within a few hours. One company gets an exclusive 12-hour window to respond, so you are not called by a dozen brokers.`,
    },
  ];
}

function StatePage() {
  const { state } = Route.useLoaderData();
  const cities = citiesInStateSlug(state.slug);
  const routes = GEO_ROUTES.filter(
    (r) => r.from.stateSlug === state.slug || r.to.stateSlug === state.slug,
  ).slice(0, 8);

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "States", to: "/states" },
          { label: state.name },
        ]}
      />
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
            {state.code}
          </span>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-medium tracking-tight">
            {state.name} Movers
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Licensed local, long-distance and interstate moving companies serving {state.name}. Get
            an itemized estimate in seconds, then let one vetted mover confirm your final price.
          </p>
        </div>
      </section>

      <Statistics
        items={[
          { value: `${cities.length}`, label: "Cities covered" },
          { value: "12 hrs", label: "Exclusive response window" },
          { value: "100%", label: "Licence-verified partners" },
          { value: "$0", label: "Cost to get a quote" },
        ]}
      />

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl font-medium">Cities in {state.name}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => {
              const a = cityAverages(c);
              return (
                <Link
                  key={c.slug}
                  to="/$state/$city"
                  params={{ state: c.stateSlug, city: `${c.slug}-movers` }}
                  className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="font-serif text-2xl font-medium group-hover:text-primary transition-colors">
                    {c.name} Movers
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Population</div>
                      <div className="font-medium">{c.population.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg 2BR move</div>
                      <div className="font-medium">${a.twoBed.toLocaleString()}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {routes.length > 0 && (
        <InternalLinks
          title={`Popular ${state.name} routes`}
          links={routes.map((r) => ({
            label: `${r.from.name} → ${r.to.name}`,
            to: `/routes/${r.slug}`,
          }))}
        />
      )}

      <Faq items={stateFaq(state.name)} />

      <InternalLinks
        title="Related"
        links={[
          { label: "All states", to: "/states" },
          { label: "Moving cost calculator", to: "/calculator" },
          { label: "Popular routes", to: "/routes" },
          { label: "Resources", to: "/resources" },
        ]}
      />

      <Cta
        title={`Moving in ${state.name}?`}
        subhead="See a real itemized price range in under two minutes."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}
