ALTER TABLE public.city_production_jobs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS leased_until timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_state text NOT NULL DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS skipped_reason text;

CREATE INDEX IF NOT EXISTS city_production_jobs_lease_idx ON public.city_production_jobs (leased_until);

CREATE TABLE IF NOT EXISTS public.ai_supervisor_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  agent_key text,
  landing_slug text,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_supervisor_incidents TO authenticated;
GRANT ALL ON public.ai_supervisor_incidents TO service_role;
ALTER TABLE public.ai_supervisor_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supervisor incidents" ON public.ai_supervisor_incidents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS ai_supervisor_incidents_created_idx ON public.ai_supervisor_incidents (created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_supervisor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_label text NOT NULL,
  kind text NOT NULL,
  state_code text,
  summary text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_supervisor_reports TO authenticated;
GRANT ALL ON public.ai_supervisor_reports TO service_role;
ALTER TABLE public.ai_supervisor_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supervisor reports" ON public.ai_supervisor_reports
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS ai_supervisor_reports_created_idx ON public.ai_supervisor_reports (created_at DESC);