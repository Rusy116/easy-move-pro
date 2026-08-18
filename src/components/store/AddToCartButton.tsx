import { Link } from "@tanstack/react-router";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import type { PdfProduct } from "@/lib/pdf-store/catalog";

/**
 * Adds a paid PDF to the basket, then turns into a link to the cart so the
 * buyer always has an obvious next step.
 */
export function AddToCartButton({
  p,
  size = "lg",
  className,
}: {
  p: Pick<PdfProduct, "slug" | "title" | "price_cents" | "cover_url">;
  size?: "sm" | "lg" | "default";
  className?: string;
}) {
  const cart = useCart();
  const inCart = cart.has(p.slug);

  if (inCart) {
    return (
      <Button asChild variant="secondary" size={size} className={`rounded-full ${className ?? ""}`}>
        <Link to="/cart">
          <Check className="mr-2 h-4 w-4" /> In your cart
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size={size}
      className={`rounded-full ${className ?? ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        cart.add({
          slug: p.slug,
          title: p.title,
          priceCents: Number(p.price_cents ?? 0),
          coverUrl: p.cover_url ?? null,
        });
      }}
    >
      <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
    </Button>
  );
}
