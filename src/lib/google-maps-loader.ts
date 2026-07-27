// Lazy loader for the Google Maps JavaScript API (Places library).
// Uses the referrer-restricted browser key from the Google Maps connector.
// Loaded asynchronously via `loading=async` + a global callback.

let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __easyMoveGmapsInit?: () => void;
    google: typeof google;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google-maps: window unavailable"));
  }
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  // Prefer an operator-supplied key (works on any domain you own), otherwise the
  // Lovable-managed connector key (referrer-restricted to *.lovable.app /
  // *.lovableproject.com — it 403s on production domains).
  const key = (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
    import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY) as string | undefined;



  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    | string
    | undefined;
  if (!key) {
    return Promise.reject(new Error("google-maps: browser key missing"));
  }

  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    window.__easyMoveGmapsInit = () => resolve(window.google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__easyMoveGmapsInit",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error("google-maps: script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}
