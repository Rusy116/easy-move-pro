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
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema, absoluteUrl } from "@/lib/seo/schema";
import { comparisonBySlug, COMPARISON_PAGES } from "@/lib/seo/content";
import { useT } from "@/i18n";

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
      links: [{ rel: "canonical", href: absoluteUrl(path) }],
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
  notFoundComponent: () => <CompareNotFound />,
});

function CompareNotFound() {
  const t = useT();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">{t("pub.compare.notFound")}</h1>
        <Link to="/partners" className="mt-6 inline-block text-primary underline">
          {t("pub.compare.backToPartners")}
        </Link>
      </div>
    </SiteLayout>
  );
}

function ComparePage() {
  const t = useT();
  const { page } = Route.useLoaderData();
  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: t("pub.common.home"), to: "/" },
          { label: t("pub.common.partners"), to: "/partners" },
          { label: `vs ${page.competitor}` },
        ]}
      />
      <SeoHero eyebrow={t("pub.compare.eyebrow")} title={page.hero} subhead={page.intro} />
      <ComparisonTable competitor={page.competitor} rows={page.rows} />
      <Faq items={page.faq} />
      <InternalLinks
        title={t("pub.compare.moreComparisons")}
        links={COMPARISON_PAGES.filter((p) => p.slug !== page.slug).map((p) => ({
          label: `Easy Moving vs ${p.competitor}`,
          to: `/compare/${p.slug}`,
        }))}
      />
      <Cta />
    </SiteLayout>
  );
}
