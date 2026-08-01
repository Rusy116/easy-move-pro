-- Keep marketplace phase in sync with job status
CREATE OR REPLACE FUNCTION public.fn_sync_lead_phase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.job_status = 'open_market' THEN
    NEW.lead_phase := 'open_market';
  ELSIF NEW.job_status IN ('claimed','contacted','final_quote_sent','accepted','scheduled','booked','completed','cancelled','rejected') THEN
    NEW.lead_phase := 'closed';
  ELSIF NEW.job_status IN ('new','qualified') AND NEW.lead_phase = 'open_market' THEN
    NEW.lead_phase := 'unassigned';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_sync_lead_phase ON public.quotes;
CREATE TRIGGER trg_sync_lead_phase
BEFORE INSERT OR UPDATE OF job_status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_lead_phase();

-- Backfill existing inconsistent rows
UPDATE public.quotes SET lead_phase = 'closed'
WHERE job_status IN ('claimed','contacted','final_quote_sent','accepted','scheduled','booked','completed','cancelled','rejected')
  AND lead_phase <> 'closed';

UPDATE public.quotes SET lead_phase = 'unassigned'
WHERE job_status IN ('new','qualified') AND lead_phase = 'open_market';

UPDATE public.quotes SET lead_phase = 'open_market'
WHERE job_status = 'open_market' AND lead_phase <> 'open_market';