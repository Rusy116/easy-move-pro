import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  SeoHero,
  ComparisonTable,
  Faq,
  Cta,
  Breadcrumbs,
  InternalLinks,
} from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { comparisonBySlug, COMPARISON_PAGES } from "@/lib/seo/content";

export const Route = createFileRoute("/compare/$slug")({
  loader: ({ params }) => {
    const page = comparisonBySlug[params.slug];
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData)
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.page;
    const path = `/compare/${params.slug}`;
    return {
      meta: seoMeta({ title: p.title, description: p.description, path, type: "article" }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Compare", url: "/partners" },
            { name: p.competitor, url: path },
          ]),
        ),
        jsonLd(faqSchema(p.faq)),
      ],
    };
  },
  component: ComparePage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">Comparison not found</h1>
        <Link to="/partners" className="mt-6 inline-block text-primary underline">
          Back to partners
        </Link>
      </div>
    </SiteLayout>
  ),
});

function ComparePage() {
  const { page } = Route.useLoaderData();
  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Partners", to: "/partners" },
          { label: `vs ${page.competitor}` },
        ]}
      />
      <SeoHero eyebrow="Comparison" title={page.hero} subhead={page.intro} />
      <ComparisonTable competitor={page.competitor} rows={page.rows} />
      <Faq items={page.faq} />
      <InternalLinks
        title="More comparisons"
        links={COMPARISON_PAGES.filter((p) => p.slug !== page.slug).map((p) => ({
          label: `Easy Moving vs ${p.competitor}`,
          to: `/compare/${p.slug}`,
        }))}
      />
      <Cta />
    </SiteLayout>
  );
}
