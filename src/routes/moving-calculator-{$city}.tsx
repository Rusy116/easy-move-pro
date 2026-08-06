import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuoteCalculator } from "@/components/calculator/QuoteCalculator";
import { Breadcrumbs, Faq, InternalLinks, Statistics } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema";
import { findCityFacts, parseLandingParam } from "@/lib/city-landing/data";
import { buildCityLandingContent, type CityLandingContent } from "@/lib/city-landing/content";
import type { CityFacts } from "@/lib/city-landing/data";

export const Route = createFileRoute("/moving-calculator-{$city}")({
  loader: ({ params }) => {
    const parsed = parseLandingParam(params.city);
    const facts = parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
    if (!facts) throw notFound();
    return { facts, content: buildCityLandingContent(facts) };
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
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Cities", url: "/cities" },
            { name: `${facts.city}, ${facts.stateCode}`, url: path },
          ]),
        ),
        jsonLd(faqSchema(content.faq)),
      ],
    };
  },
  component: CityLandingPage,
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

function CityLandingPage() {
  const { facts, content } = Route.useLoaderData() as {
    facts: CityFacts;
    content: CityLandingContent;
  };

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Cities", to: "/cities" },
          { label: `${facts.city}, ${facts.stateCode}` },
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-ochre">
          {facts.city}, {facts.stateCode} · {facts.timezone}
        </span>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-medium tracking-tight">
          {content.h1}
        </h1>
        {content.intro.map((p, i) => (
          <p key={i} className="mt-4 text-base leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </section>

      <Statistics
        items={[
          { value: `$${facts.averages.studio.toLocaleString()}`, label: "Studio / 1BR local move" },
          { value: `$${facts.averages.twoBed.toLocaleString()}`, label: "2BR local move" },
          { value: `$${facts.averages.house.toLocaleString()}`, label: "3BR house" },
          { value: `$${facts.averages.hourly}/hr`, label: "2 movers + truck" },
        ]}
      />

      {/* The EXISTING Easy Moving calculator — never duplicated. */}
      <section id="calculator" className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        <h2 className="font-serif text-3xl font-medium tracking-tight">
          Instant moving cost calculator for {facts.city}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Suggested origin: {facts.city}, {facts.stateCode}
          {facts.zipCodes.length ? ` (ZIP ${facts.zipCodes[0]})` : ""}. Enter your details for an
          itemized estimate.
        </p>
        <div className="mt-8">
          <QuoteCalculator />
        </div>
      </section>

      {content.sections.map((s, i) => (
        <section key={i} className="border-t border-border">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">{s.h2}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mt-4 text-base leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {s.subsections?.map((sub, j) => (
              <div key={j} className="mt-8">
                <h3 className="text-lg font-semibold">{sub.h3}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{sub.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Moving tips for {facts.city}</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {content.movingTips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold">Packing tips</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {content.packingTips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <h3 className="mt-8 text-lg font-semibold">Local recommendations</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {content.recommendations.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Faq items={content.faq} />

      {facts.nearbyCities.length > 0 && (
        <InternalLinks
          title={`Moving calculators for cities near ${facts.city}`}
          links={facts.nearbyCities.map((n) => ({
            label: `Moving calculator ${n.name}, ${n.state}`,
            to: n.path,
          }))}
        />
      )}

      <InternalLinks
        title="Explore more"
        links={[
          { label: "Full moving calculator", to: "/calculator" },
          { label: "All cities we serve", to: "/cities" },
          { label: "Moving services", to: "/services" },
          { label: `Movers in ${facts.stateName}`, to: `/states/${facts.stateSlug}` },
        ]}
      />
    </SiteLayout>
  );
}
