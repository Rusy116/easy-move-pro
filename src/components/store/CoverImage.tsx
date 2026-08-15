import { useEffect, useState } from "react";
import { CoverArt } from "@/components/store/CoverArt";
import type { CoverSpec } from "@/lib/pdf-store/catalog";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for rendering a product cover.
 *
 * Uses the stored cover image when the product has one and falls back to the
 * deterministic branded SVG artwork when the file is missing or fails to load,
 * so a broken <img> icon can never appear in the store.
 */
export function CoverImage({
  slug,
  title,
  coverUrl,
  spec,
  alt,
  className,
  imgClassName,
  eager = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  slug: string;
  title: string;
  coverUrl?: string | null;
  spec?: CoverSpec | null;
  alt?: string | null;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [coverUrl]);

  const showImage = Boolean(coverUrl) && !failed;

  return showImage ? (
    <img
      src={coverUrl as string}
      alt={alt ?? `${title} — printable moving PDF cover`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className, imgClassName)}
    />
  ) : (
    <CoverArt slug={slug} title={title} spec={spec ?? null} className={cn("h-full w-full", className)} />
  );
}
