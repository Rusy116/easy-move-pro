import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CoverImage } from "@/components/store/CoverImage";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { getStoreProduct } from "@/lib/pdf-store.functions";
import { money } from "@/lib/pdf-store/catalog";
import { useT } from "@/i18n";

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
  errorComponent: () => <CheckoutError />,
  notFoundComponent: () => <CheckoutNotFound />,
});

function CheckoutError() {
  const t = useT();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">{t("pub.productsCategory.unavailable")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("pub.productsCategory.refresh")}</p>
      </section>
    </SiteLayout>
  );
}

function CheckoutNotFound() {
  const t = useT();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-serif text-xl">{t("pub.checkout.productNotFound")}</p>
        <Link to="/products" className="mt-4 inline-block text-sm underline">
          {t("pub.checkout.backToStore")}
        </Link>
      </section>
    </SiteLayout>
  );
}

function CheckoutPage() {
  const t = useT();
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
              {t("pub.checkout.orderSummary")}
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
                <p className="text-xs text-muted-foreground">{t("pub.checkout.pagesPdf", { count: product.page_count })}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">{t("pub.common.total")}</span>
              <span className="text-xl font-semibold">
                {priceCents > 0 ? money(priceCents) : t("pub.checkout.free")}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {priceCents > 0
                ? t("pub.checkout.instantDownloadPaid")
                : t("pub.checkout.instantDownloadFree")}
            </p>
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}
