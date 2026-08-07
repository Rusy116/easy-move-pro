import { CoverArt } from "@/components/store/CoverArt";
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
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={`${title} — printable moving PDF cover`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <CoverArt slug={slug} title={title} spec={spec ?? null} className="h-full w-full" />
      )}
    </div>
  );
}
