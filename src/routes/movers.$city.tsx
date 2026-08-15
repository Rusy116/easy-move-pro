import { cachePublicPage } from "@/lib/http-cache";
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
  websiteSchema, absoluteUrl } from "@/lib/seo/schema";
import { findCityFacts, parseLandingParam, type CityFacts } from "@/lib/city-landing/data";
import { buildCityLandingContent } from "@/lib/city-landing/content";
import { buildMoversSeoContent, type MoversSeoContent } from "@/lib/city-landing/seo-page";
import { buildCityHierarchy, type CityHierarchy } from "@/lib/city-landing/hierarchy";
import { getCityPageData } from "@/lib/city-landing/public.functions";
import { CityHeroImage } from "@/components/site/CityHeroImage";
import { resolveCityHero, type CityHero } from "@/lib/city-landing/media";
import type { LandingContext } from "@/lib/city-landing/attribution";


/**
 * Stage 2 of the City Calculator Factory. This page embeds the ONE official
 * Easy Move Pro calculator — it never re-implements it.
 *
 * Source of truth: `public.city_landing_pages`. The bundled dataset is only a
 * fallback for legacy slugs that predate the factory.
 */
export const Route = createFileRoute("/movers/$city")({
  loader: async ({ params }) => {
    await cachePublicPage();
    const record = await getCityPageData({ data: { slug: params.city.toLowerCase() } });
    if (record) {
      return {
        facts: record.facts,
        seo: record.seo,
        hierarchy: record.hierarchy,
        hero: record.hero,
        indexable: record.moversIndexable,
      };
    }
    const parsed = parseLandingParam(params.city);
    const facts = parsed ? findCityFacts(parsed.citySlug, parsed.stateCode) : null;
    if (!facts) throw notFound();
    return {
      facts,
      seo: buildMoversSeoContent(facts, buildCityLandingContent(facts)),
      hierarchy: buildCityHierarchy(facts),
      hero: resolveCityHero(null, facts),
      indexable: true,
    };

  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    }
    const { facts, seo, indexable } = loaderData as {
      facts: CityFacts;
      seo: MoversSeoContent;
      indexable: boolean;
    };
    const path = `/movers/${params.city}`;
    return {
      meta: seoMeta({
        title: seo.title,
        description: seo.metaDescription,
        path,
        index: indexable,
      }),
      links: [{ rel: "canonical", href: absoluteUrl(path) }],
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
  const { facts, seo, hierarchy, hero } = Route.useLoaderData() as {
    facts: CityFacts;
    seo: MoversSeoContent;
    hierarchy: CityHierarchy;
    hero: CityHero;
  };

  // Everything the CRM needs to credit this city page for the lead.
  const landing: LandingContext = {
    citySlug: facts.landingSlug,
    city: facts.city,
    stateCode: facts.stateCode,
    path: `/movers/${facts.landingSlug}`,
    zip: facts.zipCodes[0] ?? null,
  };

  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: facts.stateName, to: `/states/${facts.stateSlug}` },
          { label: hierarchy.county, to: hierarchy.countyPath },
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
        <CityHeroImage
          priority
          hero={hero}
          city={facts.city}
          stateCode={facts.stateCode}
          className="mt-8 aspect-[16/7]"
        />
        <a
          href="#calculator"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get My {facts.city} Moving Quote
        </a>
      </section>

      {/* The one official Easy Move Pro calculator — embedded, never cloned */}
      <section id="calculator" className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-6">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Price your move from {facts.city}, {facts.stateCode} — instant, itemized, no spam calls.
        </p>
        <QuoteCalculator landing={landing} />
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
      <InternalLinks
        title={`${facts.city} in context — county, state and metro`}
        links={hierarchy.up.map((l) => ({ label: l.label, to: l.to }))}
      />
      {hierarchy.down.length > 0 && (
        <InternalLinks
          title={`Smaller cities we serve around ${facts.city}`}
          links={hierarchy.down.map((l) => ({ label: l.label, to: l.to }))}
        />
      )}
      {hierarchy.lateral.length > 0 && (
        <InternalLinks
          title={`Comparable ${facts.stateName} cities`}
          links={hierarchy.lateral.map((l) => ({ label: l.label, to: l.to }))}
        />
      )}

    </SiteLayout>
  );
}
