# Stage DD-1 — Real Demand Discovery Architecture (design only)

Nothing implemented. No external service queried. No products, schema, cron or autopilot changed.
Everything downstream of `pdf_opportunities` (pdf_jobs, PDF generation, covers, QC, pricing, store publishing, checkout, Stripe, fulfilment) is untouched by this design; the new layer sits strictly in front of it.

## A. Recommended v1 data sources

1. **Google Search Console** (first-party, free) — real impressions/clicks/CTR/position per query and page.
2. **Internal product performance** (already in the database, free) — views, downloads, sales, revenue, ratings per product/category.
3. **One paid keyword/trend provider — DataForSEO** (Google Ads volume + monthly history + CPC + competition, and optionally SERP).
4. Deferred to v2: Semrush, Ahrefs, SerpApi, Reddit, YouTube, Pinterest.

## B. Why each source

- GSC proves what people already ask Easy Move Pro for and what we show but do not satisfy (high impressions + low CTR = product gap). It is the only source that is both real and free.
- Internal performance tells us which categories actually convert, which is the commercial-fit multiplier no external source can give.
- DataForSEO supplies the one thing first-party data cannot: absolute market volume, 12-month trend history and CPC for queries we do not yet rank for.

## C. Free vs paid

| Source | Cost |
| --- | --- |
| Google Search Console API | Free (OAuth, quota-limited) |
| Internal product metrics | Free |
| DataForSEO Keywords Data (Google Ads) | Paid, pay-as-you-go, ~$0.05 per bulk request of up to 1000 keywords; a conservative daily budget is cents |
| Google Ads Keyword Planner API | Free API but requires an approved Google Ads developer token + active spending account; ranges not exact volumes |
| Google Trends | No official API; only relative 0-100 interest, not volume; use a licensed provider (DataForSEO/Semrush) instead of scraping |
| Semrush / Ahrefs | Paid subscription + API units; richer, unnecessary for v1 |
| SerpApi | Paid per search; only needed if we score SERP competition in v2 |

## D. Required integrations

1. Google Search Console connector (OAuth), property = the published site, plus site verification if not yet verified.
2. DataForSEO REST client (HTTP Basic), server-side only.
3. A daily discovery job as a TanStack server route under `src/routes/api/public/hooks/` protected by the existing factory-tick HMAC secret, plus a manual admin trigger.

## E. Credential / env variable names only

- `GOOGLE_SEARCH_CONSOLE_API_KEY` (connector gateway key), `LOVABLE_API_KEY` (already present)
- `GSC_SITE_URL`
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- `DEMAND_DISCOVERY_ENABLED`, `DEMAND_DISCOVERY_DAILY_QUERY_BUDGET`, `DEMAND_DISCOVERY_DAILY_OPPORTUNITY_CAP`
- Reuses existing `FACTORY_TICK_SECRET`.
No values are collected in this stage.

## F. Normalized demand signal schema

One row = one metric observation from one provider at one time. Never written by an AI model.

```text
demand_signals
  id              uuid pk
  query           text        -- normalized lowercase phrase
  query_hash      text        -- for dedup/joins
  source          text        -- 'gsc' | 'dataforseo' | 'internal'
  source_type     text        -- 'first_party' | 'keyword_provider' | 'internal_performance'
  collected_at    timestamptz
  window_start    date        -- period the metric covers
  window_end      date
  geo             text        -- 'US' default
  search_volume   integer     null  -- provider only
  impressions     integer     null  -- GSC only
  clicks          integer     null  -- GSC only
  ctr             numeric     null
  avg_position    numeric     null
  trend_delta_30  numeric     null  -- provider monthly history
  trend_delta_90  numeric     null
  cpc_cents       integer     null
  competition     numeric     null  -- 0..1 provider value
  serp_competition numeric    null  -- v2
  marketplace_signal jsonb    null  -- v2
  community_signal   jsonb    null  -- v2
  seasonality     jsonb       null  -- monthly index array, provider-derived only
  confidence      numeric     -- derived from source count + freshness, deterministic
  source_reference jsonb      -- request id, endpoint, property, raw response pointer
  is_verified     boolean default true
```

Rule: every numeric column is either present because a provider returned it, or NULL. There is no imputation and no AI-filled metric.

## G. Opportunity scoring formula

All inputs deterministic except Product Fit and Relevance, which are AI-assisted *classification* over evidence the model may not invent.

