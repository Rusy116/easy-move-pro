import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  PackageCheck,
  Clock,
  Star,
  MapPin,
  Zap,
  HeartHandshake,
  CheckCircle2,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
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

/** Values that are locale-independent stay literal; labels resolve through keys. */
const STATS = [
  { value: "50k+", labelKey: "home.stat.households" },
  { value: "4.9", labelKey: "home.stat.rating" },
  { valueKey: "home.stat.coverageValue", labelKey: "home.stat.coverage" },
  { valueKey: "home.stat.speedValue", labelKey: "home.stat.speed" },
] as const;

const FEATURES = [
  { icon: Zap, id: "pricing" },
  { icon: ShieldCheck, id: "vetted" },
  { icon: Sparkles, id: "ai" },
  { icon: HeartHandshake, id: "concierge" },
] as const;

const TESTIMONIALS = [
  { id: "1", name: "Sarah Jenkins" },
  { id: "2", name: "Marcus Chen" },
  { id: "3", name: "Priya Patel" },
] as const;


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Easy Move Pro — Instant Moving Quotes, Vetted Movers, AI Planning" },
      {
        name: "description",
        content:
          "Compare vetted moving companies, get an honest instant quote in under 60 seconds, and plan your move with AI. Nationwide US coverage.",
      },
      { property: "og:title", content: "Easy Move Pro — Moving, Made Simple" },
      {
        property: "og:description",
        content: "Instant quotes, vetted movers, AI-powered planning. 50,000+ households moved.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-ochre/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-sage/20 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-ochre" />
              AI-powered moving marketplace
            </span>
            <h1 className="mt-6 text-balance font-serif text-[2.75rem] font-medium leading-[1.02] tracking-tight sm:text-6xl md:text-[5rem]">
              Moving, <span className="text-gradient-brand italic">made simple.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Compare vetted moving companies, get an honest instant quote, and plan your move with
              AI — nationwide, no sales calls, no surprises.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
              <Link to="/calculator" className="w-full sm:w-auto">
                <Button size="lg" className="w-full rounded-full sm:w-auto">
                  Get Instant Quote <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/services" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full rounded-full sm:w-auto">
                  Explore Services
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sage" /> No signup required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sage" /> Licensed & insured
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-sage" /> Locked-in rates
              </span>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-5xl sm:mt-16">
            <QuoteCalculator compact />
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="font-serif text-3xl font-medium text-foreground sm:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hero image band with overlay copy */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5">
          <img
            src={heroImage}
            alt="Modern living room being packed with labeled moving boxes"
            width={1600}
            height={1200}
            className="h-[320px] w-full object-cover sm:h-[480px]"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
            <div className="max-w-lg">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Move-day precision
              </span>
              <h2 className="mt-2 font-serif text-2xl font-medium sm:text-4xl">
                Every box, tracked. Every rate, transparent.
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
            How it works
          </span>
          <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
            A move, in three unhurried steps.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {[
            {
              n: "01",
              icon: PackageCheck,
              title: "Tell us your move",
              copy: "ZIP to ZIP, bedrooms, dates. It takes 30 seconds.",
            },
            {
              n: "02",
              icon: Truck,
              title: "Compare vetted movers",
              copy: "We match you with 3 crews with real prices and reviews.",
            },
            {
              n: "03",
              icon: ShieldCheck,
              title: "Book with confidence",
              copy: "Locked-in rates, licensed & insured, AI-tracked timeline.",
            },
          ].map(({ n, icon: Icon, title, copy }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute right-5 top-5 font-serif text-xs text-muted-foreground/60">
                {n}
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start md:gap-16">
            <div className="md:sticky md:top-24">
              <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
                Why Easy Move Pro
              </span>
              <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
                Built for the way people actually move.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Old-school brokers hide behind sales calls. We show you the price, the crew, and the
                reviews — before you talk to anyone.
              </p>
              <Link
                to="/about"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Our story <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-sage-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:mb-10">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
              Nationwide coverage
            </span>
            <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
              Every major US metro.
            </h2>
          </div>
          <Link to="/cities" className="shrink-0 text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CITIES.map((c, i) => (
            <Link
              key={c.slug}
              to="/cities/$city"
              params={{ city: c.slug }}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border transition-transform hover:-translate-y-1"
              style={{
                background: `linear-gradient(135deg, oklch(0.42 0.03 155 / ${0.9 - (i % 3) * 0.15}), oklch(0.65 0.13 55 / ${0.5 + (i % 4) * 0.1}))`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <MapPin className="absolute right-3 top-3 h-4 w-4 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-[10px] opacity-80">{c.state}</div>
                <div className="font-medium">{c.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
              Real customers
            </span>
            <h2 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
              People move once. They remember how it felt.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col justify-between rounded-2xl bg-primary-foreground/5 p-6 ring-1 ring-primary-foreground/10 backdrop-blur"
              >
                <div className="flex gap-0.5 text-ochre">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 font-serif text-lg leading-snug">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 border-t border-primary-foreground/10 pt-4 text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs opacity-70">{t.detail}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center sm:p-16">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-ochre/15 blur-3xl"
            aria-hidden
          />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-primary">
            <Clock className="h-3.5 w-3.5" /> Quote in under 60 seconds
          </span>
          <h2 className="relative mt-5 font-serif text-3xl font-medium sm:text-5xl">
            Ready when you are.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            No signup required. See real pricing before anyone calls you.
          </p>
          <div className="relative mt-8">
            <Link to="/calculator">
              <Button size="lg" className="rounded-full">
                Get Instant Quote <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
