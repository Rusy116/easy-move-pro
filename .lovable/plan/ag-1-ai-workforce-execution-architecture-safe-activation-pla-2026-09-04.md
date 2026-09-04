# AG-1 — AI Workforce Execution Architecture & Safe Activation Plan

Design only. No agent runs, no wiring, no DB/cron/factory/DD/CRM/Store changes.

## A. 21-agent execution matrix

Legend for status: RRO = READY_READ_ONLY, RDO = READY_DRAFT_ONLY, RAG = READY_WITH_APPROVAL_GATE, NEX = NEEDS_EXECUTOR, NRW = NEEDS_REWIRING, DNR = DANGEROUS_NOT_READY.

| # | Key | Name | Real executor today | Trigger today | Writes | External | Blast radius | Approval | Class |
|---|---|---|---|---|---|---|---|---|---|
| 1 | usa_data_engine | USA Data Engine | none reachable from card; `/ai/usa-data` page reads only | status only | — | — | none | no | NEX |
| 2 | ai_ceo | AI CEO | orchestrator data layer (`src/lib/ai/orchestrator.ts`) — reads registry, writes queue/notifications | status only | ai_tasks, ai_notifications | — | queue only | no | NRW |
| 3 | seo_factory | SEO Factory | no runner; capabilities are labels only | status only | — | — | would be large | yes | NEX |
| 4 | city_landing_agent | City Calculator Factory | city production tick / `/ai/cities` | pipeline + cron | city_landing_pages | AI gateway | live SEO pages | yes | RAG |
| 5 | seo_landing_factory | SEO Landing Factory | `/ai/city-review` review flow | pipeline | city_landing_pages | AI | live SEO pages | yes | RAG |
| 6 | internal_linking_engine | Internal Linking Engine | `auditFactoryBatch` (runner mapped) | registry only | city_landing_pages audit fields | — | audit fields only | no | NRW |
| 7 | content_factory | Content Factory | none | status only | — | — | — | yes | NEX |
| 8 | seo_content_engine | SEO Content Engine | none (page `/ai/seo` is a console) | status only | — | — | — | yes | NEX |
| 9 | blog_agent | Consumer Blog Agent | `runBlogAgent` → `ai_content_items` drafts; publish via Blog Review | registry only | ai_content_items (draft) | AI gateway | drafts only | publish gate exists | RDO |
| 10 | publishing_agent | Publishing Agent | none; publishing lives in `blog-publish.functions.ts` (admin-gated) | status only | — | — | public content | yes | NRW |
| 11 | analytics_agent | Analytics Agent | GSC ingestion (`demand_signals`) exists but not mapped | status only | demand_signals | GSC API | read-only ingest | no | NRW |
| 12 | mover_growth_agent | Moving Company Growth Agent | `runGrowthAgent` → drafts | registry only | ai_content_items (draft) | AI | drafts | publish gate | RDO |
| 13 | product_factory | Digital Product Agent | `runProductAgent` (legacy synthetic path) + DD-2B gated PDF worker | registry/cron | ai_products, pdf_* | AI | production products | yes | DNR until DD-wired |
| 14 | crm_intelligence | CRM Intelligence | none | status only | — | — | CRM records | yes | NEX |
| 15 | image_factory | Image Agent | `runImageAgent` (briefs only) | registry only | image brief fields | AI/image | assets | no | RDO |
| 16 | email_agent | Email Agent | transactional email exists; no campaign executor | status only | notification_deliveries | Resend | customer inboxes | yes | NEX |
| 17 | self_optimization_agent | Self Optimization Agent | `runSelfImprovement` rewrites live `city_landing_pages` | registry only | live city pages | AI | thousands of live URLs | mandatory | DNR |
| 18 | social_agent | Social Agent | none | status only | — | — | public posts | yes | NEX |
| 19 | video_agent | Video Agent | none | status only | — | — | — | yes | NEX |
| 20 | google_performance_agent | Google Performance Agent | `runFactoryMonitor` (read/monitor) | registry only | monitoring fields | — | low | no | RRO |
| 21 | revenue_agent | Revenue Agent | `runRevenueAgent` aggregates real orders/commissions | registry only | ai_metrics_daily | — | metrics row | no | RRO |

**B. Usable runners today (8):** blog_agent, mover_growth_agent, product_factory, image_factory, revenue_agent, internal_linking_engine, google_performance_agent, self_optimization_agent (`src/lib/ai/agent-runners.ts`).