| Component | Input | Normalization | Weight | Source | Nature |
| --- | --- | --- | --- | --- | --- |
| Demand | max(provider volume, GSC impressions x 12) | log10 scaled to 0-100 | 0.25 | provider/GSC | deterministic |
| Trend | trend_delta_90 | clamp(-50..+50) mapped 0-100 | 0.10 | provider | deterministic |
| Commercial intent | cpc_cents | log scaled 0-100 | 0.15 | provider | deterministic |
| Competition opportunity | 1 - competition, blended with avg_position gap | 0-100 | 0.10 | provider/GSC | deterministic |
| Product fit | can this be a printable PDF? | 0/50/100 bucket | 0.10 | AI classify | AI-assisted |
| Easy Move relevance | on-topic for moving | 0-100 | 0.10 | AI classify | AI-assisted |
| Content/product gap | no existing product/page covering it | 0 or 100 | 0.08 | internal DB | deterministic |
| Seasonality fit | current month vs seasonal index | 0-100 | 0.04 | provider | deterministic |
| Duplication penalty | nearest-neighbour similarity to existing catalog | -0..-40 absolute | — | internal DB | deterministic |
| SEO duplication penalty | overlap with published city/blog page | -0..-20 absolute | — | internal DB | deterministic |
| Data confidence multiplier | sources count + freshness | 0.5..1.0 factor | — | derived | deterministic |

`final = ((sum(weight_i * score_i)) - duplication_penalties) * confidence_multiplier`, clamped 0-100. The full component breakdown is persisted with the opportunity so any score can be re-derived.

## H. Evidence and confidence rules

- confidence 1.0: two or more independent sources, both fresh.
- 0.8: one provider source, fresh.
- 0.6: GSC only.
- 0.4: internal performance only.
- No source: **no signal, no opportunity** — never a fabricated score.
- AI may write `rationale` text and category/fit labels only. It may never write `search_volume`, `cpc_cents`, `trend_*`, `impressions`, `clicks` or `competition`.

## I. Duplicate detection rules

Before creating an opportunity, compare the candidate title/keyword against published + draft `pdf_products` (title, subtitle, target_keywords), `pdf_opportunities`, `pdf_keywords`, `blog_posts` and `city_landing_pages`:
1. exact normalized keyword match → reject;
2. token-set / trigram similarity above 0.75 → reject;
3. 0.55-0.75 → flag `duplicate_risk = high`, review-only, never autopilot;
4. same category + same product archetype (checklist / planner / budget / template) already published ≥ 3 times → require a distinct angle or reject.
Similarity uses Postgres `pg_trgm` plus a normalized archetype token — deterministic, no embeddings needed for v1.

## J. Freshness rules

| Source | Max age | Refresh |
| --- | --- | --- |
| GSC performance | 28-day window, ≤ 3 days old | daily |
| GSC 90-day trend | ≤ 7 days old | weekly |
| Keyword provider volume/CPC | ≤ 35 days | monthly per keyword |
| Trend deltas | ≤ 35 days | monthly |
| Internal performance | ≤ 24 h | daily |
| Community signals (v2) | ≤ 90 days | weekly |

Stale evidence lowers confidence first, and past the hard limit the signal is excluded from scoring entirely.

## K. Review vs autopilot gate

Hard gate (all must pass before an opportunity is production-eligible):
- ≥ 2 evidence sources (v1 may allow 1 provider source with score ≥ 80);
- confidence ≥ 0.8;
- final score ≥ 70;
- no exact/near duplicate;
- no conflicting published SEO page;
- all evidence within freshness limits;
- topic not on the prohibited list (legal/medical/immigration advice, insurance guarantees, price promises).

**Recommendation: start in MODE A (review) only.** Every gated opportunity waits for an admin Approve before entering the existing factory. Autopilot stays off and is only considered after ~30 days of reviewed decisions show the gate agrees with human judgement; even then it would be limited to score ≥ 85, confidence 1.0, and a hard cap of 2 auto-approvals/day.

## L. Daily and cost controls

- `DEMAND_DISCOVERY_ENABLED` kill switch checked at every entry point (cron, manual, chained hop).
- One discovery run per day, single-flight lease row with expiry; a second run exits.
- Per run: ≤ 50 seed topics, ≤ 2 provider requests (bulk, ≤ 1000 keywords each), ≤ 1 GSC query set.
- Dedup and cache checks happen *before* any paid call: a keyword with fresh provider data is never re-queried.
- ≤ 20 AI classification calls/day, batched.
- ≤ 10 new opportunities/day, ≤ 3 approved production jobs/day.
- Provider circuit breaker: 3 consecutive failures → provider paused 24 h and surfaced in the admin UI; 402/403 from the AI gateway → whole job paused until an owner resumes (probe-only on later runs).
- Spend ceiling per day; exceeding it ends the run.
- Provider failure = zero signals = zero opportunities. Explicitly no synthetic fallback path exists in this design.

## M. Reusable existing tables

- `pdf_keywords` — keep as the working keyword register (keyword, cluster, category, intent, status).
- `pdf_opportunities` — keep as the product-idea queue consumed by the existing factory.
- `pdf_products`, `pdf_downloads`, `pdf_recent_views`, `store_orders`/`store_order_items`, `pdf_reviews` — internal performance signals, already present.
- `blog_posts`, `city_landing_pages` — duplicate/SEO conflict checks.
- `ai_settings`, `pdf_factory_settings` — kill switches and caps.

## N. Minimal schema additions

`pdf_keywords`/`pdf_opportunities` store single flat integers with no provenance, window, geo or provider reference, so they cannot hold real evidence cleanly. Smallest viable addition:

