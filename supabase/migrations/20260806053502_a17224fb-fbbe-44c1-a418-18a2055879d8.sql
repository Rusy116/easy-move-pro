-- Phase 5: City Calculator Factory production readiness (isolated module)
ALTER TABLE public.city_landing_pages
  ADD COLUMN IF NOT EXISTS validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculator_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS schema_valid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_links integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS city_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS publish_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS index_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_crawl timestamptz,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_position numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS city_landing_pages_city_status_idx ON public.city_landing_pages (city_status);
CREATE INDEX IF NOT EXISTS city_landing_pages_index_status_idx ON public.city_landing_pages (index_status);

CREATE TABLE IF NOT EXISTS public.city_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  city text NOT NULL,
  state_code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  seo_score integer NOT NULL DEFAULT 0,
  calculator_status text NOT NULL DEFAULT 'unknown',
  result text NOT NULL,
  reason text,
  duration_ms integer NOT NULL DEFAULT 0,
  attempt integer NOT NULL DEFAULT 1,
  run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS city_publish_log_slug_idx ON public.city_publish_log (slug);
CREATE INDEX IF NOT EXISTS city_publish_log_created_idx ON public.city_publish_log (created_at DESC);

GRANT SELECT ON public.city_publish_log TO authenticated;
GRANT ALL ON public.city_publish_log TO service_role;
ALTER TABLE public.city_publish_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read city publish log"
  ON public.city_publish_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.city_landing_runs
  ADD COLUMN IF NOT EXISTS skipped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_size integer NOT NULL DEFAULT 10;