// Lazy loader for the Google Maps JavaScript API (Places library).
// Loaded asynchronously via `loading=async` + a global callback.

import { isEasyMoveProductionHost, isLovableMapsHost } from "./google-maps-public-config";

let loaderPromise: Promise<typeof google> | null = null;

declare const __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__: string | undefined;
declare const __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__: string | undefined;

export function hasPublicBrowserPlacesKey(): boolean {
  return Boolean(
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
      (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined)
  );
}

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

  const host = window.location.hostname.toLowerCase();
  const configuredBrowserKey =
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__;

  // Production domains must use the customer-owned key whose HTTP referrers include:
  // https://easymove.pro/* and https://www.easymove.pro/*.
  // Never fall back to the Lovable-managed key on production/custom domains: that key
  // is intentionally restricted to Lovable preview/published hosts and causes 403s.
  const key = configuredBrowserKey || (isLovableMapsHost(host) ? configuredBrowserKey : undefined);

  const channel =
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ||
    __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__;
  if (!key) {
    const suffix = isEasyMoveProductionHost(host)
      ? " for easymove.pro; set VITE_GOOGLE_MAPS_BROWSER_KEY in Production"
      : "";
    return Promise.reject(new Error(`google-maps: browser key missing${suffix}`));
  }

  loaderPromise = new Promise<typeof google>((resolve, reject) => {
    // Without this, a blocked/hanging script leaves the promise pending forever
    // and every consumer stays in its "still loading" state indefinitely.
    const timer = window.setTimeout(() => {
      loaderPromise = null;
      reject(new Error("google-maps: script load timed out"));
    }, 8000);
    window.__easyMoveGmapsInit = () => {
      window.clearTimeout(timer);
      resolve(window.google);
    };
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
      window.clearTimeout(timer);
      loaderPromise = null;
      reject(new Error("google-maps: script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}
