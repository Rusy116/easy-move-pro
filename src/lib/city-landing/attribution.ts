// ---------------------------------------------------------------------------
// City-scoped lead attribution.
//
// Every lead created from a city landing page must carry the city it came from
// plus the campaign params of the visit, so the CRM can report revenue per
// city page. This module is browser-safe and has no Supabase dependency.
// ---------------------------------------------------------------------------

/** Landing-page context handed to the calculator by a city route. */
export interface LandingContext {
  /** Landing slug, e.g. "glendale-ca" — the join key back to the city page. */
  citySlug: string;
  city: string;
  stateCode: string;
  /** Path of the page the visitor converted on. */
  path: string;
  /** Primary ZIP for the city, used to prefill the origin field. */
  zip?: string | null;
}

export type UtmParams = Record<string, string>;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

const UTM_STORAGE_KEY = "emp.attribution.v1";

/**
 * Reads campaign params from the URL and remembers them for the session, so a
 * visitor who lands with UTMs and converts two clicks later is still credited.
 */
export function readUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  const out: UtmParams = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) out[key] = value.slice(0, 200);
    }
    if (Object.keys(out).length) {
      if (document.referrer) out["referrer"] = document.referrer.slice(0, 300);
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(out));
      return out;
    }
    const stored = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as UtmParams;
    if (document.referrer) return { referrer: document.referrer.slice(0, 300) };
  } catch {
    /* storage or URL unavailable — attribution is best-effort */
  }
  return out;
}

/** Columns merged into the `quotes` insert. One lead, fully attributed. */
export function attributionColumns(landing?: LandingContext | null) {
  const utm = readUtmParams();
  return {
    landing_city_slug: landing?.citySlug ?? null,
    landing_city: landing?.city ?? null,
    landing_state: landing?.stateCode ?? null,
    landing_path:
      landing?.path ?? (typeof window !== "undefined" ? window.location.pathname : null),
    utm: (Object.keys(utm).length ? utm : null) as unknown as never,
  };
}
