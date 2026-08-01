import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { placeDetails, placesAutocomplete } from "@/lib/places.functions";
import { hasPublicBrowserPlacesKey, loadGoogleMaps } from "@/lib/google-maps-loader";
import { cn } from "@/lib/utils";

export interface PlaceSelection {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Props {
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (place: PlaceSelection) => void;
  biasZip?: string;
  /** Optional circular bias for suggestions (e.g. selected city centroid). */
  bias?: { lat: number; lng: number; radiusMeters?: number } | null;
  disabled?: boolean;
  className?: string;
}

/** Normalized suggestion — works for both the browser JS API and the server fallback. */
interface Row {
  placeId: string;
  main: string;
  secondary: string;
}

/**
 * Places API (New) address autocomplete through the server connector gateway.
 * The server path is the single source of truth so production domains are not
 * affected by browser referrer restrictions, missing public keys, or competing
 * browser/server result ordering.
 */
export function AddressAutocomplete({
  placeholder,
  value,
  onChangeText,
  onSelect,
  biasZip,
  bias,
  disabled: disabledProp,
  className,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const normalizedBiasZip = biasZip && /^\d{5}$/.test(biasZip) ? biasZip : undefined;

  async function fetchViaServer(q: string): Promise<{ rows: Row[]; error?: string }> {
    const res = await placesAutocomplete({
      data: {
        input: q,
        ...(normalizedBiasZip ? { zip: normalizedBiasZip } : {}),
        ...(bias ? { lat: bias.lat, lng: bias.lng, radius: bias.radiusMeters ?? 15000 } : {}),
      },
    });
    return {
      rows: res.suggestions.map((s) => ({
        placeId: s.placeId,
        main: s.mainText || s.text,
        secondary: s.secondaryText,
      })),
      error: res.error,
    };
  }

  /**
   * Browser fallback used when the deployment has no server-side Google Maps
   * credential (e.g. a self-hosted/Vercel build without GOOGLE_MAPS_SERVER_KEY).
   * Keeps street autocomplete working exactly like the Lovable preview.
   */
  async function fetchViaBrowser(q: string): Promise<Row[]> {
    if (!(await hasPublicBrowserPlacesKey())) return [];
    const g = await loadGoogleMaps();
    const places = (g.maps as unknown as { places?: Record<string, unknown> }).places;
    const Suggestion = places?.["AutocompleteSuggestion"] as
      | {
          fetchAutocompleteSuggestions: (req: Record<string, unknown>) => Promise<{
            suggestions: Array<{
              placePrediction?: {
                placeId: string;
                mainText?: { text?: string };
                secondaryText?: { text?: string };
                text?: { text?: string };
              };
            }>;
          }>;
        }
      | undefined;
    if (!Suggestion) return [];
    const request: Record<string, unknown> = {
      input: q,
      includedRegionCodes: ["us"],
    };
    if (bias) {
      request.locationBias = {
        center: { lat: bias.lat, lng: bias.lng },
        radius: bias.radiusMeters ?? 15000,
      };
    }
    const { suggestions } = await Suggestion.fetchAutocompleteSuggestions(request);
    return suggestions
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .slice(0, 6)
      .map((p) => ({
        placeId: p.placeId,
        main: p.mainText?.text ?? p.text?.text ?? "",
        secondary: p.secondaryText?.text ?? "",
      }));
  }

  // Debounced fetch of suggestions. The server gateway is intentionally the
  // only provider: ZIP/city/state biasing, credentials, and error messaging all
  // live in one place instead of racing duplicate browser/server lookups.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reqId = ++reqIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      let next: Row[] = [];
      let message: string | null = null;

      try {
        const fromServer = await fetchViaServer(q);
        next = fromServer.rows;
        if (next.length === 0 && fromServer.error) {
          // Never surface configuration details to visitors — the browser
          // fallback below may still succeed, and typing must stay unblocked.
          console.error(`[places] autocomplete unavailable: ${fromServer.error}`);
          message = "Keep typing your address — suggestions are unavailable right now.";
        }
      } catch (e) {
        console.error("[places] autocomplete request failed", e);
        message = "Keep typing your address — suggestions are unavailable right now.";
      }

      // Server path unavailable (no server credential in this deployment):
      // fall back to the browser Places API so production behaves like preview.
      if (next.length === 0) {
        try {
          const fromBrowser = await fetchViaBrowser(q);
          if (fromBrowser.length > 0) {
            next = fromBrowser;
            message = null;
          }
        } catch (e) {
          console.error("[places] browser autocomplete fallback failed", e);
        }
      }

      if (reqId !== reqIdRef.current) return;
      setRows(next);
      setError(next.length > 0 ? null : message);
      setOpen(next.length > 0);
      setActiveIdx(0);
      setLoading(false);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, bias?.lat, bias?.lng, bias?.radiusMeters, normalizedBiasZip]);

  async function detailsViaBrowser(placeId: string): Promise<PlaceSelection | null> {
    if (!(await hasPublicBrowserPlacesKey())) return null;
    const g = await loadGoogleMaps();
    const PlaceCtor = (g.maps as unknown as { places?: Record<string, unknown> }).places?.[
      "Place"
    ] as
      | (new (o: { id: string }) => {
          fetchFields: (o: { fields: string[] }) => Promise<unknown>;
          formattedAddress?: string | null;
          addressComponents?: Array<{ longText?: string; shortText?: string; types: string[] }>;
          location?: { lat: () => number; lng: () => number } | null;
        })
      | undefined;
    if (!PlaceCtor) return null;
    const place = new PlaceCtor({ id: placeId });
    await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "location"] });
    const comps = place.addressComponents ?? [];
    const short = (t: string) => comps.find((c) => c.types.includes(t))?.shortText ?? "";
    const long = (t: string) => comps.find((c) => c.types.includes(t))?.longText ?? "";
    const formattedAddress = place.formattedAddress ?? "";
    const street = [short("street_number"), long("route")].filter(Boolean).join(" ");
    return {
      formattedAddress,
      streetAddress: street || formattedAddress,
      city: long("locality") || long("sublocality") || long("administrative_area_level_2"),
      state: short("administrative_area_level_1"),
      zip: short("postal_code"),
      lat: place.location?.lat() ?? 0,
      lng: place.location?.lng() ?? 0,
      placeId,
    };
  }

  async function pick(row: Row) {
    if (!row) return;
    setOpen(false);
    setLoading(true);
    try {
      let selection: PlaceSelection | null = null;

      if (!selection && row.placeId) {
        const d = await placeDetails({ data: { placeId: row.placeId } });
        if (d) selection = d;
      }

      if (!selection && row.placeId) {
        selection = await detailsViaBrowser(row.placeId).catch(() => null);
      }

      if (!selection) {
        setError("Couldn't load that address — try another suggestion");
        return;
      }

      onChangeText(selection.formattedAddress || row.main);
      onSelect(selection);
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  // Never block typing on the Maps JS load: until it settles, queries go to the
  // server gateway, so a slow/blocked script can't freeze the field.
  const disabled = !!disabledProp;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChangeText(e.target.value.slice(0, 200))}
          onFocus={() => rows.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || rows.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(rows[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="pl-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && rows.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {rows.map((r, i) => (
            <button
              key={r.placeId || i}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === activeIdx ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{r.main}</div>
                {r.secondary && (
                  <div className="truncate text-xs text-muted-foreground">{r.secondary}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}
