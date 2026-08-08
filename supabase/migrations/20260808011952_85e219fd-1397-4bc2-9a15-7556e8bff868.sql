ALTER TABLE public.city_landing_pages ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS landing_city_slug TEXT,
  ADD COLUMN IF NOT EXISTS landing_city TEXT,
  ADD COLUMN IF NOT EXISTS landing_state TEXT,
  ADD COLUMN IF NOT EXISTS landing_path TEXT,
  ADD COLUMN IF NOT EXISTS utm JSONB;

CREATE INDEX IF NOT EXISTS idx_quotes_landing_city_slug ON public.quotes (landing_city_slug);
CREATE INDEX IF NOT EXISTS idx_city_production_jobs_status_priority ON public.city_production_jobs (status, priority);