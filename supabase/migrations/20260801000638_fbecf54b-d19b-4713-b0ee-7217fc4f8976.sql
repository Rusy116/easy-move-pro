CREATE OR REPLACE FUNCTION public.fn_company_available_jobs(_company_id uuid)
 RETURNS TABLE(id uuid, quote_number text, customer_name text, origin_city text, origin_state text, destination_city text, destination_state text, move_date date, distance_miles numeric, estimated_cubic_feet numeric, estimated_low numeric, estimated_high numeric, move_type text, property_type text, services text[], published_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.quote_number,
    NULL::text,
    q.origin_city, q.origin_state, q.destination_city, q.destination_state,
    q.move_date, q.distance_miles, q.estimated_cubic_feet, q.estimated_low, q.estimated_high,
    q.move_type, q.property_type,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN q.packing THEN 'Packing' END,
      CASE WHEN q.unpacking THEN 'Unpacking' END,
      CASE WHEN q.storage THEN 'Storage' END,
      CASE WHEN q.assembly THEN 'Assembly' END,
      CASE WHEN q.piano THEN 'Piano' END,
      CASE WHEN q.junk_removal THEN 'Junk removal' END,
      CASE WHEN q.appliances THEN 'Appliances' END,
      CASE WHEN q.fragile_items THEN 'Fragile items' END
    ], NULL),
    COALESCE(q.published_at, q.created_at)
  FROM public.quotes q
  WHERE q.job_status = 'open_market'
    AND public.fn_is_company_member(_company_id)
  ORDER BY COALESCE(q.published_at, q.created_at) DESC
  LIMIT 200;
$function$;

CREATE OR REPLACE FUNCTION public.fn_company_my_jobs(_company_id uuid)
 RETURNS SETOF quotes
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.* FROM public.quotes q
  WHERE q.assigned_company_id = _company_id
    AND public.fn_is_company_member(_company_id)
    AND (
      q.claimed_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.company_claims c
                 WHERE c.quote_id = q.id AND c.company_id = _company_id)
    )
  ORDER BY q.claimed_at DESC NULLS LAST
  LIMIT 300;
$function$;

DROP POLICY IF EXISTS "Public can view quote by portal token" ON public.quotes;
CREATE POLICY "Anon can view quote by portal token"
  ON public.quotes FOR SELECT TO anon
  USING (portal_token IS NOT NULL);