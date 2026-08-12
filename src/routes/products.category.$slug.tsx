import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SeoHero, Breadcrumbs, Cta } from "@/components/seo/blocks";
import { ProductCard } from "@/components/store/ProductCard";
import { listStoreProducts } from "@/lib/pdf-store.functions";
import { FALLBACK_CATEGORIES, type PdfProduct } from "@/lib/pdf-store/catalog";
import { seoMeta, jsonLd, breadcrumbSchema, absoluteUrl } from "@/lib/seo/schema";

const catFor = (slug: string) =>
  FALLBACK_CATEGORIES.find((c) => c.slug === slug) ?? {
    slug,
    name: slug.replace(/-/g, " "),
    description: "Printable moving documents.",
  };

export const Route = createFileRoute("/products/category/$slug")({
  loader: ({ params }) => listStoreProducts({ data: { category: params.slug } }),
  head: ({ params }) => {
    const c = catFor(params.slug);
    return {
      meta: seoMeta({
        title: `${c.name} — Printable Moving PDFs | Easy Moving`,
        description: `${c.description} Download ${c.name.toLowerCase()} as print-ready PDFs from Easy Moving.`,
        path: `/products/category/${params.slug}`,
      }),
      links: [{ rel: "canonical", href: absoluteUrl(`/products/category/${params.slug}`) }],
      scripts: [
        jsonLd(
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Store", url: "/products" },
            { name: c.name, url: `/products/category/${params.slug}` },
          ]),
        ),
      ],
    };
  },
  component: CategoryPage,
  errorComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">This category is temporarily unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh in a moment.</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">Category not found</p>
      </section>
    </SiteLayout>
  ),
});

function CategoryPage() {
  const products = Route.useLoaderData();
  const { slug } = Route.useParams();
  const c = catFor(slug);

  return (
    <SiteLayout>
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Store", to: "/products" }, { label: c.name }]} />
      <SeoHero eyebrow="Digital store" title={c.name} subhead={c.description ?? ""} />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p: PdfProduct) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No products in this category yet — new titles are published continuously.
          </p>
        )}
      </section>
      <Cta />
    </SiteLayout>
  );
}
