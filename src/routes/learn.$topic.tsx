import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SeoHero, Faq, Cta, Breadcrumbs, InternalLinks } from "@/components/seo/blocks";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { educationBySlug, EDUCATION_PAGES } from "@/lib/seo/content";

export const Route = createFileRoute("/learn/$topic")({
  loader: ({ params }) => {
    const page = educationBySlug[params.topic];
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData)
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.page;
    const path = `/learn/${params.topic}`;
    return {
      meta: seoMeta({ title: p.title, description: p.description, path, type: "article" }),
      links: [{ rel: "canonical", href: path }],
      scripts: [
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Learn", url: "/partners" },
            { name: p.title, url: path },
          ]),
        ),
        jsonLd(faqSchema(p.faq)),
      ],
    };
  },
  component: LearnPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold">Topic not found</h1>
        <Link to="/partners" className="mt-6 inline-block text-primary underline">
          Back to partners
        </Link>
      </div>
    </SiteLayout>
  ),
});

function LearnPage() {
  const { page } = Route.useLoaderData();
  return (
    <SiteLayout>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Partners", to: "/partners" },
          { label: page.hero },
        ]}
      />
      <SeoHero eyebrow="Guide" title={page.hero} subhead={page.description} />
      <section className="border-b border-border">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16 prose prose-neutral dark:prose-invert">
          {page.sections.map((s: { heading: string; body: string }) => (
            <div key={s.heading} className="mb-8">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                {s.heading}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </article>
      </section>
      <Faq items={page.faq} />
      <InternalLinks
        title="More guides"
        links={EDUCATION_PAGES.filter((p) => p.slug !== page.slug).map((p) => ({
          label: p.title,
          to: `/learn/${p.slug}`,
        }))}
      />
      <Cta />
    </SiteLayout>
  );
}
