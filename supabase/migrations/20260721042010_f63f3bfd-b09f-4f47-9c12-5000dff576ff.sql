
CREATE OR REPLACE FUNCTION public.fn_assign_multi(
  _quote_id uuid,
  _company_ids uuid[],
  _sla_hours integer DEFAULT NULL
)
RETURNS SETOF public.quote_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_phase lead_phase_enum;
  v_company_id uuid;
  v_row public.quote_assignments;
  v_ids uuid[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _company_ids IS NULL OR array_length(_company_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'no companies selected';
  END IF;

  -- Deduplicate
  SELECT array_agg(DISTINCT c) INTO v_ids FROM unnest(_company_ids) AS c;

  IF array_length(v_ids, 1) = 1 THEN
    v_row := public.fn_assign_exclusive(_quote_id, v_ids[1], _sla_hours);
    RETURN NEXT v_row;
    RETURN;
  END IF;

  -- Multi-company: open the market and invite each
  SELECT lead_phase INTO v_phase FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote not found'; END IF;
  IF v_phase = 'closed' THEN RAISE EXCEPTION 'lead is closed'; END IF;

  -- Withdraw any existing non-terminal exclusive assignment
  UPDATE public.quote_assignments
    SET state = 'superseded', closed_at = v_now, updated_at = v_now
  WHERE quote_id = _quote_id AND is_exclusive = true
    AND state IN ('invited','active','quoted');

  UPDATE public.quotes SET
    lead_phase = 'open_market',
    exclusive_assignment_id = NULL,
    exclusive_started_at = NULL,
    exclusive_expires_at = NULL,
    exclusive_paused_at = NULL,
    exclusive_pause_reason = NULL,
    open_market_opened_at = COALESCE(open_market_opened_at, v_now),
    last_activity_at = v_now
  WHERE id = _quote_id;

  PERFORM public.log_lead_event(_quote_id, 'phase.open_market', 'broker',
    jsonb_build_object('reason','multi_assign','companies', v_ids));

  FOREACH v_company_id IN ARRAY v_ids LOOP
    -- Skip if already has active assignment
    IF EXISTS (
      SELECT 1 FROM public.quote_assignments
      WHERE quote_id = _quote_id AND company_id = v_company_id
        AND state IN ('invited','active','quoted')
    ) THEN CONTINUE; END IF;

    INSERT INTO public.quote_assignments (
      quote_id, company_id, is_exclusive, state, invited_at, assigned_by
    ) VALUES (
      _quote_id, v_company_id, false, 'invited', v_now, auth.uid()
    ) RETURNING * INTO v_row;

    PERFORM public.log_lead_event(_quote_id, 'assignment.invited', 'broker',
      jsonb_build_object('company_id', v_company_id, 'mode','multi'),
      v_row.id, v_company_id);

    RETURN NEXT v_row;
  END LOOP;
  RETURN;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_assign_multi(uuid, uuid[], integer) TO authenticated;
