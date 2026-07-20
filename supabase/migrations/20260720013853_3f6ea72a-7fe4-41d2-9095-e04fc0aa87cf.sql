CREATE OR REPLACE FUNCTION public.fn_close_lead(_quote_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason NOT IN ('won','lost','cancelled','duplicate','invalid') THEN
    RAISE EXCEPTION 'invalid close reason: %', _reason;
  END IF;
  UPDATE public.quote_assignments SET state='withdrawn', closed_at=v_now, updated_at=v_now
    WHERE quote_id=_quote_id AND state IN ('invited','active','quoted');
  UPDATE public.quotes SET
    lead_phase='closed', closed_at=v_now, closed_reason=_reason::lead_closed_reason_enum,
    exclusive_assignment_id=NULL, last_activity_at=v_now
  WHERE id=_quote_id;
  PERFORM public.log_lead_event(_quote_id, 'phase.closed', 'broker',
    jsonb_build_object('reason', _reason));
END $function$;