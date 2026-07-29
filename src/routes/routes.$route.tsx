import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Breadcrumbs, Faq, InternalLinks, Cta } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema";
import { findRoute, routeFaq, GEO_ROUTES, cityPath } from "@/lib/seo/geo";

export const Route = createFileRoute("/routes/$route")({
  loader: ({ params }) => {
    const route = findRoute(params.route);
    if (!route) throw notFound();
    return { route };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Route not found" }, { name: "robots", content: "noindex" }] };
    }
    const r = loaderData.route;
    const path = `/routes/${r.slug}`;
    const title = `${r.from.name} to ${r.to.name} Movers — Cost & Transit Time | Easy Moving`;
    const description = `Moving from ${r.from.name}, ${r.from.stateCode} to ${r.to.name}, ${r.to.stateCode}? Distance ${r.miles.toLocaleString()} miles, typical cost $${r.low.toLocaleString()}–$${r.high.toLocaleString()}. Get an instant itemized quote.`;
    return {
      meta: seoMeta({ title, description, path }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(serviceSchema({
          name: `${r.from.name} to ${r.to.name} Moving Service`,
          description,
          areaServed: `${r.from.name}, ${r.from.stateCode} — ${r.to.name}, ${r.to.stateCode}`,
        })),
        jsonLd(breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Moving routes", url: "/routes" },
          { name: `${r.from.name} to ${r.to.name}`, url: path },
        ])),
        jsonLd(faqSchema(routeFaq(r))),
      ],
    };
  },
  component: RoutePage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Route not found</h1>
        <Link to="/routes" className="mt-6 inline-block text-primary hover:underline">Browse all routes →</Link>
      </div>
    </SiteLayout>
  ),
});

function RoutePage() {
  const { route: r } = Route.useLoaderData();
  const related = GEO_ROUTES.filter(
    (x) => x.slug !== r.slug && (x.from.slug === r.from.slug || x.to.slug === r.to.slug),
  ).slice(0, 8);

  const tips = [
    `Book ${r.miles > 800 ? "4–6 weeks" : "2–3 weeks"} ahead — ${r.from.name} outbound capacity tightens fast in summer.`,
    "Ask for a binding or not-to-exceed estimate in writing before pickup day.",
    `Confirm the delivery spread in writing; ${r.miles < 400 ? "same-week" : "multi-day"} delivery is normal on this lane.`,
    "Photograph high-value items and keep the inventory sheet with you, not on the truck.",
    `Pack a first-night box for ${r.to.name} with tools, chargers, bedding and documents.`,
  ];

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-10 lg:pt-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-10">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
                {r.from.stateCode} → {r.to.stateCode}
              </span>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight">
                {r.from.name} to {r.to.name} Movers
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Licensed long-distance carriers running the {r.from.name} → {r.to.name} corridor.
                See a real itemized price built from your inventory, access and delivery window.
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["Distance", `${r.miles.toLocaleString()} mi`],
                  ["Drive time", `${r.driveHours} hrs`],
                  ["Typical cost", `$${r.low.toLocaleString()}+`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border bg-card p-3">
                    <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div id="calculator" className="min-w-0 scroll-mt-4">
              <QuoteCalculator compact />
            </div>
          </div>
        </div>
      </section>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Routes", to: "/routes" },
          { label: `${r.from.name} → ${r.to.name}` },
        ]}
      />

      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl font-medium">
            What the {r.from.name} to {r.to.name} move costs
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            The lane covers about {r.miles.toLocaleString()} miles and roughly {r.driveHours} hours of
            driving. Most households pay between ${r.low.toLocaleString()} and ${r.high.toLocaleString()},
            with shipment weight, packing services, elevator or stair access, and how tight your
            delivery window is doing most of the work on the final number.
          </p>

          <h3 className="mt-10 font-serif text-2xl font-medium">Moving tips for this route</h3>
          <ul className="mt-4 space-y-3">
            {tips.map((t) => (
              <li key={t} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Faq items={routeFaq(r)} />

      <InternalLinks
        title="Related routes and cities"
        links={[
          ...related.map((x) => ({ label: `${x.from.name} → ${x.to.name}`, to: `/routes/${x.slug}` })),
          { label: `${r.from.name} Movers`, to: cityPath(r.from) },
          { label: `${r.to.name} Movers`, to: cityPath(r.to) },
        ]}
      />

      <Cta
        title={`Get your ${r.from.name} to ${r.to.name} quote`}
        subhead="Instant itemized pricing, then one vetted carrier confirms your final rate."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}
