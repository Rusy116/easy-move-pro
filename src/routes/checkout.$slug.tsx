import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CoverImage } from "@/components/store/CoverImage";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { getStoreProduct } from "@/lib/pdf-store.functions";
import { money } from "@/lib/pdf-store/catalog";

export const Route = createFileRoute("/checkout/$slug")({
  loader: async ({ params }) => {
    const res = await getStoreProduct({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return { product: res.product };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Checkout — ${loaderData.product.title} — Easy Moving`
          : "Checkout — Easy Moving",
      },
      {
        name: "description",
        content:
          "Secure checkout for Easy Moving printable planners and checklists. No account required — your PDF is emailed instantly.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
  errorComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">Checkout is temporarily unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh in a moment.</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">Product not found</p>
        <Link to="/products" className="mt-4 inline-block text-sm underline">
          Back to the store
        </Link>
      </section>
    </SiteLayout>
  ),
});

function CheckoutPage() {
  const { product } = Route.useLoaderData();
  const priceCents = Number(product.price_cents ?? 0);

  return (
    <SiteLayout hideFooter>
      {priceCents > 0 && <PaymentTestModeBanner />}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-14">
        <div className="order-2 lg:order-1">
          <CheckoutForm
            lines={[{ slug: product.slug, title: product.title, priceCents }]}
          />
        </div>

        <aside className="order-1 lg:order-2">
          <div className="card-premium p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Order summary
            </p>
            <div className="mt-4 flex gap-3">
              <CoverImage
                slug={product.slug}
                title={product.title}
                coverUrl={product.cover_url}
                spec={product.cover_spec}
                className="w-20 shrink-0 overflow-hidden rounded-lg"
              />
              <div className="min-w-0">
                <p className="font-serif text-lg leading-snug">{product.title}</p>
                <p className="text-xs text-muted-foreground">{product.page_count} pages · PDF</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-semibold">
                {priceCents > 0 ? money(priceCents) : "Free"}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {priceCents > 0
                ? "Instant download after payment, plus an emailed copy of your link."
                : "Instant download, plus an emailed copy of your link."}
            </p>
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}
