import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, ShieldCheck, Clock, BadgeCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Breadcrumbs, Faq, InternalLinks } from "@/components/seo/blocks";
import {
  seoMeta,
  jsonLd,
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
  localBusinessSchema,
} from "@/lib/seo/schema";
import { findCityFacts, parseLandingParam, type CityFacts } from "@/lib/city-landing/data";
import { buildCityLandingContent, type CityLandingContent } from "@/lib/city-landing/content";
import { routesForCity, routePath } from "@/lib/seo/geo";
import { getCityPageData } from "@/lib/city-landing/public.functions";
import { CityHeroImage } from "@/components/site/CityHeroImage";
import { resolveCityHero, type CityHero } from "@/lib/city-landing/media";
import type { LandingContext } from "@/lib/city-landing/attribution";

// Source of truth: `public.city_landing_pages`. The bundled dataset only
// covers legacy slugs that predate the City Factory.
export const Route = createFileRoute("/moving-calculator-{$city}")({
  loader: async ({ params }) => {
    const record = await getCityPageData({ data: { slug: params.city.toLowerCase() } });
    if (record) return { facts: record.facts, content: record.content, hero: record.hero };
    const parsed = parseLandingParam(params.city);
    const facts = parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
    if (!facts) throw notFound();
    return { facts, content: buildCityLandingContent(facts), hero: resolveCityHero(null, facts) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const { facts, content } = loaderData as { facts: CityFacts; content: CityLandingContent };
    const path = `/moving-calculator-${params.city}`;
    return {
      meta: seoMeta({ title: content.title, description: content.metaDescription, path }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(
          serviceSchema({
            name: `Moving Services in ${facts.city}, ${facts.stateCode}`,
            description: content.metaDescription,
            areaServed: `${facts.city}, ${facts.stateCode}`,
          }),
        ),
        jsonLd(
          localBusinessSchema({
            name: `Easy Moving — ${facts.city}, ${facts.stateCode}`,
            description: content.metaDescription,
            area: `${facts.city}, ${facts.stateName}`,
            url: path,
          }),
        ),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Moving Calculator", url: "/calculator" },
            { name: `${facts.city}, ${facts.stateCode}`, url: path },
          ]),
        ),
        jsonLd(faqSchema(content.faq)),
      ],
    };
  },
  component: CityCalculatorPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">City page not found</h1>
        <Link to="/cities" className="mt-6 inline-block text-primary underline">
          Browse all cities
        </Link>
      </div>
    </SiteLayout>
  ),
});

