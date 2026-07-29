UPDATE public.quotes
SET job_status = 'open_market',
    open_market_opened_at = COALESCE(open_market_opened_at, now())
WHERE lead_status = 'published'
  AND assigned_company_id IS NULL
  AND COALESCE(job_status,'new') IN ('new','qualified');