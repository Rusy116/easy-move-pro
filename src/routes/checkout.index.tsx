import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/store/CoverImage";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { useCart, type CartLine } from "@/lib/store/cart";
import { money } from "@/lib/pdf-store/catalog";
import { useT } from "@/i18n";

export const Route = createFileRoute("/checkout/")({
  head: () => ({
    meta: [
      { title: "Checkout — Easy Moving" },
      {
        name: "description",
        content:
          "Secure checkout for Easy Moving printable planners and checklists. No account required — your PDFs are emailed instantly.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartCheckoutPage,
});

function CartCheckoutPage() {
  const t = useT();
  const live = useCart();
  // Once checkout starts we render a frozen snapshot, so clearing the cart
  // after payment never tears down the mounted Stripe form.
  const [frozen, setFrozen] = useState<CartLine[] | null>(null);
  const lines = frozen ?? live.lines;
  const total = lines.reduce((sum, l) => sum + Number(l.priceCents ?? 0), 0);

  return (
    <SiteLayout hideFooter>
      <PaymentTestModeBanner />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-14">
        <div className="order-2 lg:order-1">
          {lines.length === 0 ? (
            <div className="card-premium p-10 text-center">
              <p className="font-serif text-xl">{t("pub.cart.empty")}</p>
              <Link to="/products" className="mt-4 inline-block">
                <Button className="rounded-full">{t("pub.cart.browseStore")}</Button>
              </Link>
            </div>
          ) : (
            <CheckoutForm
              fromCart
              onStarted={() => setFrozen(live.lines)}
              lines={lines.map((l) => ({
                slug: l.slug,
                title: l.title,
                priceCents: l.priceCents,
              }))}
            />
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="card-premium p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("pub.checkout.orderSummary")}
            </p>
            <ul className="mt-4 space-y-3">
              {lines.map((line) => (
                <li key={line.slug} className="flex gap-3">
                  <CoverImage
                    slug={line.slug}
                    title={line.title}
                    coverUrl={line.coverUrl ?? null}
                    className="w-14 shrink-0 overflow-hidden rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base leading-snug">{line.title}</p>
                    <p className="text-xs text-muted-foreground">{t("pub.checkout.pdf")}</p>
                  </div>
                  <span className="text-sm tabular-nums">{money(line.priceCents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">{t("pub.common.total")}</span>
              <span className="text-xl font-semibold">{money(total)}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("pub.checkout.instantDownloadMulti")}
            </p>
            <Link to="/cart" className="mt-3 inline-block text-xs underline">
              {t("pub.checkout.editCart")}
            </Link>
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}
