import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, BadgeDollarSign, Network } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Faq, InternalLinks, Breadcrumbs, Testimonials, Cta } from "@/components/seo/blocks";
import {
  seoMeta,
  jsonLd,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema, absoluteUrl } from "@/lib/seo/schema";
import { neighborhoodsFor } from "@/lib/seo/city-content";
import {
  findCity,
  findState,
  citiesInStateSlug,
  cityAverages,
  cityFaq,
  cityPath,
  routesForCity,
} from "@/lib/seo/geo";

export const Route = createFileRoute("/$state/$city")({
  loader: ({ params }) => {
    const state = findState(params.state);
    const city = state ? findCity(params.state, params.city) : undefined;
    if (!state || !city) throw notFound();
    return { city, state };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.city;
    const a = cityAverages(c);
    const path = cityPath(c);
    const title = `${c.name} Movers — Moving Companies in ${c.name}, ${c.stateCode} | Easy Moving`;
    const description = `Compare licensed ${c.name}, ${c.stateCode} moving companies and get an instant itemized quote. Average two-bedroom move about $${a.twoBed.toLocaleString()}. Local, long-distance and interstate.`;
    return {
      meta: seoMeta({ title, description, path }),
      links: [{ rel: "canonical", href: absoluteUrl(path) }],
      scripts: [
        jsonLd(
          localBusinessSchema({
            name: `Easy Moving — ${c.name}, ${c.stateCode}`,
            description,
            area: `${c.name}, ${c.stateCode}`,
            url: path,
          }),
        ),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: `${c.stateName} Movers`, url: `/states/${c.stateSlug}` },
            { name: `${c.name} Movers`, url: path },
          ]),
        ),
        jsonLd(faqSchema(cityFaq(c))),
      ],
    };
  },
  component: CityMoversPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">We couldn't find that location.</p>
        <Link to="/states" className="mt-6 inline-block text-primary hover:underline">
          Browse movers by state →
        </Link>
      </div>
    </SiteLayout>
  ),
});

const BADGES = [
  { icon: ShieldCheck, label: "Licensed & Insured" },
  { icon: Sparkles, label: "Instant AI Quote" },
  { icon: BadgeDollarSign, label: "No Hidden Fees" },
  { icon: Network, label: "Nationwide Network" },
];

function CityMoversPage() {
  const { city, state } = Route.useLoaderData();
  const a = cityAverages(city);
  const where = `${city.name}, ${city.stateCode}`;
  const neighborhoods = neighborhoodsFor(city.slug, city.name, city.stateCode);
  const faq = cityFaq(city);
  const nearby = citiesInStateSlug(state.slug)
    .filter((c) => c.slug !== city.slug)
    .slice(0, 11);
  const popularRoutes = routesForCity(city.slug).slice(0, 8);

  return (
    <SiteLayout>
      {/* Hero + calculator above the fold */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-10 lg:pt-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-10">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
                {where}
              </span>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight">
                {city.name} Movers
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Vetted moving companies serving {where}. Build your inventory, get a real itemized
                price in seconds, and let one licensed local mover respond — never a shared lead
                list.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-2">
                {BADGES.map((b) => (
                  <li
                    key={b.label}
                    className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium"
                  >
                    <b.icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{b.label}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#city-guide"
                className="mt-5 hidden lg:inline-block text-sm text-muted-foreground hover:text-foreground"
              >
                Read the {city.name} moving guide ↓
              </a>
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
          { label: `${city.stateName} Movers`, to: `/states/${city.stateSlug}` },
          { label: `${city.name} Movers` },
        ]}
      />

      {/* Local content + costs */}
      <section id="city-guide" className="border-b border-border scroll-mt-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl font-medium">Moving in {city.name}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {city.name} is one of {city.stateName}'s busiest relocation markets, with roughly{" "}
            {city.population.toLocaleString()} residents and constant turnover between
            neighborhoods, suburbs and out-of-state metros. Crews here plan around parking permits,
            walk-up carries, building elevator reservations and peak-season demand — all of which
            change the price of your move far more than a bedroom count does.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Studio / 1BR", a.studio],
              ["2 bedroom", a.twoBed],
              ["3–4BR house", a.house],
              ["Hourly crew", a.hourly],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className="mt-2 font-serif text-2xl">
                  ${(value as number).toLocaleString()}
                  {label === "Hourly crew" && (
                    <span className="text-sm text-muted-foreground">/hr</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-12 font-serif text-2xl font-medium">Service areas in {city.name}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <span
                key={n}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      {popularRoutes.length > 0 && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
            <h2 className="font-serif text-3xl font-medium">Popular routes from {city.name}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popularRoutes.map((r) => (
                <Link
                  key={r.slug}
                  to="/routes/$route"
                  params={{ route: r.slug }}
                  className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="font-medium">
                    {r.from.name} → {r.to.name}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {r.miles.toLocaleString()} mi · ${r.low.toLocaleString()}–$
                    {r.high.toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Faq items={faq} />

      <InternalLinks
        title={`Other ${city.stateName} cities`}
        links={[
          ...nearby.map((c) => ({ label: `${c.name} Movers`, to: cityPath(c) })),
          { label: `All ${city.stateName} movers`, to: `/states/${city.stateSlug}` },
        ]}
      />

      <Cta
        title={`Ready to move in ${city.name}?`}
        subhead="Get your instant itemized estimate — no phone number required to see the price."
        primaryHref="/calculator"
        primaryLabel="Get my exact quote"
      />
    </SiteLayout>
  );
}
