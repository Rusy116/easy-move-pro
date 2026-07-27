import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { placeDetails, placesAutocomplete } from "@/lib/places.functions";
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
  /** Present only for browser-JS suggestions; enables session-token details. */
  prediction?: google.maps.places.PlacePrediction;
}

/**
 * Places API (New) address autocomplete.
 *
 * Primary path: Maps JS `AutocompleteSuggestion` in the browser.
 * Fallback path: server function through the Google Maps connector gateway.
 * The fallback keeps suggestions working when the referrer-restricted browser
 * key is rejected (403) on the current origin, or when the Maps JS script can't
 * load at all — previously those failures were swallowed and the dropdown
 * silently stayed empty.
 */
export function AddressAutocomplete({
  placeholder,
  value,
  onChangeText,
  onSelect,
  bias,
  disabled: disabledProp,
  className,
}: Props) {
  const [jsReady, setJsReady] = useState(false);
  const [jsFailed, setJsFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Once the browser path errors we stop retrying it for the rest of the session.
  const useServerRef = useRef(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  // Load Maps JS API + Places library (best effort — failure falls back to server)
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        await g.maps.importLibrary("places");
        if (cancelled) return;
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
        setJsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        useServerRef.current = true;
        setJsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function fetchViaBrowser(q: string): Promise<Row[]> {
    const { AutocompleteSuggestion } = (await window.google.maps.importLibrary(
      "places"
    )) as google.maps.PlacesLibrary;
    const request: google.maps.places.AutocompleteRequest = {
      input: q,
      sessionToken: sessionTokenRef.current ?? undefined,
      includedRegionCodes: ["us"],
    };
    if (bias) {
      request.locationBias = {
        center: { lat: bias.lat, lng: bias.lng },
        radius: bias.radiusMeters ?? 15000,
      } as google.maps.CircleLiteral;
    }
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    return suggestions
      .map((s) => s.placePrediction)
      .filter((p): p is google.maps.places.PlacePrediction => !!p)
      .slice(0, 6)
      .map((p) => ({
        placeId: p.placeId ?? "",
        main: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      }));
  }

  async function fetchViaServer(q: string): Promise<Row[]> {
    const res = await placesAutocomplete({
      data: {
        input: q,
        ...(bias ? { lat: bias.lat, lng: bias.lng, radius: bias.radiusMeters ?? 15000 } : {}),
      },
    });
    return res.map((s) => ({
      placeId: s.placeId,
      main: s.mainText || s.text,
      secondary: s.secondaryText,
    }));
  }

  // Debounced fetch of suggestions
  useEffect(() => {
    if (!jsReady && !jsFailed) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reqId = ++reqIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      let next: Row[] = [];
      let failed = false;
      let tryServer = useServerRef.current;
      if (!useServerRef.current) {
        try {
          next = await fetchViaBrowser(q);
          // A referrer-blocked key can resolve with zero suggestions instead of
          // rejecting, so an empty result also falls through to the server.
          if (next.length === 0) tryServer = true;
        } catch {
          // Browser key rejected (referrer restriction) or transient API error —
          // switch to the server gateway for the rest of the session.
          useServerRef.current = true;
          tryServer = true;
        }
      }

      if (tryServer) {
        try {
          const fromServer = await fetchViaServer(q);
          if (fromServer.length > 0 || useServerRef.current) next = fromServer;
        } catch {
          failed = next.length === 0;
        }
      }

      if (reqId !== reqIdRef.current) return;
      setRows(next);
      setError(failed ? "Address suggestions are temporarily unavailable" : null);
      setOpen(next.length > 0);
      setActiveIdx(0);
      setLoading(false);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, jsReady, jsFailed, bias?.lat, bias?.lng, bias?.radiusMeters]);

  async function pick(row: Row) {
    if (!row) return;
    setOpen(false);
    setLoading(true);
    try {
      let selection: PlaceSelection | null = null;

      if (row.prediction && !useServerRef.current) {
        try {
          const place = row.prediction.toPlace();
          await place.fetchFields({
            fields: ["formattedAddress", "addressComponents", "location", "id"],
          });
          const comps = place.addressComponents ?? [];
          const short = (type: string) =>
            comps.find((c) => c.types.includes(type))?.shortText ?? "";
          const long = (type: string) =>
            comps.find((c) => c.types.includes(type))?.longText ?? "";
          const streetAddress = [short("street_number"), long("route")]
            .filter(Boolean)
            .join(" ");
          const formatted = place.formattedAddress ?? row.prediction.text.text;
          selection = {
            formattedAddress: formatted,
            streetAddress: streetAddress || formatted,
            city:
              long("locality") ||
              long("sublocality") ||
              long("postal_town") ||
              long("administrative_area_level_2"),
            state: short("administrative_area_level_1"),
            zip: short("postal_code"),
            lat: place.location?.lat() ?? 0,
            lng: place.location?.lng() ?? 0,
            placeId: place.id ?? row.placeId,
          };
          // Session token is consumed on details; mint a new one for the next query
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        } catch {
          useServerRef.current = true;
        }
      }

      if (!selection && row.placeId) {
        const d = await placeDetails({ data: { placeId: row.placeId } });
        if (d) selection = d;
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

  const disabled = disabledProp || (!jsReady && !jsFailed);

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
                i === activeIdx ? "bg-muted" : "hover:bg-muted/60"
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
