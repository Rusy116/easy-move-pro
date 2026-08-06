ALTER TABLE public.city_landing_pages
  ADD COLUMN IF NOT EXISTS audit_score integer,
  ADD COLUMN IF NOT EXISTS audit_report jsonb,
  ADD COLUMN IF NOT EXISTS audited_at timestamptz,
  ADD COLUMN IF NOT EXISTS index_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS prev_avg_position numeric,
  ADD COLUMN IF NOT EXISTS monitor_health text,
  ADD COLUMN IF NOT EXISTS monitored_at timestamptz,
  ADD COLUMN IF NOT EXISTS improvement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_improved_at timestamptz,
  ADD COLUMN IF NOT EXISTS hierarchy jsonb;

CREATE INDEX IF NOT EXISTS city_landing_pages_audit_score_idx ON public.city_landing_pages (audit_score);
CREATE INDEX IF NOT EXISTS city_landing_pages_monitor_health_idx ON public.city_landing_pages (monitor_health);