import { CoverImage } from "@/components/store/CoverImage";
import type { CoverSpec } from "@/lib/pdf-store/catalog";
import { cn } from "@/lib/utils";

/**
 * Small 3:4 product cover thumbnail. Renders the AI-generated cover when the
 * product has one and degrades to the deterministic SVG CoverArt otherwise.
 */
export function ProductThumb({
  slug,
  title,
  coverUrl,
  spec,
  className,
}: {
  slug: string;
  title: string;
  coverUrl?: string | null;
  spec?: CoverSpec | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted",
        className,
      )}
    >
      <CoverImage
        slug={slug}
        title={title}
        coverUrl={coverUrl}
        spec={spec ?? null}
        sizes="64px"
      />
    </div>
  );
}
