-- 1. Remove the insecure blanket anon read policy.
DROP POLICY IF EXISTS "Anon can view quote by portal token" ON public.quotes;

-- 2. Secure, exact-token portal read.
CREATE OR REPLACE FUNCTION public.fn_portal_quote(_quote_number text, _token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q public.quotes;
  allowed text[] := ARRAY[
    'id','quote_number','portal_token','status','accepted_at','created_at',
    'contact_email','contact_phone','origin_address','origin_city','origin_state','origin_zip',
    'destination_address','destination_city','destination_state','destination_zip',
    'move_date','distance_miles','num_movers','labor_hours','truck_size',
    'estimated_cubic_feet','estimated_weight_lbs','estimated_low','estimated_high',
    'insurance_tier','inventory','breakdown','details','job_status','final_price',
    'final_move_date','arrival_window','crew_size','final_truck_size','company_notes',
    'final_quote_sent_at','customer_response_at'
  ];
  result jsonb;
BEGIN
  IF _quote_number IS NULL OR _token IS NULL OR length(btrim(_token)) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO q
  FROM public.quotes
  WHERE quote_number = _quote_number
    AND portal_token IS NOT NULL
    AND portal_token = _token;

  IF q.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_object_agg(k, v) INTO result
  FROM jsonb_each(to_jsonb(q)) AS e(k, v)
  WHERE k = ANY(allowed);

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_portal_quote(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_portal_quote(text, text) TO anon, authenticated;

-- 3. Ticket lookup for the quote the caller just created (client-generated unguessable id).
CREATE OR REPLACE FUNCTION public.fn_quote_ticket(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE q public.quotes;
BEGIN
  IF _id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO q
  FROM public.quotes
  WHERE id = _id
    AND created_at > now() - interval '1 hour';

  IF q.id IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', q.id,
    'quote_number', q.quote_number,
    'portal_token', q.portal_token
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_quote_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_quote_ticket(uuid) TO anon, authenticated;