
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS customer_language text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_summary jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  notes text,
  due_at timestamptz,
  owner_id uuid,
  owner_email text,
  priority text NOT NULL DEFAULT 'normal',
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tasks TO authenticated;
GRANT ALL ON public.lead_tasks TO service_role;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead tasks" ON public.lead_tasks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.lead_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('call','sms','email')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  status text NOT NULL DEFAULT 'logged',
  subject text,
  body text,
  duration_seconds integer,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_communications TO authenticated;
GRANT ALL ON public.lead_communications TO service_role;
ALTER TABLE public.lead_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead communications" ON public.lead_communications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  name text NOT NULL,
  external_url text,
  storage_path text,
  mime text,
  size_bytes bigint,
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO authenticated;
GRANT ALL ON public.lead_documents TO service_role;
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead documents" ON public.lead_documents FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS lead_tasks_quote_idx ON public.lead_tasks(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_comms_quote_idx ON public.lead_communications(quote_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lead_docs_quote_idx ON public.lead_documents(quote_id, created_at DESC);
