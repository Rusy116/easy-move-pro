// Runtime lookup of the *public* (referrer-restricted) Google Maps browser key.
//
// The browser key is normally inlined at build time. On hosts where the build
// environment does not carry it (e.g. a Vercel deployment configured after the
// build, or env vars added without a rebuild), we resolve it at request time so
// address autocomplete keeps working without redeploying.

export function publicBrowserMapsKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
    ""
  );
}

export function publicMapsTrackingId(): string {
  return (
    process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ||
    process.env.GOOGLE_MAPS_TRACKING_ID ||
    ""
  );
}
