// ---------------------------------------------------------------------------
// SR-2 — Fail-safe sitemap delivery (server only).
//
// LIVE GENERATION → VALIDATE → serve live when valid, otherwise serve the
// active SR-1 Last-Known-Good snapshot for the same file. If neither is
// available we return an explicit 5xx: an empty-but-valid sitemap is never
// served because of an infrastructure failure.
//
// SR-1 snapshot capture/promotion logic is not modified here.
// ---------------------------------------------------------------------------
import { checkLiveSitemap, SITEMAP_CONTENT_TYPE, type LiveCheckResult } from "./sitemap-delivery";
import type { PartKind } from "./sitemap-snapshot";

export const LIVE_BUILD_TIMEOUT_MS = 20_000;

export interface SnapshotRecord {
  releaseId: string;
  xml: string;
  urlCount: number;
  cityUrlCount: number;
  createdAt: string;
}

/** Read the active Last-Known-Good snapshot for one sitemap file. */
export async function readActiveSnapshot(partKey: string): Promise<SnapshotRecord | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("sitemap_snapshots")
      .select("release_id, xml, url_count, city_url_count, created_at")
      .eq("part_key", partKey)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data?.xml) return null;
    return {
      releaseId: data.release_id as string,
      xml: data.xml as string,
      urlCount: (data.url_count as number) ?? 0,
      cityUrlCount: (data.city_url_count as number) ?? 0,
      createdAt: (data.created_at as string) ?? "",
    };
  } catch {
    return null;
  }
}

function log(event: Record<string, unknown>) {
  // Server-side only. Nothing here is ever exposed in the public response.
  console.info(`[sitemap] ${JSON.stringify({ at: new Date().toISOString(), ...event })}`);
}

function xmlResponse(xml: string, source: "live" | "last_known_good", maxAge: number): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": SITEMAP_CONTENT_TYPE,
      "Cache-Control": `public, max-age=${maxAge}`,
      "X-Sitemap-Source": source,
    },
  });
}

async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("live sitemap generation timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface DeliverOptions {
  partKey: string;
  kind: PartKind;
  /** Primary path: render the sitemap from live data. May throw. */
  buildLive: () => Promise<string>;
  /**
   * When true, an empty live result is legitimate (e.g. a city part beyond the
   * current partition range) as long as no Last-Known-Good exists for the file.
   */
  emptyAllowedWhenNoSnapshot?: boolean;
  timeoutMs?: number;
  /** Test seam. */
  loadSnapshot?: (partKey: string) => Promise<SnapshotRecord | null>;
}

export async function deliverSitemap(opts: DeliverOptions): Promise<Response> {
  const loadSnapshot = opts.loadSnapshot ?? readActiveSnapshot;
  const snapshot = await loadSnapshot(opts.partKey);

  let liveXml: string | null = null;
  let failure: string | null = null;
  let check: LiveCheckResult | null = null;

  try {
    liveXml = await withTimeout(opts.buildLive, opts.timeoutMs ?? LIVE_BUILD_TIMEOUT_MS);
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  }

  if (liveXml !== null) {
    check = checkLiveSitemap({
      partKey: opts.partKey,
      kind: opts.kind,
      xml: liveXml,
      lastGoodUrlCount: snapshot?.urlCount ?? null,
      lastGoodCityUrlCount: snapshot?.cityUrlCount ?? null,
    });

    if (check.ok) {
      log({
        event: "live_served",
        file: opts.partKey,
        urls: check.urlCount,
        cityUrls: check.cityUrlCount,
      });
      return xmlResponse(liveXml, "live", 3600);
    }

    // A legitimately empty file (unused city partition) with no snapshot to
    // compare against keeps the historical behaviour: valid, empty, 200.
    if (check.code === "empty" && !snapshot && opts.emptyAllowedWhenNoSnapshot) {
      log({ event: "live_served", file: opts.partKey, urls: 0, note: "empty_partition" });
      return xmlResponse(liveXml, "live", 3600);
    }
    failure = `${check.code}: ${check.reason}`;
  }

  if (snapshot) {
    log({
      event: "fallback_activated",
      file: opts.partKey,
      reason: failure,
      releaseId: snapshot.releaseId,
      snapshotUrls: snapshot.urlCount,
      snapshotCityUrls: snapshot.cityUrlCount,
      snapshotCreatedAt: snapshot.createdAt,
    });
    return xmlResponse(snapshot.xml, "last_known_good", 300);
  }

  log({ event: "sitemap_unavailable", file: opts.partKey, reason: failure });
  return new Response("Sitemap temporarily unavailable", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600" },
  });
}
