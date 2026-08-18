import { Check, ShoppingCart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import type { PdfProduct } from "@/lib/pdf-store/catalog";

interface Props {
  p: Pick<PdfProduct, "slug" | "title" | "price_cents" | "cover_url">;
  size?: "sm" | "default" | "lg";
  className?: string;
}

/** Adds a paid PDF to the cart, then turns into a link to the cart. */
export function AddToCartButton({ p, size = "default", className }: Props) {
  const cart = useCart();
  const navigate = useNavigate();
  const inCart = cart.has(p.slug);

  if (inCart) {
    return (
      <Button
        size={size}
        variant="outline"
        className={`rounded-full ${className ?? ""}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigate({ to: "/cart" });
        }}
      >
        <Check className="mr-1.5 h-4 w-4" /> In cart
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="outline"
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
      <ShoppingCart className="mr-1.5 h-4 w-4" /> Add to cart
    </Button>
  );
}
