import { resolveCoverSpec, type CoverSpec } from "@/lib/pdf-store/catalog";

/**
 * Generated product artwork. The Cover Design Agent stores a recipe (palette,
 * motif, layout) and the store renders it as crisp vector art — no binaries,
 * no storage, infinitely scalable across thousands of products.
 */
export function CoverArt({
  slug,
  title,
  spec,
  className = "",
  compact = false,
}: {
  slug: string;
  title: string;
  spec?: CoverSpec | null;
  className?: string;
  compact?: boolean;
}) {
  const { palette, motif, layout } = resolveCoverSpec(slug, spec);
  const [base, accent] = palette;
  const words = title.split(" ");
  const head = words.slice(0, 4).join(" ");
  const tail = words.slice(4, 9).join(" ");

  return (
    <svg
      viewBox="0 0 400 520"
      role="img"
      aria-label={`${title} cover`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="520" fill={base} />
      {layout === "split" && <rect x="0" y="300" width="400" height="220" fill={accent} opacity="0.92" />}
      {layout === "badge" && <circle cx="330" cy="80" r="120" fill={accent} opacity="0.25" />}
      {layout === "stack" && (
        <>
          <rect x="-40" y="380" width="480" height="60" fill={accent} opacity="0.9" />
          <rect x="-40" y="450" width="480" height="18" fill={accent} opacity="0.45" />
        </>
      )}

      <g opacity="0.28" stroke={accent} fill="none" strokeWidth="6">
        {motif === "boxes" && (
          <>
            <rect x="250" y="150" width="110" height="90" />
            <path d="M250 180 h110 M305 150 v90" />
          </>
        )}
        {motif === "map" && <path d="M240 220 l40-30 l40 25 l40-25 v90 l-40 25 l-40-25 l-40 30z" />}
        {motif === "clock" && (
          <>
            <circle cx="305" cy="195" r="55" />
            <path d="M305 160 v38 l26 16" />
          </>
        )}
        {motif === "chart" && <path d="M250 250 v-40 M285 250 v-70 M320 250 v-100 M355 250 v-60" strokeWidth="14" />}
        {motif === "home" && <path d="M245 210 l60-50 l60 50 v70 h-120z" />}
        {motif === "truck" && (
          <>
            <rect x="240" y="175" width="80" height="55" />
            <path d="M320 195 h30 l18 22 v13 h-48z" />
            <circle cx="265" cy="240" r="12" />
            <circle cx="340" cy="240" r="12" />
          </>
        )}
      </g>

      <text x="32" y="70" fill="#ffffff" opacity="0.75" fontSize="15" letterSpacing="4" fontFamily="Helvetica, Arial, sans-serif">
        EASY MOVING
      </text>
      <text x="32" y="200" fill="#ffffff" fontSize={compact ? 40 : 44} fontWeight="700" fontFamily="Georgia, serif">
        {head}
      </text>
      {tail && (
        <text x="32" y={252} fill="#ffffff" opacity="0.86" fontSize="24" fontFamily="Georgia, serif">
          {tail}
        </text>
      )}
      <rect x="32" y="288" width="70" height="5" fill={accent} />
      <text x="32" y="500" fill="#ffffff" opacity="0.7" fontSize="14" fontFamily="Helvetica, Arial, sans-serif">
        Printable PDF
      </text>
    </svg>
  );
}