**C. Need new executors (9):** usa_data_engine, seo_factory, content_factory, seo_content_engine, crm_intelligence, email_agent, social_agent, video_agent, publishing_agent (wrapper only).

**D. Disconnected (real work exists elsewhere):** analytics_agent (GSC), publishing_agent (blog publish fns), city_landing_agent, seo_landing_factory, ai_ceo, internal_linking_engine.

**E. Require approval gates:** city_landing_agent, seo_landing_factory, blog_agent, mover_growth_agent, product_factory, publishing_agent, crm_intelligence, email_agent, social_agent, self_optimization_agent.

**F. Dangerous:** self_optimization_agent (live rewrites, no diff/rollback), product_factory (must not bypass DD-2B).

## G. Central execution architecture

One service, no second system:

```text
/ai/workforce card action
  -> agent-control.functions.ts   (admin-gated createServerFn: run / pause / stop)
  -> agent-execution service      (single dispatcher)
       - looks up agent in ai_agents
       - checks enabled + kill switch + concurrency + daily limit
       - resolves runner from AGENT_RUNNERS (single registry)
       - creates ai_agent_runs row (status=running)
  -> existing runner (wraps existing engines; never reimplements)
  -> run record + ai_task_logs + recordRun() metrics
  -> result summary shown on the card
```

Semantics: Start = execute one bounded run now. Pause = set `paused`, dispatcher refuses new runs, current run finishes. Stop = request cancel via a cooperative `cancel_requested` flag the runner checks between items. Agents with no runner show "No executor" and a disabled Start button — never a fake running state.

## H. Logging / run model

New table `ai_agent_runs`: id, agent_key, trigger (manual/cron), status, started_at, finished_at, duration_ms, items_processed, ai_calls, cost_estimate_cents, writes_count, dry_run, result jsonb, error, requested_by. History tab reads this table; Logs tab reads `ai_task_logs` filtered by run_id. Card metrics derive from real runs only.

## I. Activation order (safest first)

1 revenue_agent · 2 google_performance_agent · 3 analytics_agent (GSC read) · 4 internal_linking_engine · 5 image_factory · 6 blog_agent (draft) · 7 mover_growth_agent (draft) · 8 ai_ceo (queue reporting) · 9 publishing_agent (approve-only wrapper) · 10 usa_data_engine (read) · 11 seo_content_engine (draft) · 12 content_factory (draft) · 13 seo_factory (draft) · 14 city_landing_agent (draft+review) · 15 seo_landing_factory (review) · 16 product_factory (DD-verified only) · 17 crm_intelligence (recommendation-only) · 18 email_agent (test recipient) · 19 social_agent (draft) · 20 video_agent (draft) · 21 self_optimization_agent (last, full gate).

## J. Per-stage test template

Each activation stage: 1 controlled run, max 3 work items, max 3 AI calls, dry_run first, allowed writes limited to the agent's own draft/metrics tables, expected result recorded in `ai_agent_runs`, rollback = delete the run's created draft rows by run_id, pass criteria = run row completed + real counts + zero writes outside the allowlist + build/typecheck green.

## K. Expected cost

Read-only agents (1–4, 10): $0. Draft content agents: ~1 AI call per item, 3 items per test run. Product/city agents: highest cost, capped per run. Every run stores `ai_calls` and estimated cost.

## L. Rollback

Per-run `run_id` stamped on every created row; rollback deletes/reverts by run_id. Self-optimization additionally stores before/after snapshots and an affected-URL list with one-click revert. Global kill switch in `ai_settings` blocks all dispatch.

## M. Files that would change later (not now)

`src/lib/ai/agent-runners.ts` (complete map + metadata), new `src/lib/ai/agent-execution.server.ts`, new `src/lib/ai/agent-control.functions.ts`, `src/routes/_authenticated/ai.workforce.tsx` (real state, run history), `src/components/ai/blocks.tsx`, i18n modules. Untouched: DD files, `worker.server.ts`, cron, Store/Stripe, CRM, auth/RLS.

## N. Schema impact

One additive table `ai_agent_runs` (admin-only RLS + grants) and an optional `cancel_requested boolean` on `ai_agents`. No changes to existing factory, DD, or commerce schema.

## O. Recommended first agent

**revenue_agent** — real runner, aggregates existing orders/commissions, writes only one `ai_metrics_daily` row, no AI calls, no public surface, trivially reversible.
