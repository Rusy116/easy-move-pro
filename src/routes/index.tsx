import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, Truck, PackageCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-moving.jpg";

const CITIES = [
  { slug: "new-york", name: "New York", state: "NY" },
  { slug: "los-angeles", name: "Los Angeles", state: "CA" },
  { slug: "chicago", name: "Chicago", state: "IL" },
  { slug: "austin", name: "Austin", state: "TX" },
  { slug: "san-francisco", name: "San Francisco", state: "CA" },
  { slug: "miami", name: "Miami", state: "FL" },
  { slug: "seattle", name: "Seattle", state: "WA" },
  { slug: "denver", name: "Denver", state: "CO" },
  { slug: "boston", name: "Boston", state: "MA" },
  { slug: "atlanta", name: "Atlanta", state: "GA" },
  { slug: "phoenix", name: "Phoenix", state: "AZ" },
  { slug: "portland", name: "Portland", state: "OR" },
];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-ochre" />
            AI-powered moving marketplace
          </span>
          <h1 className="mt-6 text-balance font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Moving Made Simple.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Compare moving companies, calculate moving costs instantly, and organize your move with AI.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/calculator">
              <Button size="lg" className="rounded-full">
                Get Instant Quote <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/blog/moving-checklist-30-days">
              <Button size="lg" variant="outline" className="rounded-full">
                View Moving Checklist
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl px-4 sm:px-6">
          <QuoteCalculator compact />
          <div className="mt-4 text-center">
            <Link
              to="/calculator"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open the full calculator →
            </Link>
          </div>
        </div>
      </section>

      {/* Hero image band */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="overflow-hidden rounded-3xl ring-1 ring-black/5">
          <img
            src={heroImage}
            alt="Modern living room being packed with labeled moving boxes"
            width={1600}
            height={1200}
            className="h-[420px] w-full object-cover"
          />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <p className="text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Trusted by 50,000+ households nationwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {["Wirecutter", "Curbed", "Apartment Therapy", "Domino", "Fast Company"].map((b) => (
              <span key={b} className="font-serif text-lg text-muted-foreground">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-24">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">How it works</span>
          <h2 className="mt-3 font-serif text-4xl font-medium">A move, in three unhurried steps.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: PackageCheck, title: "Tell us your move", copy: "ZIP to ZIP, bedrooms, dates. It takes 30 seconds." },
            { icon: Truck, title: "Compare vetted movers", copy: "We match you with 3 crews with real prices and reviews." },
            { icon: ShieldCheck, title: "Book with confidence", copy: "Locked-in rates, licensed & insured, AI-tracked timeline." },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">Nationwide coverage</span>
            <h2 className="mt-3 font-serif text-4xl font-medium">Every major US metro.</h2>
          </div>
          <Link to="/cities" className="hidden sm:inline-flex text-sm font-medium text-primary hover:underline">
            View all cities →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CITIES.map((c, i) => (
            <Link
              key={c.slug}
              to="/cities/$city"
              params={{ city: c.slug }}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border"
              style={{
                background: `linear-gradient(135deg, oklch(0.42 0.03 155 / ${0.9 - (i % 3) * 0.15}), oklch(0.65 0.13 55 / ${0.5 + (i % 4) * 0.1}))`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-[10px] opacity-80">{c.state}</div>
                <div className="font-medium">{c.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl bg-primary p-10 text-primary-foreground md:p-16">
          <blockquote className="max-w-3xl font-serif text-3xl leading-tight md:text-4xl">
            "The instant quote was exactly what we paid. It felt more like booking a flight than moving a house."
          </blockquote>
          <div className="mt-8 text-sm opacity-80">
            Sarah Jenkins — moved New York to Los Angeles
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl border border-border bg-card p-10 text-center md:p-16">
          <h2 className="font-serif text-4xl font-medium">Ready when you are.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            No signup required. See real pricing in under a minute.
          </p>
          <div className="mt-8">
            <Link to="/calculator">
              <Button size="lg" className="rounded-full">Get Instant Quote</Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
