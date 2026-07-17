import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
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
  className?: string;
}

type Suggestion = google.maps.places.AutocompleteSuggestion;

/**
 * Places API (New) address autocomplete. Uses AutocompleteSuggestion (not the
 * legacy `Autocomplete` widget) and Place.fetchFields for details.
 * Emits a fully geocoded `PlaceSelection` (address + city + state + ZIP + lat/lng).
 */
export function AddressAutocomplete({
  placeholder,
  value,
  onChangeText,
  onSelect,
  className,
}: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Load Maps JS API + Places library
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        await g.maps.importLibrary("places");
        if (cancelled) return;
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
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

  // Debounced fetch of suggestions
  useEffect(() => {
    if (!ready) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = (await window.google.maps.importLibrary(
          "places"
        )) as google.maps.PlacesLibrary;
        const { suggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ["us"],
          });
        setSuggestions(suggestions.slice(0, 6));
        setOpen(true);
        setActiveIdx(0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, ready]);

  async function pick(s: Suggestion) {
    const pred = s.placePrediction;
    if (!pred) return;
    setOpen(false);
    setLoading(true);
    try {
      const place = pred.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents", "location", "id"],
      });
      const comps = place.addressComponents ?? [];
      const get = (type: string) =>
        comps.find((c) => c.types.includes(type))?.shortText ?? "";
      const longGet = (type: string) =>
        comps.find((c) => c.types.includes(type))?.longText ?? "";

      const streetNumber = get("street_number");
      const route = longGet("route");
      const streetAddress = [streetNumber, route].filter(Boolean).join(" ");
      const city =
        longGet("locality") ||
        longGet("sublocality") ||
        longGet("postal_town") ||
        longGet("administrative_area_level_2");
      const state = get("administrative_area_level_1");
      const zip = get("postal_code");
      const lat = place.location?.lat() ?? 0;
      const lng = place.location?.lng() ?? 0;
      const formatted = place.formattedAddress ?? pred.text.text;

      onChangeText(formatted);
      onSelect({
        formattedAddress: formatted,
        streetAddress: streetAddress || formatted,
        city,
        state,
        zip,
        lat,
        lng,
        placeId: place.id ?? "",
      });

      // Session token is consumed on details; mint a new one for the next query
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }

  const disabled = !ready && !error;

  const primaryText = useMemo(
    () => (s: Suggestion) => s.placePrediction?.mainText?.text ?? s.placePrediction?.text.text ?? "",
    []
  );
  const secondaryText = useMemo(
    () => (s: Suggestion) => s.placePrediction?.secondaryText?.text ?? "",
    []
  );

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChangeText(e.target.value.slice(0, 200))}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(suggestions[activeIdx]);
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

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={s.placePrediction?.placeId ?? i}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === activeIdx ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{primaryText(s)}</div>
                {secondaryText(s) && (
                  <div className="truncate text-xs text-muted-foreground">{secondaryText(s)}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-1 text-xs text-destructive">Address autocomplete unavailable</div>
      )}
    </div>
  );
}