function CityCalculatorPage() {
  const { facts, content, hero } = Route.useLoaderData() as {
    facts: CityFacts;
    content: CityLandingContent;
    hero: CityHero;
  };
  const relatedRoutes = routesForCity(facts.slug).slice(0, 8);

  // Everything the CRM needs to credit this city page for the lead.
  const landing: LandingContext = {
    citySlug: facts.landingSlug,
    city: facts.city,
    stateCode: facts.stateCode,
    path: facts.path,
    zip: facts.zipCodes[0] ?? null,
  };

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Moving Calculator", to: "/calculator" },
          { label: `${facts.city}, ${facts.stateCode}` },
        ]}
      />

      {/* 1 · H1 + 2 · Trust */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight">
          Moving Calculator {facts.city}, {facts.stateCode}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="flex text-ochre" aria-label="Rated 5 out of 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
            <span className="text-sm font-semibold">Instant Moving Quote</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Licensed &amp; insured partners
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" /> Price in under 60 seconds
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BadgeCheck className="h-4 w-4" /> No spam call blasts
          </span>
        </div>
        <CityHeroImage
          hero={hero}
          city={facts.city}
          stateCode={facts.stateCode}
          className="mt-8 aspect-[16/7]"
        />
      </section>

      {/* 3 · The one official Easy Moving calculator — never duplicated */}
      <section id="calculator" className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-4">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Get your instant {facts.city} moving quote — takes under 60 seconds.
        </p>
        <QuoteCalculator landing={landing} />
      </section>

      {/* 4 · CTA */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-12">
        <a
          href="#calculator"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get My Moving Quote
        </a>
        <p className="mt-3 text-sm text-muted-foreground">
          Free, itemized and instant for every move in {facts.city}, {facts.stateName}.
        </p>
      </section>

      {/* 5 · Why choose Easy Move Pro */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
            Why choose Easy Move Pro in {facts.city}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "One real price, not five guesses",
                d: `The calculator prices your actual inventory, access and distance in ${facts.city} — no call-around, no bait numbers.`,
              },
              {
                t: "Verified local movers only",
                d: `Every ${facts.city} partner holds an active DOT/MC registration plus cargo and liability coverage, re-verified on renewal.`,
              },
              {
                t: "Your details stay private",
                d: "One licensed company handles your move. We never sell your number to a shared lead list.",
              },
              {
                t: "Written estimate + PDF",
                d: "You get a quote number, a downloadable estimate and a customer portal to accept the final price.",
              },
              {
                t: "Local access expertise",
                d: facts.parkingNotes,
              },
              {
                t: "Storage when plans move",
                d: facts.storageInfo,
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Moving in {city} guide */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
            Moving in {facts.city} — the complete local guide
          </h2>
          {content.intro.map((p, i) => (
            <p key={i} className="mt-4 text-base leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          {content.sections.map((s, i) => (
            <div key={i} className="mt-10">
              <h3 className="text-lg font-semibold">{s.h2}</h3>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.subsections?.map((sub, j) => (
                <div key={j} className="mt-5">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    {sub.h3}
                  </h4>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{sub.body}</p>
                </div>
              ))}
            </div>
          ))}
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold">Moving tips for {facts.city}</h3>
              <ul className="mt-3 space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                {content.movingTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Packing tips</h3>
              <ul className="mt-3 space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                {content.packingTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · FAQ */}
      <Faq items={content.faq} />

      {/* 8 · Neighborhoods */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          <h2 className="font-serif text-2xl font-semibold">
            Neighborhoods we move in {facts.city}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {facts.neighborhoods.map((n) => (
              <span
                key={n}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
              >
                {n}
              </span>
            ))}
          </div>

          {/* 9 · ZIP codes */}
          <h2 className="mt-12 font-serif text-2xl font-semibold">
            {facts.city} ZIP codes we serve
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {facts.zipCodes.length
              ? `Start the calculator with any of these ${facts.city} ZIP codes: ${facts.zipCodes.join(", ")}. Surrounding ${facts.county ?? facts.stateName} ZIPs are covered by the same network.`
              : `Every ZIP code in ${facts.city} and the surrounding ${facts.county ?? facts.stateName} area is covered — enter yours in the calculator above.`}
          </p>

          {/* 10 · Parking */}
          <h2 className="mt-12 font-serif text-2xl font-semibold">
            Parking and truck access in {facts.city}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {facts.parkingNotes}
          </p>
          {facts.highways.length > 0 && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Crews route through {facts.highways.join(", ")}, so morning starts avoid the worst of
              the {facts.city} commute and keep hourly moves shorter.
            </p>
          )}

          {/* 11 · Apartment moving tips */}
          <h2 className="mt-12 font-serif text-2xl font-semibold">
            Apartment and office moves in {facts.city}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {facts.apartmentTips}
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {facts.officeTips}
          </p>

          {/* 12 · Local regulations */}
          <h2 className="mt-12 font-serif text-2xl font-semibold">
            Local regulations and permits
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {facts.regulations ??
              `${facts.city} does not publish a single citywide moving permit rule, so requirements come from your street and your building. Your assigned mover checks permit, loading-zone and certificate-of-insurance requirements for both addresses before move day and includes any fee in the confirmed price.`}
          </p>
          <ul className="mt-4 space-y-2 list-disc pl-5 text-sm text-muted-foreground">
            {content.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 13 · Internal links */}
      <InternalLinks
        title="Explore Easy Move Pro"
        links={[
          { label: "Full moving calculator", to: "/calculator" },
          { label: "All cities we serve", to: "/cities" },
          { label: "Moving services", to: "/services" },
          { label: `Movers in ${facts.stateName}`, to: `/states/${facts.stateSlug}` },
          { label: "Moving guides", to: "/resources" },
          { label: "Get a quote", to: "/calculator" },
        ]}
      />

      {/* 14 · Related cities */}
      {facts.nearbyCities.length > 0 && (
        <InternalLinks
          title={`Moving calculators near ${facts.city}`}
          links={facts.nearbyCities.map((n) => ({
            label: `Moving calculator ${n.name}, ${n.state}`,
            to: n.path,
          }))}
        />
      )}

      {/* 15 · Related moving routes */}
      {relatedRoutes.length > 0 && (
        <InternalLinks
          title={`Long-distance routes from ${facts.city}`}
          links={relatedRoutes.map((r) => ({
            label: `${r.from.name} to ${r.to.name} movers`,
            to: routePath(r),
          }))}
        />
      )}
    </SiteLayout>
  );
}
