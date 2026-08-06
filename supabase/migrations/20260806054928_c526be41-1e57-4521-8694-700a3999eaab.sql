ALTER TABLE public.city_landing_pages
  ADD COLUMN IF NOT EXISTS seo_slug text,
  ADD COLUMN IF NOT EXISTS seo_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS seo_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS seo_content jsonb,
  ADD COLUMN IF NOT EXISTS seo_error text,
  ADD COLUMN IF NOT EXISTS seo_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_generation_ms integer,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS city_landing_pages_seo_slug_key
  ON public.city_landing_pages (seo_slug) WHERE seo_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS city_landing_pages_seo_status_idx
  ON public.city_landing_pages (seo_status);

ALTER TABLE public.city_landing_runs
  ADD COLUMN IF NOT EXISTS seo_generated integer NOT NULL DEFAULT 0;