// ---------------------------------------------------------------------------
// SR-1 — Last-Known-Good sitemap snapshot store (server only).
//
// Captures the sitemap files EXACTLY as production currently serves them,
// validates the capture, and only then promotes it to Last-Known-Good.
// Nothing here changes what is served to Google; SR-2 will add delivery.
// ---------------------------------------------------------------------------
import {
  CANONICAL_ORIGIN,
  analyzePart,
  evaluateShrinkGuard,
  newReleaseId,
  validateCandidate,
  type PartKind,
  type SnapshotPart,
  type ValidationResult,
} from "./sitemap-snapshot";

const FETCH_TIMEOUT_MS = 30_000;
export const RETAIN_RELEASES = 10;

export interface CapturedSitemap extends SnapshotPart {
  status: number;
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/xml,text/xml,*/*" },
      redirect: "follow",
    });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

/** Capture the live index plus every child file it references. */
export async function captureLiveSitemaps(
  origin: string = CANONICAL_ORIGIN,
): Promise<CapturedSitemap[]> {
  const index = await fetchText(`${origin}/sitemap.xml`);
  if (index.status !== 200) throw new Error(`sitemap.xml returned HTTP ${index.status}`);

  const parts: CapturedSitemap[] = [
    { partKey: "index", kind: "index", xml: index.body, status: index.status },
  ];

  const children = (index.body.match(/<loc>([\s\S]*?)<\/loc>/g) ?? []).map((m) =>
    m.replace(/<\/?loc>/g, "").trim(),
  );
  for (const loc of children) {
    const file = loc.split("/").pop() ?? "";
    const partKey = file.replace(/^sitemap-/, "").replace(/\.xml$/, "");
    const kind: PartKind = partKey.startsWith("cities") ? "cities" : "pages";
    const child = await fetchText(loc);
    if (child.status !== 200) throw new Error(`${loc} returned HTTP ${child.status}`);
    parts.push({ partKey, kind, xml: child.body, status: child.status });
  }
  return parts;
}

type Db = { from: (t: string) => any };

export interface ActiveSnapshotRow {
  release_id: string;
  part_key: string;
  url_count: number;
  city_url_count: number;
  checksum: string;
  byte_size: number;
  created_at: string;
}

export async function readActiveSnapshots(db: Db): Promise<ActiveSnapshotRow[]> {
  const { data, error } = await db
    .from("sitemap_snapshots")
    .select("release_id, part_key, url_count, city_url_count, checksum, byte_size, created_at")
    .eq("is_active", true);
  if (error) throw new Error(`Failed to read last-known-good snapshot: ${error.message}`);
  return (data ?? []) as ActiveSnapshotRow[];
}

export interface BuildOutcome {
  releaseId: string;
  promoted: boolean;
  blockedReason: string | null;
  validation: ValidationResult;
  shrink: ReturnType<typeof evaluateShrinkGuard>;
  parts: Array<{ partKey: string; urlCount: number; cityUrlCount: number; byteSize: number }>;
  lastGood: { releaseId: string | null; cityUrlCount: number; urlCount: number };
}

export interface BuildOptions {
  origin?: string;
  publishedCityCount: number;
  adminApprovedShrink?: boolean;
  /** Injected for tests; defaults to capturing the live production sitemaps. */
  capture?: () => Promise<SnapshotPart[]>;
  now?: Date;
}

/**
 * Build → validate → shrink-guard → (maybe) promote.
 *
 * FAILURE-SAFE: an invalid, empty, partial or shrunken candidate is stored
 * with status "blocked" and the existing Last-Known-Good stays active and
 * untouched. A failed capture throws before anything is written.
 */
export async function buildAndPromoteSnapshot(
  db: Db,
  opts: BuildOptions,
): Promise<BuildOutcome> {
  const releaseId = newReleaseId(opts.now ?? new Date());
  const capture = opts.capture ?? (() => captureLiveSitemaps(opts.origin));

  let parts: SnapshotPart[];
  try {
    parts = await capture();
  } catch (e) {
    throw new Error(
      `Sitemap capture failed — last-known-good left intact: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const validation = validateCandidate({
    parts,
    publishedCityCount: opts.publishedCityCount,
  });
  const analyses = validation.analyses;

  const active = await readActiveSnapshots(db);
  const lastGood = {
    releaseId: active[0]?.release_id ?? null,
    cityUrlCount: active.reduce((n, r) => n + (r.city_url_count ?? 0), 0),
    urlCount: active.reduce((n, r) => n + (r.url_count ?? 0), 0),
  };

  const shrink = evaluateShrinkGuard({
    candidateCityUrlCount: validation.totals.cityUrlCount,
    candidateUrlCount: validation.totals.urlCount,
    lastGoodCityUrlCount: active.length ? lastGood.cityUrlCount : null,
    lastGoodUrlCount: active.length ? lastGood.urlCount : null,
    adminApprovedShrink: opts.adminApprovedShrink,
  });

  const blockedReason = !validation.ok
    ? validation.issues
        .slice(0, 5)
        .map((i) => `[${i.partKey}] ${i.code}: ${i.message}`)
        .join("; ")
    : !shrink.allowed
      ? shrink.reason
      : null;
  const promoted = validation.ok && shrink.allowed;

  const rows = analyses.map((a) => ({
    release_id: releaseId,
    part_key: a.partKey,
    xml: a.xml,
    url_count: a.urlCount,
    city_url_count: a.cityUrlCount,
    checksum: a.checksum,
    byte_size: a.byteSize,
    status: promoted ? "active" : "blocked",
    is_active: promoted,
    metadata: {
      kind: a.kind,
      origin: opts.origin ?? CANONICAL_ORIGIN,
      published_city_count: opts.publishedCityCount,
      shrink_ratio: shrink.shrinkRatio,
      admin_approved_shrink: Boolean(opts.adminApprovedShrink),
      issues: validation.issues.filter((i) => i.partKey === a.partKey).slice(0, 20),
      blocked_reason: blockedReason,
    },
  }));

  if (promoted) {
    // Retire the previous active release first — the partial unique index
    // allows only one active row per part.
    const { error: retireErr } = await db
      .from("sitemap_snapshots")
      .update({ is_active: false, status: "superseded" })
      .eq("is_active", true);
    if (retireErr) throw new Error(`Failed to retire previous release: ${retireErr.message}`);
  }

  const { error } = await db.from("sitemap_snapshots").insert(rows);
  if (error) throw new Error(`Failed to store snapshot: ${error.message}`);

  return {
    releaseId,
    promoted,
    blockedReason,
    validation,
    shrink,
    parts: analyses.map((a) => ({
      partKey: a.partKey,
      urlCount: a.urlCount,
      cityUrlCount: a.cityUrlCount,
      byteSize: a.byteSize,
    })),
    lastGood,
  };
}

/** Re-activate a previously validated release (rollback). */
export async function activateRelease(db: Db, releaseId: string): Promise<number> {
  const { data, error } = await db
    .from("sitemap_snapshots")
    .select("id, part_key, url_count, city_url_count, status")
    .eq("release_id", releaseId);
  if (error) throw new Error(`Failed to load release: ${error.message}`);
  const rows = (data ?? []) as Array<{ status: string; city_url_count: number }>;
  if (rows.length === 0) throw new Error("Release not found");
  if (rows.some((r) => r.status === "blocked"))
    throw new Error("Release was blocked by validation and cannot be activated");
  if (rows.reduce((n, r) => n + (r.city_url_count ?? 0), 0) <= 0)
    throw new Error("Release has zero city URLs and cannot be activated");

  const { error: retireErr } = await db
    .from("sitemap_snapshots")
    .update({ is_active: false, status: "superseded" })
    .eq("is_active", true);
  if (retireErr) throw new Error(`Failed to retire previous release: ${retireErr.message}`);

  const { error: actErr } = await db
    .from("sitemap_snapshots")
    .update({ is_active: true, status: "active" })
    .eq("release_id", releaseId);
  if (actErr) throw new Error(`Failed to activate release: ${actErr.message}`);
  return rows.length;
}

export { analyzePart };
