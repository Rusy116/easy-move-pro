import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/store/CoverImage";
import { useCart } from "@/lib/store/cart";
import { money } from "@/lib/pdf-store/catalog";
import { useT } from "@/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Easy Moving" },
      {
        name: "description",
        content: "Review the Easy Moving printable planners and checklists in your cart.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const t = useT();
  const cart = useCart();

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-3xl">{t("pub.cart.title")}</h1>

        {cart.lines.length === 0 ? (
          <div className="card-premium mt-6 p-10 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 font-serif text-lg">{t("pub.cart.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pub.cart.emptyHint")}
            </p>
            <Link to="/products" className="mt-5 inline-block">
              <Button className="rounded-full">{t("pub.cart.browseStore")}</Button>
            </Link>
          </div>
        ) : (
          <div className="card-premium mt-6 p-5 sm:p-6">
            <ul className="divide-y divide-border/60">
              {cart.lines.map((line) => (
                <li key={line.slug} className="flex items-center gap-4 py-4">
                  <CoverImage
                    slug={line.slug}
                    title={line.title}
                    coverUrl={line.coverUrl ?? null}
                    className="w-14 shrink-0 overflow-hidden rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/products/$slug"
                      params={{ slug: line.slug }}
                      className="font-serif text-lg leading-snug hover:underline"
                    >
                      {line.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t("pub.cart.pdfInstant")}</p>
                  </div>
                  <span className="font-semibold tabular-nums">{money(line.priceCents)}</span>
                  <button
                    type="button"
                    aria-label={t("pub.cart.removeItem", { title: line.title })}
                    className="text-muted-foreground transition hover:text-destructive"
                    onClick={() => cart.remove(line.slug)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">{t("pub.common.total")}</span>
              <span className="text-xl font-semibold">{money(cart.total)}</span>
            </div>

            <Link to="/checkout" className="mt-5 block">
              <Button size="lg" className="w-full rounded-full">
                {t("pub.cart.checkout")}
              </Button>
            </Link>
            <button
              type="button"
              onClick={cart.clear}
              className="mt-3 w-full text-xs text-muted-foreground underline"
            >
              {t("pub.cart.emptyCartBtn")}
            </button>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
