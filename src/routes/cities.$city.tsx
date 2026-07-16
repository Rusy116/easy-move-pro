import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { CITIES } from "./cities.index";

export const Route = createFileRoute("/cities/$city")({
  loader: ({ params }) => {
    const city = CITIES.find((c) => c.slug === params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `Movers in ${loaderData.city.name}, ${loaderData.city.state} — Easy Moving` },
            {
              name: "description",
              content: `Find licensed moving companies in ${loaderData.city.name}. Average 2-bedroom move: $${loaderData.city.avg.toLocaleString()}. Get an instant quote.`,
            },
          ],
        }
      : { meta: [{ title: "City" }] },
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

function CityPage() {
  const { city } = Route.useLoaderData();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <Link to="/cities" className="text-sm text-muted-foreground hover:text-foreground">← All cities</Link>
        <h1 className="mt-4 font-serif text-6xl font-medium">{city.name}</h1>
        <div className="mt-2 text-lg text-muted-foreground">{city.state} · Metro population {city.pop}</div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Avg 2BR move" value={`$${city.avg.toLocaleString()}`} />
          <Stat label="Local partners" value={`${8 + (city.name.length % 12)}`} />
          <Stat label="Response time" value="< 30 min" />
        </div>

        <div className="mt-12 rounded-3xl bg-card border border-border p-10">
          <h2 className="font-serif text-3xl">Moving to or from {city.name}?</h2>
          <p className="mt-3 text-muted-foreground">
            We match you with three DOT-licensed local crews with real customer reviews. Prices lock at booking — no surprise fees.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/calculator"><Button className="rounded-full">Get Instant Quote</Button></Link>
            <Link to="/services"><Button variant="outline" className="rounded-full">See services</Button></Link>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-serif text-3xl">Tips for moving in {city.name}</h2>
          <ul className="mt-6 space-y-4 text-muted-foreground">
            <li>• Book at least 4 weeks ahead if you're moving between the 1st and 5th of the month.</li>
            <li>• {city.name} buildings often require certificates of insurance (COI). We handle these for you.</li>
            <li>• Ask about elevator reservations — most residential buildings require a 24–48 hour window.</li>
            <li>• Parking permits may be required. Our local partners include these in the quote.</li>
          </ul>
        </div>
      </section>
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
