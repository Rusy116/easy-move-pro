# Sitemap Resilience — Read-Only Audit & Last-Known-Good Design

Nothing was changed. This is an audit plus a design for approval.

## A. Current architecture

| Sitemap | Source file | Data source | Per request? | Cache |
|---|---|---|---|---|
| `/sitemap.xml` | `src/routes/sitemap[.]xml.ts` | live count of indexable cities | yes | `max-age=3600` only |
| `/sitemap-pages.xml` | `src/routes/sitemap-pages[.]xml.ts` | static lists + a live read for blog/products | yes | `max-age=3600` |
| `/sitemap-cities-N.xml` | `src/routes/sitemap-cities-{$part}[.]xml.ts` | live paged read of `city_landing_pages` | yes | `max-age=3600` |

Shared rendering lives in `src/lib/seo/sitemap-xml.ts` (45,000 URL cap per file, 2 URLs per city, canonical base `https://easymove.pro`). City reads live in `src/lib/city-landing/public-read.server.ts`.

Failure behavior today: every read is wrapped in `try/catch` and returns `0` or `[]` on failure. There is no retained copy of the previous good output anywhere.

## B. Exact cause of the incident

While the backend was paused, the city query failed, the catch block returned an empty array, and the route happily rendered a structurally valid but empty `<urlset>` with HTTP 200. The index also computed `parts = 1` from a count of `0`. Google saw a valid, empty sitemap — the worst possible outcome, because an error would have been retried instead.

## C. Failure modes and severity

- CRITICAL: database paused / unreachable, query returns zero unexpectedly, silent empty render, index shrinking to 1 part, wrong project ref or empty environment.
- HIGH: query timeout under 45k-row paging, partial read breaking mid-batch (currently truncates silently), deployment regression, child sitemap referenced but 404.
- MEDIUM: duplicate URLs (deduped per file, not across files), partition-count drift, stale cache serving a bad snapshot for an hour, accidental shrink from a quality-gate threshold change.
- LOW: malformed XML (output is escaped-free template — fine for slugs), oversized file (margin already applied), non-canonical domain (base URL is hardcoded, so preview/localhost leakage is not possible today).

## D. Recommended architecture

```text
city_landing_pages  ->  snapshot builder (admin/manual)  ->  validation gate
        -> catastrophic-shrink guard -> versioned snapshot row (last-known-good)
        -> sitemap routes read snapshot first, live DB only as a fallback
```

Routes stop depending on a successful live read. If the snapshot is missing AND the live read fails, the route returns HTTP 503 rather than an empty urlset — Google retries instead of recording zero URLs.

## E. Storage recommendation

A **database snapshot table** (`sitemap_snapshots`) holding the rendered XML per part. Reasons: it uses the existing backend, RLS, and migration workflow; it is versioned and queryable; no new bucket, credentials, or build-artifact pipeline. Trade-off: it shares an outage with the database — mitigated by an in-process memory cache of the last served snapshot per part, which covers the short pause window that caused this incident. Supabase Storage was considered but adds a second failure surface with no availability gain; static build artifacts were rejected because city inventory changes between deploys.

## F. Validation gate (candidate must pass all)

Valid XML; canonical `https://easymove.pro` only; URL count > 0; zero duplicates within and across parts; each file under 45,000 URLs and 50 MB; total reconciles with the indexable-city count; a random sample of 10 URLs returns 200; no preview/localhost/lovable.app hosts; no malformed slugs.

## G. Shrink guard

Block promotion when the candidate city URL count drops more than **5%** below last-known-good, and hard-block any drop to zero. A 5% floor tolerates normal quality-gate churn on ~28,850 cities (about 1,400 URLs) while catching real collapses. Blocked candidates are stored as `blocked` and never promoted without admin approval.

## H. Outage behavior

Paused, unavailable, timed out, or unexpectedly zero all produce the same result: serve the last-known-good snapshot. No snapshot available: HTTP 503 with a short retry header — never an empty urlset, never a partial file.

## I. Versioning and rollback

Each release is `sitemap-release-<UTC timestamp>` with generation time, total URLs, city URL count, per-part checksum, validation status, environment, database ref, and build ID. Retain the last 10 releases plus the newest passing one permanently. Rollback is a single flag flip to mark an older release active.

## J. Monitoring

A read-only health check that fetches the index and every child, verifies XML validity, counts URLs, compares against the previous run, samples random URLs, checks database availability and snapshot age. Version one only records results and raises admin alerts; it never regenerates.

## K. Alerts

- CRITICAL: empty sitemap, drop past threshold, invalid XML, domain mismatch, no last-known-good.
- HIGH: database unavailable, child sitemap 5xx, several sampled URLs 404, snapshot older than 7 days.
- MEDIUM: small drift, duplicates, unexpected partition change.

## L. Agent ownership

No new agent. **`analytics_agent`** owns sitemap health and GSC indexing monitoring — it is already wired into the real Workforce execution path, already talks to Search Console read-only, and already runs deterministically. City inventory reconciliation belongs to the SEO/City factory reporting it already produces.

## M. Files that would change

`src/lib/seo/sitemap-xml.ts`, the three sitemap routes, a new `src/lib/seo/sitemap-snapshot.server.ts`, a new admin server function for build/promote/rollback, `src/lib/workforce/analytics.server.ts` for the health check, and an admin screen for release history.

## N. Schema

One additive table `sitemap_snapshots` (release ID, part key, XML body, counts, checksum, status, active flag, metadata) with admin-only RLS and service-role access. No changes to existing tables.

## O. Risk

Low to medium. All changes are additive and each stage keeps the current live-read path as fallback until the snapshot path is proven.

## P. Stages

- **SR-1**: snapshot table + builder + validation gate + shrink guard. No route changes; build candidates only.
- **SR-2**: routes read active snapshot first, live DB fallback, 503 instead of empty output.
- **SR-3**: admin release history UI with promote, block reason, and rollback.
- **SR-4**: health monitor inside `analytics_agent` with alert records.
- **SR-5**: optional auto-promotion for small safe additions; large deletions stay manual.
- **SR-6**: resubmit sitemap to Search Console once stable.

Stopping here — nothing implemented.
