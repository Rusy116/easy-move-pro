import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const CITIES = [
  { slug: "new-york", name: "New York", state: "NY", pop: "8.3M", avg: 2100 },
  { slug: "los-angeles", name: "Los Angeles", state: "CA", pop: "3.9M", avg: 2650 },
  { slug: "chicago", name: "Chicago", state: "IL", pop: "2.7M", avg: 1920 },
  { slug: "austin", name: "Austin", state: "TX", pop: "965K", avg: 1850 },
  { slug: "san-francisco", name: "San Francisco", state: "CA", pop: "815K", avg: 3400 },
  { slug: "miami", name: "Miami", state: "FL", pop: "455K", avg: 2200 },
  { slug: "seattle", name: "Seattle", state: "WA", pop: "749K", avg: 2380 },
  { slug: "denver", name: "Denver", state: "CO", pop: "715K", avg: 1990 },
  { slug: "boston", name: "Boston", state: "MA", pop: "675K", avg: 2450 },
  { slug: "atlanta", name: "Atlanta", state: "GA", pop: "498K", avg: 1780 },
  { slug: "phoenix", name: "Phoenix", state: "AZ", pop: "1.6M", avg: 1720 },
  { slug: "portland", name: "Portland", state: "OR", pop: "652K", avg: 2050 },
  { slug: "washington", name: "Washington", state: "DC", pop: "689K", avg: 2280 },
  { slug: "dallas", name: "Dallas", state: "TX", pop: "1.3M", avg: 1820 },
];

export const Route = createFileRoute("/cities/")({
  head: () => ({
    meta: [
      { title: "Moving Company Cities — Easy Moving" },
      {
        name: "description",
        content: "Find vetted movers and average moving costs in every major US metro area.",
      },
    ],
  }),
  component: CitiesIndex,
});

function CitiesIndex() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
          Nationwide
        </span>
        <h1 className="mt-3 font-serif text-5xl font-medium">Cities we serve.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Local expertise in every major US metro. See average moving costs, top-rated partners, and
          city-specific tips.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CITIES.map((c, i) => (
            <Link
              key={c.slug}
              to="/cities/$city"
              params={{ city: c.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border p-6 transition-shadow hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, oklch(0.42 0.03 155 / 0.06), oklch(0.65 0.13 55 / ${0.05 + (i % 4) * 0.03}))`,
              }}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-2xl font-medium">{c.name}</h3>
                <span className="text-xs text-muted-foreground">{c.state}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Metro population</div>
                  <div className="font-medium">{c.pop}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Avg 2BR move</div>
                  <div className="font-medium">${c.avg.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-6 text-sm font-medium text-primary">Explore {c.name} →</div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
