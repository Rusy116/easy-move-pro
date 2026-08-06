CREATE TABLE IF NOT EXISTS public.city_production_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_slug text NOT NULL UNIQUE,
  city_slug text NOT NULL,
  state_code text NOT NULL,
  city text NOT NULL,
  county text,
  tier text NOT NULL DEFAULT 'small',
  priority integer NOT NULL DEFAULT 100,
  population integer NOT NULL DEFAULT 0,
  stage integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  stage_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_production_jobs TO authenticated;
GRANT ALL ON public.city_production_jobs TO service_role;

ALTER TABLE public.city_production_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage city production jobs"
ON public.city_production_jobs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS city_production_jobs_queue_idx
  ON public.city_production_jobs (status, priority, population DESC);
CREATE INDEX IF NOT EXISTS city_production_jobs_completed_idx
  ON public.city_production_jobs (completed_at DESC);

CREATE TRIGGER city_production_jobs_updated_at
BEFORE UPDATE ON public.city_production_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();