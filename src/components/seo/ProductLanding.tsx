import { SiteLayout } from "@/components/site/SiteLayout";
import {
  SeoHero, FeatureGrid, Faq, Cta, Testimonials, Statistics, Breadcrumbs, InternalLinks,
} from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo/schema";
import { PRODUCT_PAGES, type ProductPage } from "@/lib/seo/content";

export function productHead(slug: string) {
  const p = PRODUCT_PAGES.find((x) => x.slug === slug)!;
  return {
    meta: seoMeta({ title: p.title, description: p.description, path: p.route }),
    links: [{ rel: "canonical", href: p.route }],
    scripts: [
      jsonLd(serviceSchema({ name: p.h1, description: p.description })),
      jsonLd(breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Partners", url: "/partners" },
        { name: p.h1, url: p.route },
      ])),
      jsonLd(faqSchema(p.faq)),
    ],
  };
}

export function ProductLanding({ slug }: { slug: string }) {
  const p = PRODUCT_PAGES.find((x) => x.slug === slug)! as ProductPage;
  return (
    <SiteLayout>
      <Breadcrumbs items={[
        { label: "Home", to: "/" },
        { label: "Partners", to: "/partners" },
        { label: p.h1 },
      ]} />
      <SeoHero eyebrow="For Moving Companies" title={p.h1} subhead={p.subhead} />
      <Statistics
        items={[
          { value: "12 hrs", label: "Exclusive SLA" },
          { value: "1–3 days", label: "Onboarding" },
          { value: "$0", label: "Monthly minimum" },
          { value: "50 states", label: "Coverage" },
        ]}
      />
      <FeatureGrid title={`What's included in ${p.h1.toLowerCase()}`} items={p.features} />
      <Testimonials />
      <Faq items={p.faq} />
      <InternalLinks
        title="Related for movers"
        links={PRODUCT_PAGES.filter((x) => x.slug !== slug).map((x) => ({ label: x.h1, to: x.route }))}
      />
      <Cta />
    </SiteLayout>
  );
}
