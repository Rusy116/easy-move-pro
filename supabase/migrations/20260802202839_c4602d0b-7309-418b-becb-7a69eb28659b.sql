
-- Admins can act on behalf of any company (needed for impersonation / QA views)
CREATE OR REPLACE FUNCTION public.fn_my_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  UNION
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.moving_companies
   WHERE public.has_role(auth.uid(), 'admin')
$function$;

CREATE OR REPLACE FUNCTION public.fn_current_mover_company()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() LIMIT 1),
    (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1),
    (SELECT id FROM public.moving_companies
      WHERE public.has_role(auth.uid(), 'admin')
        AND status = 'approved'
      ORDER BY created_at
      LIMIT 1)
  );
$function$;

-- Repair leads published to the marketplace whose job stage was left behind
UPDATE public.quotes
   SET job_status = 'open_market',
       published_at = COALESCE(published_at, now())
 WHERE lead_status = 'published'
   AND job_status <> 'open_market';

-- Make sure every published lead has distribution rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.quotes
            WHERE job_status = 'open_market'
              AND NOT EXISTS (SELECT 1 FROM public.lead_distributions d WHERE d.quote_id = id)
  LOOP
    PERFORM public.fn_distribute_lead(r.id, 'published');
  END LOOP;
END $$;
