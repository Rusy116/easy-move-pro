-- Notes
CREATE TABLE public.quote_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_notes TO authenticated;
GRANT ALL ON public.quote_notes TO service_role;
ALTER TABLE public.quote_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notes" ON public.quote_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_quote_notes_quote_id ON public.quote_notes(quote_id, created_at DESC);

-- Status history
CREATE TABLE public.quote_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quote_status_history TO authenticated;
GRANT ALL ON public.quote_status_history TO service_role;
ALTER TABLE public.quote_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read history" ON public.quote_status_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert history" ON public.quote_status_history FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE INDEX idx_quote_status_history_quote_id ON public.quote_status_history(quote_id, created_at DESC);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.quote_status_history (quote_id, from_status, to_status)
    VALUES (NEW.id, NULL, NEW.status);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.quote_status_history (quote_id, from_status, to_status, changed_by, changed_by_email)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_email);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_quote_status_history
AFTER INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_status_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_status_history;