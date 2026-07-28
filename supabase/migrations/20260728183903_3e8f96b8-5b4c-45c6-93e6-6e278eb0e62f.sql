CREATE OR REPLACE FUNCTION public.accept_quote(_quote_number text, _portal_token text)
 RETURNS TABLE(id uuid, quote_number text, accepted_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prev_status text;
BEGIN
  SELECT q.status INTO _prev_status
  FROM public.quotes q
  WHERE q.quote_number = _quote_number AND q.portal_token = _portal_token;

  IF _prev_status IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.quotes q
  SET accepted_at = COALESCE(q.accepted_at, now()),
      status = CASE WHEN q.status IN ('won','lost','cancelled') THEN q.status ELSE 'accepted' END,
      last_activity_at = now()
  WHERE q.quote_number = _quote_number
    AND q.portal_token = _portal_token
  RETURNING q.id, q.quote_number, q.accepted_at, q.status;

  IF _prev_status NOT IN ('won','lost','cancelled','accepted') THEN
    INSERT INTO public.quote_status_history (quote_id, from_status, to_status)
    SELECT q.id, _prev_status, 'accepted'
    FROM public.quotes q
    WHERE q.quote_number = _quote_number AND q.portal_token = _portal_token;
  END IF;
END;
$function$;