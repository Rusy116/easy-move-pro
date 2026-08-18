
-- ============================================================
-- Phase 2: Lead Assignment Engine backend
-- ============================================================

-- 1. Default visibility mask (strict per approved decision #3)
-- Hidden fields default to true = "hidden until broker unlocks"
-- Fields NOT in the mask (city, zip, move_size, inventory, move_date, move_type)
-- are always visible to entitled movers.

CREATE OR REPLACE FUNCTION public.default_visibility_mask()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'full_name', true,
    'phone', true,
    'email', true,
    'origin_street', true,
    'destination_street', true,
    'origin_address', true,
    'destination_address', true,
    'origin_lat', true,
    'origin_lng', true,
    'destination_lat', true,
    'destination_lng', true,
    'notes', true,
    'contact_preference', true
  )
$$;

-- Backfill existing quotes with the strict default where empty
UPDATE public.quotes
SET visibility_mask = public.default_visibility_mask()
WHERE visibility_mask IS NULL OR visibility_mask = '{}'::jsonb;

ALTER TABLE public.quotes
  ALTER COLUMN visibility_mask SET DEFAULT public.default_visibility_mask();

-- 2. Helper: does the current user's company have visibility on this lead?
CREATE OR REPLACE FUNCTION public.mover_can_see_quote(_quote_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid() LIMIT 1
  ),
  co AS (
    SELECT c.id, COALESCE(c.approved, false) AS approved, COALESCE(c.suspended, false) AS suspended
    FROM public.moving_companies c
    WHERE c.id = (SELECT company_id FROM me)
  ),
  q AS (
    SELECT id, lead_phase FROM public.quotes WHERE id = _quote_id
  )
  SELECT
    EXISTS (SELECT 1 FROM co WHERE NOT suspended) AND (
      -- Any assignment (current or historical) belongs to this company
      EXISTS (
        SELECT 1 FROM public.quote_assignments a
        WHERE a.quote_id = _quote_id AND a.company_id = (SELECT id FROM co)
      )
      OR
      -- Or the lead is in open_market and the company is approved (discovery)
      (
        (SELECT lead_phase FROM q) = 'open_market'
        AND EXISTS (SELECT 1 FROM co WHERE approved)
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.mover_can_see_quote(uuid) TO authenticated;

-- 3. Masked mover lead view
DROP VIEW IF EXISTS public.mover_lead_view;
CREATE VIEW public.mover_lead_view
WITH (security_invoker = true)
AS
SELECT
  q.id,
  q.quote_number,
  q.lead_phase,
  q.move_type,
  q.move_size,
  q.move_date,
  q.preferred_time,
  q.flexible_date,
  q.origin_city,
  q.origin_state,
  q.origin_zip,
  q.destination_city,
  q.destination_state,
  q.destination_zip,
  q.distance_miles,
  q.estimated_cubic_feet,
  q.estimated_weight_lbs,
  q.truck_size,
  q.num_movers,
  q.property_type,
  q.floor,
  q.elevator,
  q.origin_stairs,
  q.destination_stairs,
  q.origin_elevator,
  q.destination_elevator,
  q.origin_long_carry,
  q.destination_long_carry,
  q.packing, q.unpacking, q.storage, q.assembly, q.junk_removal,
  q.heavy_items, q.piano, q.safe, q.gym_equipment, q.appliances, q.fragile_items,
  q.insurance_tier,
  q.inventory,
  q.estimated_low,
  q.estimated_high,
  q.exclusive_started_at,
  q.exclusive_expires_at,
  q.exclusive_paused_at,
  q.open_market_opened_at,
  q.created_at,
  q.last_activity_at,
  -- Masked PII: revealed only when mask value is false or absent
  CASE WHEN COALESCE((q.visibility_mask->>'full_name')::boolean, true) = false THEN q.details->>'fullName' END AS full_name,
  CASE WHEN COALESCE((q.visibility_mask->>'phone')::boolean, true) = false THEN q.contact_phone END AS contact_phone,
  CASE WHEN COALESCE((q.visibility_mask->>'email')::boolean, true) = false THEN q.contact_email END AS contact_email,
  CASE WHEN COALESCE((q.visibility_mask->>'origin_street')::boolean, true) = false THEN q.origin_address END AS origin_address,
  CASE WHEN COALESCE((q.visibility_mask->>'destination_street')::boolean, true) = false THEN q.destination_address END AS destination_address
FROM public.quotes q
WHERE public.mover_can_see_quote(q.id);

GRANT SELECT ON public.mover_lead_view TO authenticated;

-- 4. Event logger helper
CREATE OR REPLACE FUNCTION public.log_lead_event(
  _quote_id uuid,
  _event_type text,
  _actor_role text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _assignment_id uuid DEFAULT NULL,
  _company_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_events (quote_id, assignment_id, company_id, event_type, actor_id, actor_role, payload)
  VALUES (_quote_id, _assignment_id, _company_id, _event_type, auth.uid(), _actor_role, _payload);
EXCEPTION WHEN OTHERS THEN
  -- Never let logging fail a transition
  NULL;
END $$;

-- 5. Admin/broker helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 6. Broker RPCs (SECURITY DEFINER; verify admin)
-- ============================================================

-- Assign exclusive
CREATE OR REPLACE FUNCTION public.fn_assign_exclusive(_quote_id uuid, _company_id uuid, _sla_hours int DEFAULT NULL)
RETURNS public.quote_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hours int;
  v_row public.quote_assignments;
  v_now timestamptz := now();
  v_phase lead_phase_enum;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COALESCE(_sla_hours, (SELECT exclusive_hours FROM public.sla_policies WHERE is_default LIMIT 1), 12)
    INTO v_hours;

  -- Lock the quote row
  SELECT lead_phase INTO v_phase FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'quote not found'; END IF;
  IF v_phase = 'closed' THEN RAISE EXCEPTION 'lead is closed'; END IF;

  -- Withdraw any existing non-terminal exclusive assignment
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
GRANT EXECUTE ON FUNCTION public.fn_assign_exclusive(uuid, uuid, int) TO authenticated;

-- Withdraw assignment
CREATE OR REPLACE FUNCTION public.fn_withdraw_assignment(_assignment_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_a public.quote_assignments;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_a FROM public.quote_assignments WHERE id = _assignment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment not found'; END IF;
  IF v_a.state IN ('accepted','declined','expired','withdrawn','superseded','lost') THEN
    RETURN; -- already terminal
  END IF;
  UPDATE public.quote_assignments SET state='withdrawn', closed_at=now(), updated_at=now(),
    decline_reason=COALESCE(_reason, decline_reason)
    WHERE id = _assignment_id;
  -- If this was the exclusive assignment, clear pointer (broker may re-assign or force open market separately)
  UPDATE public.quotes SET exclusive_assignment_id = NULL
    WHERE exclusive_assignment_id = _assignment_id;
  PERFORM public.log_lead_event(v_a.quote_id, 'assignment.withdrawn', 'broker',
    jsonb_build_object('reason', _reason), _assignment_id, v_a.company_id);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_withdraw_assignment(uuid, text) TO authenticated;

-- Reassign exclusive (withdraws current, opens new)
CREATE OR REPLACE FUNCTION public.fn_reassign_exclusive(_quote_id uuid, _new_company_id uuid, _sla_hours int DEFAULT NULL)
RETURNS public.quote_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.quote_assignments;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_row := public.fn_assign_exclusive(_quote_id, _new_company_id, _sla_hours);
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_reassign_exclusive(uuid, uuid, int) TO authenticated;

-- Force lead into open market (no auto-invites per approved decision #4)
CREATE OR REPLACE FUNCTION public.fn_force_open_market(_quote_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now(); v_phase lead_phase_enum;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT lead_phase INTO v_phase FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF v_phase = 'closed' THEN RAISE EXCEPTION 'lead is closed'; END IF;

  -- Expire any non-terminal exclusive assignments
  UPDATE public.quote_assignments SET state='expired', closed_at=v_now, updated_at=v_now
    WHERE quote_id=_quote_id AND is_exclusive=true AND state IN ('invited','active','quoted');

  UPDATE public.quotes SET
    lead_phase='open_market',
    exclusive_assignment_id=NULL,
    open_market_opened_at=COALESCE(open_market_opened_at, v_now),
    last_activity_at=v_now
  WHERE id=_quote_id;

  PERFORM public.log_lead_event(_quote_id, 'phase.open_market', 'broker',
    jsonb_build_object('reason', COALESCE(_reason,'broker_force')));
END $$;
GRANT EXECUTE ON FUNCTION public.fn_force_open_market(uuid, text) TO authenticated;

-- Close lead
CREATE OR REPLACE FUNCTION public.fn_close_lead(_quote_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason NOT IN ('won','lost','cancelled','duplicate','invalid') THEN
    RAISE EXCEPTION 'invalid close reason: %', _reason;
  END IF;
  UPDATE public.quote_assignments SET state='withdrawn', closed_at=v_now, updated_at=v_now
    WHERE quote_id=_quote_id AND state IN ('invited','active','quoted');
  UPDATE public.quotes SET
    lead_phase='closed', closed_at=v_now, closed_reason=_reason,
    exclusive_assignment_id=NULL, last_activity_at=v_now
  WHERE id=_quote_id;
  PERFORM public.log_lead_event(_quote_id, 'phase.closed', 'broker',
    jsonb_build_object('reason', _reason));
END $$;
GRANT EXECUTE ON FUNCTION public.fn_close_lead(uuid, text) TO authenticated;

-- Reopen closed lead → open market
CREATE OR REPLACE FUNCTION public.fn_reopen_lead(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quotes SET
    lead_phase='open_market', closed_at=NULL, closed_reason=NULL,
    open_market_opened_at=v_now, last_activity_at=v_now
  WHERE id=_quote_id AND lead_phase='closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'lead is not closed'; END IF;
  PERFORM public.log_lead_event(_quote_id, 'lead.reopened', 'broker', '{}'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_reopen_lead(uuid) TO authenticated;

-- Pause / resume / extend SLA
CREATE OR REPLACE FUNCTION public.fn_pause_sla(_quote_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quotes SET exclusive_paused_at=now(), exclusive_pause_reason=_reason
    WHERE id=_quote_id AND lead_phase='exclusive' AND exclusive_paused_at IS NULL;
  PERFORM public.log_lead_event(_quote_id, 'sla.paused', 'broker', jsonb_build_object('reason', _reason));
END $$;
GRANT EXECUTE ON FUNCTION public.fn_pause_sla(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_resume_sla(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paused timestamptz; v_expires timestamptz;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT exclusive_paused_at, exclusive_expires_at INTO v_paused, v_expires
    FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF v_paused IS NULL THEN RETURN; END IF;
  UPDATE public.quotes SET
    exclusive_expires_at = v_expires + (now() - v_paused),
    exclusive_paused_at = NULL,
    exclusive_pause_reason = NULL
  WHERE id=_quote_id;
  PERFORM public.log_lead_event(_quote_id, 'sla.resumed', 'broker', '{}'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_resume_sla(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_extend_sla(_quote_id uuid, _minutes int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quotes SET exclusive_expires_at = exclusive_expires_at + make_interval(mins => _minutes)
    WHERE id=_quote_id AND lead_phase='exclusive';
  PERFORM public.log_lead_event(_quote_id, 'sla.extended', 'broker', jsonb_build_object('minutes', _minutes));
END $$;
GRANT EXECUTE ON FUNCTION public.fn_extend_sla(uuid, int) TO authenticated;

-- Set visibility mask
CREATE OR REPLACE FUNCTION public.fn_set_visibility_mask(_quote_id uuid, _mask jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quotes SET visibility_mask = _mask WHERE id=_quote_id;
  PERFORM public.log_lead_event(_quote_id, 'visibility.changed', 'broker', jsonb_build_object('mask', _mask));
END $$;
GRANT EXECUTE ON FUNCTION public.fn_set_visibility_mask(uuid, jsonb) TO authenticated;

-- ============================================================
-- 7. Mover RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_current_mover_company()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.fn_current_mover_company() TO authenticated;

-- Mover opens the lead (invited -> active), no SLA impact
CREATE OR REPLACE FUNCTION public.fn_mover_open_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a public.quote_assignments; v_co uuid; v_now timestamptz := now();
BEGIN
  v_co := public.fn_current_mover_company();
  IF v_co IS NULL THEN RAISE EXCEPTION 'not a mover'; END IF;
  SELECT * INTO v_a FROM public.quote_assignments WHERE id=_assignment_id FOR UPDATE;
  IF NOT FOUND OR v_a.company_id <> v_co THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quote_assignments SET
    viewed_at = COALESCE(viewed_at, v_now),
    state = CASE WHEN state='invited' THEN 'active'::assignment_state_enum ELSE state END,
    updated_at = v_now
  WHERE id=_assignment_id;
  PERFORM public.log_lead_event(v_a.quote_id, 'assignment.viewed', 'mover', '{}'::jsonb, _assignment_id, v_co);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_mover_open_assignment(uuid) TO authenticated;

-- Mover marks contacted → pauses SLA
CREATE OR REPLACE FUNCTION public.fn_mover_mark_contacted(_assignment_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a public.quote_assignments; v_co uuid; v_now timestamptz := now();
BEGIN
  v_co := public.fn_current_mover_company();
  IF v_co IS NULL THEN RAISE EXCEPTION 'not a mover'; END IF;
  SELECT * INTO v_a FROM public.quote_assignments WHERE id=_assignment_id FOR UPDATE;
  IF NOT FOUND OR v_a.company_id <> v_co THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quote_assignments SET
    contacted_at = COALESCE(contacted_at, v_now),
    state = CASE WHEN state IN ('invited','active') THEN 'active'::assignment_state_enum ELSE state END,
    notes = COALESCE(_notes, notes),
    updated_at = v_now
  WHERE id=_assignment_id;
  -- Pause SLA on exclusive assignment
  IF v_a.is_exclusive THEN
    UPDATE public.quotes SET exclusive_paused_at = COALESCE(exclusive_paused_at, v_now),
      exclusive_pause_reason = COALESCE(exclusive_pause_reason, 'contacted')
    WHERE id = v_a.quote_id AND lead_phase = 'exclusive';
  END IF;
  PERFORM public.log_lead_event(v_a.quote_id, 'assignment.contacted', 'mover',
    jsonb_build_object('has_notes', _notes IS NOT NULL), _assignment_id, v_co);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_mover_mark_contacted(uuid, text) TO authenticated;

-- Mover declines
CREATE OR REPLACE FUNCTION public.fn_mover_decline(_assignment_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a public.quote_assignments; v_co uuid; v_now timestamptz := now();
BEGIN
  v_co := public.fn_current_mover_company();
  IF v_co IS NULL THEN RAISE EXCEPTION 'not a mover'; END IF;
  SELECT * INTO v_a FROM public.quote_assignments WHERE id=_assignment_id FOR UPDATE;
  IF NOT FOUND OR v_a.company_id <> v_co THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quote_assignments SET state='declined', declined_at=v_now, decline_reason=_reason,
    closed_at=v_now, updated_at=v_now
  WHERE id=_assignment_id;
  -- If exclusive, immediately open the market
  IF v_a.is_exclusive THEN
    UPDATE public.quotes SET
      lead_phase='open_market', exclusive_assignment_id=NULL,
      open_market_opened_at=COALESCE(open_market_opened_at, v_now),
      last_activity_at=v_now
    WHERE id=v_a.quote_id AND lead_phase='exclusive';
    PERFORM public.log_lead_event(v_a.quote_id, 'phase.open_market', 'system',
      jsonb_build_object('reason','mover_declined'));
  END IF;
  PERFORM public.log_lead_event(v_a.quote_id, 'assignment.declined', 'mover',
    jsonb_build_object('reason',_reason), _assignment_id, v_co);
END $$;
GRANT EXECUTE ON FUNCTION public.fn_mover_decline(uuid, text) TO authenticated;

-- Mover claims an open-market lead (discovery model — no auto-invites)
CREATE OR REPLACE FUNCTION public.fn_mover_claim_open_market(_quote_id uuid)
RETURNS public.quote_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_co uuid; v_now timestamptz := now(); v_phase lead_phase_enum;
  v_existing public.quote_assignments; v_row public.quote_assignments;
  v_approved boolean;
BEGIN
  v_co := public.fn_current_mover_company();
  IF v_co IS NULL THEN RAISE EXCEPTION 'not a mover'; END IF;
  SELECT COALESCE(approved,false) AND NOT COALESCE(suspended,false) INTO v_approved
    FROM public.moving_companies WHERE id=v_co;
  IF NOT COALESCE(v_approved,false) THEN RAISE EXCEPTION 'company not approved'; END IF;

  SELECT lead_phase INTO v_phase FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF v_phase <> 'open_market' THEN RAISE EXCEPTION 'lead not in open market'; END IF;

  -- If mover already has a non-terminal assignment, return it
  SELECT * INTO v_existing FROM public.quote_assignments
    WHERE quote_id=_quote_id AND company_id=v_co
      AND state IN ('invited','active','quoted')
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;

  INSERT INTO public.quote_assignments (quote_id, company_id, is_exclusive, state, invited_at)
    VALUES (_quote_id, v_co, false, 'active', v_now)
    RETURNING * INTO v_row;

  UPDATE public.quotes SET last_activity_at=v_now WHERE id=_quote_id;

  PERFORM public.log_lead_event(_quote_id, 'assignment.claimed', 'mover',
    jsonb_build_object('company_id', v_co), v_row.id, v_co);
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_mover_claim_open_market(uuid) TO authenticated;

-- ============================================================
-- 8. SLA cron tick — expire overdue exclusive windows and move to open market.
--     Does NOT auto-invite any companies (approved decision #4).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sla_tick()
RETURNS TABLE(quote_id uuid, assignment_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now();
BEGIN
  RETURN QUERY
  WITH overdue AS (
    SELECT q.id AS q_id, q.exclusive_assignment_id AS a_id
    FROM public.quotes q
    WHERE q.lead_phase = 'exclusive'
      AND q.exclusive_paused_at IS NULL
      AND q.exclusive_expires_at IS NOT NULL
      AND q.exclusive_expires_at <= v_now
    FOR UPDATE SKIP LOCKED
  ),
  expire_assignments AS (
    UPDATE public.quote_assignments a
    SET state='expired', closed_at=v_now, updated_at=v_now
    FROM overdue
    WHERE a.id = overdue.a_id AND a.state IN ('invited','active','quoted')
    RETURNING a.quote_id, a.id
  ),
  move_phase AS (
    UPDATE public.quotes q
    SET lead_phase='open_market',
        exclusive_assignment_id=NULL,
        open_market_opened_at=COALESCE(open_market_opened_at, v_now),
        last_activity_at=v_now
    FROM overdue
    WHERE q.id = overdue.q_id
    RETURNING q.id AS q_id
  ),
  log_expired AS (
    INSERT INTO public.lead_events (quote_id, assignment_id, event_type, actor_role, payload)
    SELECT overdue.q_id, overdue.a_id, 'sla.expired', 'system',
      jsonb_build_object('at', v_now)
    FROM overdue
    RETURNING public.lead_events.quote_id
  ),
  log_phase AS (
    INSERT INTO public.lead_events (quote_id, event_type, actor_role, payload)
    SELECT overdue.q_id, 'phase.open_market', 'system',
      jsonb_build_object('reason','sla_expired')
    FROM overdue
    ETURNING public.lead_events.quote_id
  ),
  notify_admins AS (
    INSERT INTO public.admin_notifications (type, quote_id, message)
    SELECT 'sla_expired', overdue.q_id,
      'Exclusive SLA expired — lead moved to Open Market'
    FROM overdue
    RETURNING quote_id
  )
  SELECT overdue.q_id, overdue.a_id FROM overdue;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_sla_tick() TO service_role;

-- ============================================================
-- 9. RLS: allow mover to read own company_members row (needed by view helpers)
-- (existing policies already cover quote_assignments select for movers)
-- ============================================================

-- No-op ensure — the mover_lead_view uses security_invoker so it respects
-- quotes RLS. Add a permissive SELECT policy so entitled movers can read
-- via the view (mover_can_see_quote gates access).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='quotes' AND policyname='Movers can read entitled leads'
  ) THEN
    CREATE POLICY "Movers can read entitled leads" ON public.quotes
      FOR SELECT TO authenticated
      USING (public.mover_can_see_quote(id));
  END IF;
END $$;
