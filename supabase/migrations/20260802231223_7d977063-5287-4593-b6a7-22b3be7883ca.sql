CREATE OR REPLACE FUNCTION public.fn_marketplace_status(_job_status text, _assigned_company uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _job_status IN ('completed','accepted','booked','scheduled') THEN 'won'
    WHEN _job_status IN ('cancelled','rejected','expired') THEN 'closed'
    WHEN _job_status IN ('claimed','contacted','final_quote_sent') OR _assigned_company IS NOT NULL THEN 'claimed'
    WHEN _job_status = 'open_market' THEN 'available'
    ELSE 'new'
  END
$$;

CREATE OR REPLACE FUNCTION public.tg_sync_quote_marketplace_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := public.fn_marketplace_status(NEW.job_status, NEW.assigned_company_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_quote_marketplace_status ON public.quotes;
CREATE TRIGGER trg_sync_quote_marketplace_status
BEFORE INSERT OR UPDATE OF job_status, assigned_company_id, status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_quote_marketplace_status();

UPDATE public.quotes
SET status = public.fn_marketplace_status(job_status, assigned_company_id)
WHERE status IS DISTINCT FROM public.fn_marketplace_status(job_status, assigned_company_id);