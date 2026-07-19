
-- Broker assignment on quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS assigned_broker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS quotes_assigned_broker_idx ON public.quotes(assigned_broker_id);
CREATE INDEX IF NOT EXISTS quotes_last_activity_idx ON public.quotes(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes(status);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON public.quotes(created_at DESC);

-- Assignment stages & timestamps
ALTER TABLE public.quote_assignments
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS quoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS quoted_amount numeric(10,2);

-- Bump last_activity_at on quote change or child change
CREATE OR REPLACE FUNCTION public.bump_quote_last_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  qid uuid;
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    NEW.last_activity_at := now();
    RETURN NEW;
  END IF;
  qid := COALESCE(NEW.quote_id, OLD.quote_id);
  UPDATE public.quotes SET last_activity_at = now() WHERE id = qid;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_quotes_activity ON public.quotes;
CREATE TRIGGER trg_quotes_activity BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.bump_quote_last_activity();

DROP TRIGGER IF EXISTS trg_notes_activity ON public.quote_notes;
CREATE TRIGGER trg_notes_activity AFTER INSERT OR UPDATE OR DELETE ON public.quote_notes
FOR EACH ROW EXECUTE FUNCTION public.bump_quote_last_activity();

DROP TRIGGER IF EXISTS trg_assignments_activity ON public.quote_assignments;
CREATE TRIGGER trg_assignments_activity AFTER INSERT OR UPDATE OR DELETE ON public.quote_assignments
FOR EACH ROW EXECUTE FUNCTION public.bump_quote_last_activity();

-- Admin directory: expose admin users so admin UI can assign brokers
CREATE OR REPLACE VIEW public.admin_users AS
  SELECT p.id, p.full_name, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'admin';

GRANT SELECT ON public.admin_users TO authenticated;
