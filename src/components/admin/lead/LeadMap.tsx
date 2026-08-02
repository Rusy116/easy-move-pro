import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

/** Embedded Google Map showing the origin and destination pins with a route line. */
export function LeadMap({
  origin,
  destination,
  originLabel,
  destinationLabel,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  originLabel?: string | null;
  destinationLabel?: string | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!origin && !destination) return;
    void (async () => {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !ref.current) return;
        const pts = [origin, destination].filter(Boolean) as Array<{ lat: number; lng: number }>;
        const map = new g.maps.Map(ref.current, {
          center: pts[0],
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        const bounds = new g.maps.LatLngBounds();
        if (origin) {
          new g.maps.Marker({ position: origin, map, label: "A", title: originLabel ?? "Origin" });
          bounds.extend(origin);
        }
        if (destination) {
          new g.maps.Marker({
            position: destination,
            map,
            label: "B",
            title: destinationLabel ?? "Destination",
          });
          bounds.extend(destination);
        }
        if (origin && destination) {
          new g.maps.Polyline({
            path: [origin, destination],
            map,
            strokeOpacity: 0.7,
            strokeWeight: 3,
          });
          map.fitBounds(bounds, 48);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  if (!origin && !destination) return null;

  const q = encodeURIComponent(
    [originLabel, destinationLabel].filter(Boolean).join(" to ") ||
      `${origin?.lat},${origin?.lng}`,
  );

  if (failed) {
    return (
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Open route in Google Maps
      </a>
    );
  }

  return <div ref={ref} className="h-56 w-full overflow-hidden rounded-lg border border-border" />;
}
