CREATE TABLE public.city_worker_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL,
  trigger text NOT NULL DEFAULT 'cron',
  jobs_processed integer NOT NULL DEFAULT 0,
  stages_run integer NOT NULL DEFAULT 0,
  published integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  refilled integer NOT NULL DEFAULT 0,
  reclaimed integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.city_worker_runs TO authenticated;
GRANT ALL ON public.city_worker_runs TO service_role;

ALTER TABLE public.city_worker_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read city worker runs"
  ON public.city_worker_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX city_worker_runs_created_idx ON public.city_worker_runs (created_at DESC);

CREATE TRIGGER city_worker_runs_updated_at BEFORE UPDATE ON public.city_worker_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_settings (key, value)
VALUES ('city_factory_worker', '{"enabled": true, "jobs_per_tick": 4, "stages_per_tick": 12, "use_ai": true, "queue_floor": 200, "refill_batch": 250}'::jsonb)
ON CONFLICT (key) DO NOTHING;