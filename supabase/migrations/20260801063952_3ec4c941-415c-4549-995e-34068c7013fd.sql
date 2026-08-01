CREATE TABLE public.impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  admin_email TEXT,
  target_user_id UUID NOT NULL,
  target_email TEXT,
  target_name TEXT,
  target_role TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view impersonation sessions"
  ON public.impersonation_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.impersonation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.impersonation_sessions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.impersonation_events TO authenticated;
GRANT ALL ON public.impersonation_events TO service_role;
ALTER TABLE public.impersonation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view impersonation events"
  ON public.impersonation_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_impersonation_events_session ON public.impersonation_events(session_id, created_at DESC);
CREATE INDEX idx_impersonation_sessions_admin ON public.impersonation_sessions(admin_user_id, started_at DESC);

CREATE TRIGGER trg_impersonation_sessions_updated_at
  BEFORE UPDATE ON public.impersonation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();