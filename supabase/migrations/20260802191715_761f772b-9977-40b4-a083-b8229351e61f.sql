CREATE OR REPLACE FUNCTION public.tg_log_lead_communication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
  VALUES (NEW.quote_id, 'broker', auth.uid(), 'communication.' || NEW.channel,
    jsonb_build_object('direction', NEW.direction, 'subject', NEW.subject, 'status', NEW.status));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_lead_communication ON public.lead_communications;
CREATE TRIGGER trg_log_lead_communication
AFTER INSERT ON public.lead_communications
FOR EACH ROW EXECUTE FUNCTION public.tg_log_lead_communication();

CREATE OR REPLACE FUNCTION public.tg_log_lead_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
    VALUES (NEW.quote_id, 'broker', auth.uid(), 'task.created',
      jsonb_build_object('title', NEW.title, 'kind', NEW.kind, 'due_at', NEW.due_at));
  ELSIF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
    VALUES (NEW.quote_id, 'broker', auth.uid(), 'task.completed',
      jsonb_build_object('title', NEW.title));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_lead_task ON public.lead_tasks;
CREATE TRIGGER trg_log_lead_task
AFTER INSERT OR UPDATE ON public.lead_tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_log_lead_task();

CREATE OR REPLACE FUNCTION public.tg_log_lead_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
  VALUES (NEW.quote_id, 'broker', auth.uid(), 'document.uploaded',
    jsonb_build_object('name', NEW.name, 'kind', NEW.kind));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_lead_document ON public.lead_documents;
CREATE TRIGGER trg_log_lead_document
AFTER INSERT ON public.lead_documents
FOR EACH ROW EXECUTE FUNCTION public.tg_log_lead_document();