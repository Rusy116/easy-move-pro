CREATE OR REPLACE FUNCTION public.fn_company_available_jobs(_company_id uuid)
RETURNS TABLE (
  id uuid,
  quote_number text,
  customer_name text,
  origin_city text,
  origin_state text,
  destination_city text,
  destination_state text,
  move_date date,
  distance_miles numeric,
  estimated_cubic_feet numeric,
  estimated_low numeric,
  estimated_high numeric,
  move_type text,
  property_type text,
  services text[],
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- eligibility: distributed to this company, or (legacy leads) matching its service area
    AND (
      EXISTS (
        SELECT 1 FROM public.lead_distributions d
        WHERE d.quote_id = q.id AND d.company_id = _company_id AND d.revoked_at IS NULL
      )
      OR (
        NOT EXISTS (SELECT 1 FROM public.lead_distributions d WHERE d.quote_id = q.id)
        AND public.fn_company_matches_lead(_company_id, q.id)
      )
    )
    -- hide leads currently locked in an exclusive window for another company
    AND NOT EXISTS (
      SELECT 1 FROM public.quote_assignments a
      WHERE a.quote_id = q.id
        AND a.is_exclusive = true
        AND a.company_id <> _company_id
        AND a.state IN ('invited','active','quoted')
        AND (a.sla_due_at IS NULL OR a.sla_due_at > now())
    )
  ORDER BY COALESCE(q.published_at, q.created_at) DESC
  LIMIT 200;
$$;