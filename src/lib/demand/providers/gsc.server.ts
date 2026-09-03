// ---------------------------------------------------------------------------
// GOOGLE SEARCH CONSOLE — server-only demand provider (READ-ONLY).
//
// IMPORTANT INTERPRETATION RULE:
// GSC "impressions" are NOT Google search volume / monthly searches / market
// size. They only mean the property appeared in Google results for a query.
// Never relabel or convert these values into search volume.
//
// This module performs NO fallback: if the Search Console API fails, it throws.
// No AI, no synthetic metrics, no seed keywords.
// ---------------------------------------------------------------------------

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

export type GscQueryRow = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

function gatewayHeaders() {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const connectionApiKey = process.env["GOOGLE_SEARCH_CONSOLE_API_KEY"];
  if (!lovableApiKey || !connectionApiKey) {
    throw new Error("Search Console connection is not configured on the server");
  }
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
    "Content-Type": "application/json",
  };
}

/** Lists verified properties and returns the exact siteUrl matching `expected`. */
export async function resolveVerifiedProperty(expected: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers: gatewayHeaders() });
  if (!res.ok) {
    throw new Error(`Could not list Search Console properties [${res.status}]: ${await res.text()}`);
  }
  const { siteEntry = [] } = (await res.json()) as {
    siteEntry?: Array<{ siteUrl: string; permissionLevel?: string }>;
  };
  const match = siteEntry.find(
    (e) => e.siteUrl === expected && e.permissionLevel !== "siteUnverifiedUser",
  );
  if (!match) {
    throw new Error(`Verified Search Console property not found: ${expected}`);
  }
  return match.siteUrl;
}

/**
 * Query-level Search Analytics for a complete, closed date window.
 * Returns real API rows only; never fabricates or pads results.
 */
export async function fetchQueryRows(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit: number;
}): Promise<GscQueryRow[]> {
  const { siteUrl, startDate, endDate, rowLimit } = params;
  const res = await fetch(
    `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit,
        dataState: "final",
      }),
    },
  );
  if (res.status === 403) {
    throw new Error("The connected Google account cannot access this Search Console property");
  }
  if (!res.ok) {
    throw new Error(`Search Console query failed [${res.status}]: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    rows?: Array<{ keys?: string[]; impressions?: number; clicks?: number; ctr?: number; position?: number }>;
  };
  const rows = json.rows ?? [];
  return rows
    .filter((r) => typeof r.keys?.[0] === "string" && r.keys[0].trim().length > 0)
    .map((r) => ({
      query: r.keys![0]!.trim(),
      // Real GSC metrics only — stored verbatim.
      impressions: Math.round(Number(r.impressions ?? 0)),
      clicks: Math.round(Number(r.clicks ?? 0)),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }));
}
