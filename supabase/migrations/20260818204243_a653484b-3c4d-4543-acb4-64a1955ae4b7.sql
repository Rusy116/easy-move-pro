CREATE OR REPLACE FUNCTION public.fn_sla_tick()
 RETURNS TABLE(quote_id uuid, assignment_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RETURNING a.quote_id AS aq_id, a.id AS aa_id
  ),
  move_phase AS (
    UPDATE public.quotes q
    SET lead_phase='open_market',
        exclusive_assignment_id=NULL,
        open_market_opened_at=COALESCE(q.open_market_opened_at, v_now),
        last_activity_at=v_now
    FROM overdue
    WHERE q.id = overdue.q_id
    RETURNING q.id AS mq_id
  ),
  log_expired AS (
    INSERT INTO public.lead_events (quote_id, assignment_id, event_type, actor_role, payload)
    SELECT overdue.q_id, overdue.a_id, 'sla.expired', 'system',
      jsonb_build_object('at', v_now)
    FROM overdue
    RETURNING lead_events.id AS le_id
  ),
  log_phase AS (
    INSERT INTO public.lead_events (quote_id, event_type, actor_role, payload)
    SELECT overdue.q_id, 'phase.open_market', 'system',
      jsonb_build_object('reason','sla_expired')
    FROM overdue
    RETURNING lead_events.id AS lp_id
  ),
  notify_admins AS (
    INSERT INTO public.admin_notifications (type, quote_id, message)
    SELECT 'sla_expired', overdue.q_id,
      'Exclusive SLA expired — lead moved to Open Market'
    FROM overdue
    RETURNING admin_notifications.id AS an_id
  )
  SELECT overdue.q_id, overdue.a_id FROM overdue;
END $function$;