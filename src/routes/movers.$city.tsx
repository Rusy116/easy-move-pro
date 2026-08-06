import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Clock, BadgeCheck, Star } from "lucide-react";
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
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";
import { findCityFacts, parseLandingParam, type CityFacts } from "@/lib/city-landing/data";
import { buildCityLandingContent } from "@/lib/city-landing/content";
import { buildMoversSeoContent, type MoversSeoContent } from "@/lib/city-landing/seo-page";
import { buildCityHierarchy, type CityHierarchy } from "@/lib/city-landing/hierarchy";


/**
 * Stage 2 of the City Calculator Factory. This page embeds the ONE official
 * Easy Move Pro calculator — it never re-implements it.
 */
export const Route = createFileRoute("/movers/$city")({
  loader: ({ params }) => {
    const parsed = parseLandingParam(params.city);
    const facts = parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
    if (!facts) throw notFound();
    return {
      facts,
      seo: buildMoversSeoContent(facts, buildCityLandingContent(facts)),
      hierarchy: buildCityHierarchy(facts),
    };

  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const { facts, seo } = loaderData as { facts: CityFacts; seo: MoversSeoContent };
    const path = `/movers/${params.city}`;
    return {
      meta: seoMeta({ title: seo.title, description: seo.metaDescription, path }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(
          localBusinessSchema({
            name: `Easy Moving — ${facts.city}, ${facts.stateCode}`,
            description: seo.metaDescription,
            area: `${facts.city}, ${facts.stateName}`,
            url: path,
          }),
        ),
        jsonLd(
          serviceSchema({
            name: `Movers in ${facts.city}, ${facts.stateCode}`,
            description: seo.metaDescription,
            areaServed: `${facts.city}, ${facts.stateCode}`,
          }),
        ),
        jsonLd(
          breadcrumbSchema(
            (loaderData as { hierarchy: CityHierarchy }).hierarchy.trail.map((t) => ({
              name: t.label,
              url: t.to,
            })),
          ),
        ),
        jsonLd(faqSchema(seo.faq)),
        jsonLd(organizationSchema()),
        jsonLd(websiteSchema()),
      ],

    };
  },
  component: MoversCityPage,
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

function MoversCityPage() {
  const { facts, seo } = Route.useLoaderData() as { facts: CityFacts; seo: MoversSeoContent };

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Movers", to: "/cities" },
          { label: `${facts.city}, ${facts.stateCode}` },
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight">{seo.h1}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="flex items-center gap-2">
            <span className="flex text-ochre" aria-label="Rated 5 out of 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
            <span className="text-sm font-semibold">Licensed local moving companies</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> DOT/MC verified
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" /> Quote in under 60 seconds
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BadgeCheck className="h-4 w-4" /> One company, no call blasts
          </span>
        </div>
        {seo.intro.map((p, i) => (
          <p key={i} className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </section>

      {/* The one official Easy Move Pro calculator — embedded, never cloned */}
      <section id="calculator" className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-6">
        <QuoteCalculator />
        <p className="mt-4 text-sm text-muted-foreground">
          Prefer the dedicated calculator page?{" "}
          <Link to={seo.calculatorPath as "/"} className="text-primary underline">
            Open the {facts.city} moving calculator
          </Link>
          .
        </p>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14">
          {seo.sections.map((s, i) => (
            <div key={i} className={i === 0 ? "" : "mt-10"}>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">
                {s.h2}
              </h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.subsections?.map((sub, j) => (
                <div key={j} className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    {sub.h3}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{sub.body}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <Faq items={seo.faq} />
      <InternalLinks title={`More moving resources near ${facts.city}`} links={seo.internalLinks} />
    </SiteLayout>
  );
}
