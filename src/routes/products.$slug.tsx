import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Breadcrumbs, Faq, Cta } from "@/components/seo/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverArt } from "@/components/store/CoverArt";
import { ProductCard } from "@/components/store/ProductCard";
import { getStoreProduct } from "@/lib/pdf-store.functions";
import { money, DIFFICULTY_LABEL, type PdfDifficulty } from "@/lib/pdf-store/catalog";
import { seoMeta, jsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const res = await getStoreProduct({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product unavailable — Easy Moving" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    return {
      meta: seoMeta({
        title: p.seo_title ?? `${p.title} — Easy Moving`,
        description: p.meta_description ?? p.subtitle ?? `${p.title}: a printable PDF from Easy Moving.`,
        path: `/products/${p.slug}`,
      }),
      links: [{ rel: "canonical", href: `/products/${p.slug}` }],
      scripts: [
        jsonLd({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.title,
          description: p.meta_description ?? p.description,
          brand: { "@type": "Organization", name: "Easy Moving" },
          offers: {
            "@type": "Offer",
            price: (p.price_cents / 100).toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: `/products/${p.slug}`,
          },
        }),
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Store", url: "/products" },
            { name: p.title, url: `/products/${p.slug}` },
          ]),
        ),
        jsonLd(faqSchema(p.faq ?? [])),
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product: p, related } = Route.useLoaderData();

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Store", to: "/products" }, { label: p.title }]} />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <CoverArt slug={p.slug} title={p.title} spec={p.cover_spec} className="h-full w-full" />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full capitalize">{p.category_slug.replace(/-/g, " ")}</Badge>
            <Badge variant="outline" className="rounded-full">{DIFFICULTY_LABEL[p.difficulty as PdfDifficulty] ?? p.difficulty}</Badge>
            <Badge variant="outline" className="rounded-full">v{p.version}</Badge>
          </div>
          <h1 className="mt-4 font-serif text-3xl sm:text-4xl">{p.title}</h1>
          {p.subtitle && <p className="mt-2 text-muted-foreground">{p.subtitle}</p>}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{money(p.price_cents)}</span>
            {p.compare_at_cents ? (
              <span className="text-sm text-muted-foreground line-through">{money(p.compare_at_cents)}</span>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href={`/customer/library?claim=${p.slug}`}>Get this PDF</a>
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {p.page_count} pages · instant download · saved to your library
            </span>
          </div>

          {p.description && (
            <div className="mt-8 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {p.description.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {p.whats_included?.length ? (
            <div className="mt-8">
              <h2 className="font-serif text-xl">What's included</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {p.whats_included.map((f, i) => (
                  <li key={i}>· {f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {p.faq?.length ? <Faq items={p.faq} /> : null}

      {related.length ? (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 font-serif text-2xl">You may also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.slug} p={r} />
            ))}
          </div>
        </section>
      ) : null}

      <Cta />
    </SiteLayout>
  );
}
