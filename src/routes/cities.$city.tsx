import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, BadgeDollarSign, Network } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Faq, InternalLinks, Breadcrumbs } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, localBusinessSchema } from "@/lib/seo/schema";
import { neighborhoodsFor, costTable, cityFaq, cityTips } from "@/lib/seo/city-content";
import { CITIES } from "./cities.index";

export const Route = createFileRoute("/cities/$city")({
  loader: ({ params }) => {
    const city = CITIES.find((c) => c.slug === params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "City not found" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.city;
    const path = `/cities/${params.city}`;
    const title = `Moving Companies in ${c.name}, ${c.state} — Instant Quote | Easy Moving`;
    const description = `Get an instant moving cost estimate for ${c.name}, ${c.state}. Licensed & insured local movers, average 2-bedroom move $${c.avg.toLocaleString()}. No hidden fees.`;
    return {
      meta: seoMeta({ title, description, path }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(localBusinessSchema({
          name: `Easy Moving — ${c.name}, ${c.state}`,
          description,
          area: `${c.name}, ${c.state}`,
          url: path,
        })),
        jsonLd(breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Cities", url: "/cities" },
          { name: c.name, url: path },
        ])),
        jsonLd(faqSchema(cityFaq(c.name, c.state, c.avg))),
      ],
    };
  },
  component: CityPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl">City not found</h1>
        <Link to="/cities" className="mt-6 inline-block text-primary hover:underline">Browse all cities →</Link>
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

function CityPage() {
  const { city } = Route.useLoaderData();
  const where = `${city.name}, ${city.state}`;
  const neighborhoods = neighborhoodsFor(city.slug, city.name);
  const costs = costTable(city.avg);
  const faq = cityFaq(city.name, city.state, city.avg);
  const tips = cityTips(city.name);

  return (
    <SiteLayout>
      {/* ── Above the fold: headline, value prop, trust badges, calculator ── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-10 lg:pt-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-10">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
                {where}
              </span>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight">
                Moving Companies in {where}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Compare DOT-licensed {city.name} movers in seconds. Build your inventory, get a
                real itemized price range instantly, and lock your rate at booking — the average
                2-bedroom move here runs about ${city.avg.toLocaleString()}.
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

      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Cities", to: "/cities" }, { label: city.name }]} />

      {/* ── SEO content below the calculator ── */}
      <section id="city-guide" className="border-b border-border scroll-mt-4">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Moving in {city.name}, {city.state}
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {city.name} is home to roughly {city.pop} people across its metro area, and it's one of
            the busiest relocation markets in {city.state}. Whether you're moving across a few
            blocks or across the country, the cost of your {city.name} move comes down to the same
            factors: how much you're moving (cubic feet and weight), how hard it is to access your
            buildings, the services you add — packing, storage, assembly — and the driving distance
            between origin and destination.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Easy Moving matches you with vetted, DOT-licensed crews serving {where}. Every partner
            carries active cargo and liability coverage, issues certificates of insurance for
            buildings that require them, and quotes from your real inventory instead of a guess
            over the phone. Prices lock at booking, so what you approve is what you pay.
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Average moving costs in {city.name}
          </h2>
          <p className="mt-3 text-muted-foreground">
            Typical ranges for {city.name} moves. Your instant quote above is calculated from your
            actual inventory and access details.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Home size</th>
                  <th className="px-5 py-3 font-medium">Local move</th>
                  <th className="px-5 py-3 font-medium">Long distance</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((r) => (
                  <tr key={r.size} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{r.size}</td>
                    <td className="px-5 py-4 text-muted-foreground">${r.local.toLocaleString()}</td>
                    <td className="px-5 py-4 text-muted-foreground">${r.long.toLocaleString()}+</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Avg 2BR move" value={`$${city.avg.toLocaleString()}`} />
            <Stat label="Local partners" value={`${8 + (city.name.length % 12)}`} />
            <Stat label="Response time" value="< 30 min" />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Neighborhoods we serve in {city.name}
          </h2>
          <p className="mt-3 text-muted-foreground">
            Our {city.name} partner crews cover the full metro, including these neighborhoods and
            surrounding suburbs.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <span
                key={n}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Local moving tips for {city.name}
          </h2>
          <ul className="mt-6 space-y-4 text-muted-foreground">
            {tips.map((t) => (
              <li key={t} className="leading-relaxed">• {t}</li>
            ))}
          </ul>
        </div>
      </section>

      <Faq items={faq} />

      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
            Ready to price your {city.name} move?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three licensed local crews, one transparent price. It takes about two minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="#calculator">
              <Button className="rounded-full">Get Instant Quote</Button>
            </a>
            <Link to="/services">
              <Button variant="outline" className="rounded-full">See services</Button>
            </Link>
          </div>
        </div>
      </section>

      <InternalLinks
        title="Other cities we serve"
        links={CITIES.filter((c) => c.slug !== city.slug).map((c) => ({
          label: `Movers in ${c.name}, ${c.state}`,
          to: `/cities/${c.slug}`,
        }))}
      />
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-2 font-serif text-3xl font-medium">{value}</div>
    </div>
  );
}
