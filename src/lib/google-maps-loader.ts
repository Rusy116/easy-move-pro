// Lazy loader for the Google Maps JavaScript API (Places library).
// Loaded asynchronously via `loading=async` + a global callback.

import { getMapsBrowserConfig } from "./maps-config.functions";

let loaderPromise: Promise<typeof google> | null = null;

declare const __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__: string | undefined;
declare const __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__: string | undefined;

function buildTimeBrowserKey(): string | undefined {
  return (
    (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    (typeof __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__ !== "undefined"
      ? __EASY_MOVE_GOOGLE_MAPS_BROWSER_KEY__
      : undefined) ||
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
    undefined
  );
}

function buildTimeChannel(): string | undefined {
  return (
    (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ||
    (typeof __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__ !== "undefined"
      ? __EASY_MOVE_GOOGLE_MAPS_TRACKING_ID__
      : undefined) ||
    undefined
  );
}

let runtimeConfigPromise: Promise<{ key?: string; channel?: string }> | null = null;

/**
 * Resolve the public browser key. Prefers the build-time inlined value, and
 * falls back to a runtime lookup on the server so a deployment that received
 * its Google Maps credentials *after* the build (or through non-VITE env vars)
 * still gets working autocomplete without a rebuild.
 */
async function resolveBrowserConfig(): Promise<{ key?: string; channel?: string }> {
  const key = buildTimeBrowserKey();
  if (key) return { key, channel: buildTimeChannel() };
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = getMapsBrowserConfig()
      .then((c) => ({ key: c.key || undefined, channel: c.channel || undefined }))
      .catch(() => ({}));
  }
  return runtimeConfigPromise;
}

/** True when a public browser Places key is available (build-time or runtime). */
export async function hasPublicBrowserPlacesKey(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return Boolean((await resolveBrowserConfig()).key);
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

  loaderPromise = (async () => {
    const { key, channel } = await resolveBrowserConfig();
    if (!key) throw new Error(`google-maps: browser key missing for ${host}`);

    return new Promise<typeof google>((resolve, reject) => {
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
  })().catch((e) => {
    loaderPromise = null;
    throw e;
  });

  return loaderPromise;
}
