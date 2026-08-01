CREATE OR REPLACE FUNCTION public.fn_assign_exclusive(_quote_id uuid, _company_id uuid, _sla_hours integer DEFAULT NULL)
RETURNS public.quote_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours int;
  v_row public.quote_assignments;
  v_now timestamptz := now();
  v_phase lead_phase_enum;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(
      _sla_hours,
      (SELECT GREATEST(1, ROUND(exclusive_window_minutes / 60.0))::int
         FROM public.sla_policies WHERE is_default LIMIT 1),
      12)
    INTO v_hours;

  SELECT lead_phase INTO v_phase FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote not found'; END IF;
  IF v_phase = 'closed' THEN RAISE EXCEPTION 'lead is closed'; END IF;

  UPDATE public.quote_assignments
    SET state = 'withdrawn', closed_at = v_now, updated_at = v_now
    WHERE quote_id = _quote_id AND is_exclusive = true
      AND state IN ('invited','active','quoted');

  INSERT INTO public.quote_assignments (
    quote_id, company_id, is_exclusive, state, invited_at, sla_due_at, assigned_by
  ) VALUES (
    _quote_id, _company_id, true, 'invited', v_now, v_now + make_interval(hours => v_hours), auth.uid()
  ) RETURNING * INTO v_row;

  UPDATE public.quotes SET
    lead_phase = 'exclusive',
    exclusive_assignment_id = v_row.id,
    exclusive_started_at = v_now,
    exclusive_expires_at = v_now + make_interval(hours => v_hours),
    exclusive_paused_at = NULL,
    exclusive_pause_reason = NULL,
    last_activity_at = v_now
  WHERE id = _quote_id;

  PERFORM public.log_lead_event(_quote_id, 'assignment.invited', 'broker',
    jsonb_build_object('company_id', _company_id, 'sla_hours', v_hours),
    v_row.id, _company_id);

  RETURN v_row;
END $$;