1. **New table `demand_signals`** (schema in F) — one row per observed metric, with `unique(query_hash, source, window_start, geo)`.
2. **New table `demand_evidence`** — links an opportunity to the signal rows and stores the persisted score breakdown JSON + rationale.
3. **Four columns on the existing tables** (nullable, non-breaking):
   - `pdf_keywords.verification` and `pdf_opportunities.verification` — `'legacy_unverified' | 'real_verified'`, default `'legacy_unverified'`;
   - `pdf_opportunities.confidence numeric`;
   - `pdf_opportunities.evidence_id uuid` → `demand_evidence`.
Plus GRANTs and RLS mirroring the existing admin-only factory tables. No schema created in this stage.

## O. Files/modules that would be added or changed

Added:
- `src/lib/demand/providers/gsc.server.ts`, `dataforseo.server.ts`, `internal.server.ts`
- `src/lib/demand/normalize.server.ts` (provider payload → `demand_signals`)
- `src/lib/demand/score.server.ts` (deterministic scoring + penalties)
- `src/lib/demand/dedupe.server.ts`
- `src/lib/demand/gate.server.ts`
- `src/lib/demand/discovery.server.ts` (run orchestration, lease, budgets, breaker)
- `src/lib/demand.functions.ts` (admin server functions: run, list, approve, reject)
- `src/routes/api/public/hooks/demand-discovery-tick.ts` (HMAC-protected)
- `src/routes/_authenticated/ai.demand.tsx` (admin dashboard)

Changed (minimally):
- `src/components/ai/AiShell.tsx` — nav entry
- `src/lib/pdf-store/worker.server.ts` — consume only gated + approved + `real_verified` opportunities when discovery mode is active; existing behaviour otherwise unchanged
- `src/lib/ai/registry.ts` — register the new agent/capability

Explicitly unchanged: PDF generation, covers, QC, pricing, publishing, checkout, Stripe, fulfilment.

## P. Legacy synthetic data handling

Nothing is deleted. A one-time backfill sets `verification = 'legacy_unverified'` on all existing `pdf_keywords` and `pdf_opportunities` rows (the 61 published products keep selling untouched). The admin UI labels them clearly, they are excluded from the new gate, and any future automatic production path requires `verification = 'real_verified'` with attached evidence. Legacy rows remain usable only through an explicit manual admin action.

## Q. Recommended admin UI

`/ai/demand` — Demand Discovery console:
- run header: last run, next run, provider status, budget used today, kill switch;
- table of candidate opportunities: topic, sources (badges), real metrics (volume, impressions, clicks, CTR, position, CPC, trend), confidence, final score, duplicate risk, freshness age, recommended product type, suggested price band;
- row detail: full score breakdown per component, the exact evidence rows with collection dates and provider reference, and the AI rationale clearly separated from observed metrics;
- actions: Approve (→ production-eligible), Reject (with reason), Snooze;
- legacy rows shown in a separate tab tagged LEGACY_UNVERIFIED.
Empty metrics render as "—", never as an estimate.

## R. Exact MVP workflow

1. Daily HMAC-protected tick → kill switch + lease check.
2. Pull GSC 28-day query rows for the property; keep queries with impressions ≥ threshold and no strong existing page/product.
3. Add internal performance signals (top/bottom categories, high-download topics).
4. Dedup candidates against catalog/opportunities/keywords; drop anything with fresh provider data already cached.
5. One bulk DataForSEO request for the surviving candidates (volume, CPC, competition, 12-month history).
6. Write all observations to `demand_signals` (verbatim, provenance attached).
7. Deterministic scoring; one batched AI call for product-fit/relevance classification only.
8. Apply the hard gate; write passing candidates to `pdf_opportunities` with `verification='real_verified'`, confidence and `evidence_id`; cap at 10/day.
9. Admin reviews at `/ai/demand` and approves.
10. Approved opportunity enters the existing PDF Factory unchanged.

## S. Estimated risk

- Low: additive layer, existing factory and storefront paths untouched; feature-flagged off by default.
- Medium: GSC property verification and OAuth setup is the main setup friction; DataForSEO adds a small recurring cost that the daily budget caps.
- Medium: scoring weights will need tuning; mitigated by persisting the full breakdown so re-scoring is possible without re-querying providers.
- Main risk to avoid: any code path that substitutes a default score when a provider fails. The design forbids it, and review mode plus the daily cap contain the blast radius.

## T. Recommended implementation sequence

1. DD-2 — schema: `demand_signals`, `demand_evidence`, four nullable columns, GRANTs/RLS, legacy backfill.
2. DD-3 — GSC connector + property verification + read-only fetch, stored as signals.
3. DD-4 — internal performance signals.
4. DD-5 — deterministic scoring, dedup, gate (no writes to `pdf_opportunities` yet; dry-run report).
5. DD-6 — admin `/ai/demand` dashboard, review mode, manual Approve.
6. DD-7 — DataForSEO provider behind budget + circuit breaker.
7. DD-8 — enable writing gated opportunities, cap 10/day, review-only.
8. DD-9 — after 30 days of review data, evaluate a narrow autopilot. Not before.
