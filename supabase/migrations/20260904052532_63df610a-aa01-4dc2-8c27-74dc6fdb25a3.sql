CREATE TABLE public.ai_agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  mode TEXT NOT NULL DEFAULT 'read_only',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  items_processed INTEGER NOT NULL DEFAULT 0,
  ai_calls INTEGER NOT NULL DEFAULT 0,
  external_calls INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_agent_runs_agent_started_idx ON public.ai_agent_runs (agent_key, started_at DESC);
CREATE UNIQUE INDEX ai_agent_runs_one_active_idx ON public.ai_agent_runs (agent_key) WHERE status = 'running';

GRANT SELECT ON public.ai_agent_runs TO authenticated;
GRANT ALL ON public.ai_agent_runs TO service_role;

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read agent runs"
  ON public.ai_agent_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));