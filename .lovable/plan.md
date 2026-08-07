# Database-Driven City Routing Architecture

## The problem in one sentence

The City Factory writes 1,228 city records to the database, but the public
city pages resolve cities from a hardcoded list of ~101 cities compiled into
the JavaScript bundle. The two sides never talk, so 1,209 published cities
have no page.

```text
TODAY (broken)
  city_landing_pages (1,228 rows) ──X──  no reader
  /movers/$city ──► GEO_CITIES (101 hardcoded) ──► 404 for everything else

PROPOSED
  city_landing_pages (1,228 rows) ──► public server fn ──► /movers/$city
                                                       └─► /moving-calculator/$city
                                                       └─► /counties/$county
                                                       └─► /sitemap.xml
```

## Architecture

### 1. One public read layer (new)

A single server-side reader module becomes the only source of truth for
public city pages. It exposes three reads:

- get one city by slug (`glendale-ca`)
- list cities for a state (for state/county hubs and the /cities index)
- list all published slugs (for the sitemap)

These run through the existing publishable-key server client, honouring the
`Published city pages are public` row policy that already exists on the table.
No admin key, no service role, no bundled city list.

### 2. Records become the page contract

Each row already carries everything a page needs: `city`, `state_code`,
`state_name`, `county`, `population`, `zip_codes`, `neighborhoods`,
`highways`, `nearby_cities`, `facts`, `content` (calculator page copy) and
`seo_content` (the /movers page copy). The route reads the stored JSON
instead of regenerating it, so published SEO text is preserved exactly.

The static generators (`buildCityLandingContent`, `buildMoversSeoContent`)
stay in place as a fallback for the ~19 legacy bundled cities and for the
factory's own generation step. They are no longer the read path.

### 3. Route behaviour

| Route | Today | After |
|---|---|---|
| `/movers/$city` | static list, 404 otherwise | DB row where `seo_status='published'`, renders stored `seo_content` |
| `/moving-calculator/$city` | static list | DB row where `status='published'`, renders stored `content` |
| `/counties/$county` | static list | DB rows grouped by `county` + `state_code` |
| `/states/$state` | static list | DB rows for that state |
| `/cities` index | 14 hardcoded cities | paginated DB list |
| `/sitemap.xml` | 101 static entries | every published slug from the DB |

Unpublished rows (the 171) keep returning a proper 404 with `noindex` — the
quality gate is untouched, exactly as requested.

### 4. Internal linking

`hierarchy.ts` currently builds its link graph from `GEO_CITIES`. It gets a
data-driven variant that takes rows passed in by the loader (siblings in the
same county/state, nearby cities from the stored `nearby_cities` field), so
the up/down/lateral link structure keeps working at 1,228 pages and scales
to 50,000 without code changes.

### 5. Prerender and performance

1,228 SSR-rendered pages must not do 1,228 cold database reads per crawl.
The loaders use TanStack Query `ensureQueryData` with a long `staleTime`, and
each read fetches one row by indexed slug. No full-table scan on any page.

## Files that change

**New**
- `src/lib/city-landing/public-read.server.ts` — DB read helpers
- `src/lib/city-landing/public.functions.ts` — public server fns (no auth middleware, safe for SSR/prerender)
- `src/lib/city-landing/record-adapter.ts` — maps a DB row to the `CityFacts` / content shapes the existing components already render

**Modified**
- `src/routes/movers.$city.tsx` — loader reads DB, falls back to static for legacy slugs
- `src/routes/moving-calculator.$city.tsx` — same
- `src/routes/counties.$county.tsx` — county grouping from DB
- `src/routes/states.$state.tsx` — state city list from DB
- `src/routes/cities.index.tsx` — replace the 14-city hardcoded array
- `src/routes/sitemap.xml.ts` — published slugs from DB
- `src/lib/city-landing/hierarchy.ts` — accept records instead of importing `GEO_CITIES`

**Untouched**
- `city_landing_pages` data — no inserts, updates, deletes or regeneration
- the SEO quality gate and the 171 `review` rows
- `canonical_url` values (still `mycity-move.lovable.app`)
- the whole AI factory, production worker, admin dashboards
- `QuoteCalculator` — still the one embedded calculator

## One database change is required

The table has **no `SELECT` grant for `anon` or `authenticated`**. Its public
row policy exists but cannot be exercised, so a public read returns a
permission error. A single migration adds:

```sql
GRANT SELECT ON public.city_landing_pages TO anon, authenticated;
```

No schema change, no data change. Without it, database-driven routing cannot
read anything.

## Verification after implementation

- re-run the 1,228-URL HTTP sweep; expect 1,057 × 200 and 171 × 404
- confirm the 171 unpublished cities still 404 with `noindex`
- confirm stored SEO titles/descriptions render byte-identical to the DB
- confirm the row count is still 1,228 and no row's `updated_at` changed

## Known gaps left open on purpose

1. 171 titles still fail the length gate — separate fix, on your word.
2. `canonical_url` points at a domain that is not the published one.
3. City pages still have no hero images.
