
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS capabilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS queue text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS tasks_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_runtime_ms integer NOT NULL DEFAULT 0;

ALTER TABLE public.ai_tasks
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS depends_on uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duration_ms integer;

CREATE TABLE IF NOT EXISTS public.ai_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  agent_key text,
  task_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_notifications TO authenticated;
GRANT ALL ON public.ai_notifications TO service_role;
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai notifications" ON public.ai_notifications;
CREATE POLICY "Admins manage ai notifications" ON public.ai_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_notifications_created_idx ON public.ai_notifications (created_at DESC);
