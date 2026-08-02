CREATE OR REPLACE FUNCTION public.tg_log_estimate_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('sent','viewed','accepted','rejected') THEN
    INSERT INTO public.lead_events (quote_id, company_id, actor_type, actor_id, event_type, payload)
    VALUES (NEW.quote_id, NEW.company_id,
      CASE WHEN NEW.status IN ('accepted','rejected','viewed') THEN 'customer' ELSE 'mover' END,
      auth.uid(), 'estimate.' || NEW.status,
      jsonb_build_object('revision', NEW.revision, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_estimate_event ON public.estimate_revisions;
CREATE TRIGGER trg_log_estimate_event
AFTER UPDATE ON public.estimate_revisions
FOR EACH ROW EXECUTE FUNCTION public.tg_log_estimate_event();