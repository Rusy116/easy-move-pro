
-- Claim-aware unlock helper: PII only after a real claim by the current company
CREATE OR REPLACE FUNCTION public.fn_lead_claimed_by_company(_quote_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _company_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = _quote_id
        AND q.assigned_company_id = _company_id
        AND q.claimed_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.company_claims cc
      WHERE cc.quote_id = _quote_id
        AND cc.company_id = _company_id
        AND cc.released_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.quote_assignments a
      WHERE a.quote_id = _quote_id
        AND a.company_id = _company_id
        AND a.state IN ('accepted','quoted','won')
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.fn_lead_claimed_by_company(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_lead_unlocked(_quote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.fn_lead_claimed_by_company(_quote_id, public.fn_current_mover_company());
$function$;

-- Backend enforcement: no job mutations (incl. final quote) before claim ownership
CREATE OR REPLACE FUNCTION public.fn_company_update_job(_quote_id uuid, _action text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE prev text; cid uuid; nxt text;
BEGIN
  SELECT job_status, assigned_company_id INTO prev, cid FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF cid IS NULL OR NOT public.fn_is_company_member(cid) THEN RAISE EXCEPTION 'You do not own this job'; END IF;
  IF NOT public.fn_lead_claimed_by_company(_quote_id, cid) THEN
    RAISE EXCEPTION 'You must claim this job before updating it or sending a final quote';
  END IF;

  IF _action = 'contacted' THEN
    nxt := 'contacted';
    UPDATE public.quotes SET job_status=nxt, contacted_at=now(), last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'send_final_quote' THEN
    nxt := 'final_quote_sent';
    UPDATE public.quotes SET job_status=nxt,
      final_price = COALESCE((_payload->>'final_price')::numeric, final_price),
      final_move_date = COALESCE((_payload->>'final_move_date')::date, final_move_date),
      arrival_window = COALESCE(_payload->>'arrival_window', arrival_window),
      crew_size = COALESCE((_payload->>'crew_size')::int, crew_size),
      final_truck_size = COALESCE(_payload->>'final_truck_size', final_truck_size),
      company_notes = COALESCE(_payload->>'company_notes', company_notes),
      final_quote_sent_at = now(), last_activity_at = now()
    WHERE id=_quote_id;
  ELSIF _action = 'save_details' THEN
    nxt := NULL;
    UPDATE public.quotes SET
      final_price = COALESCE((_payload->>'final_price')::numeric, final_price),
      final_move_date = COALESCE((_payload->>'final_move_date')::date, final_move_date),
      arrival_window = COALESCE(_payload->>'arrival_window', arrival_window),
      crew_size = COALESCE((_payload->>'crew_size')::int, crew_size),
      final_truck_size = COALESCE(_payload->>'final_truck_size', final_truck_size),
      company_notes = COALESCE(_payload->>'company_notes', company_notes),
      last_activity_at = now()
    WHERE id=_quote_id;
  ELSIF _action = 'schedule' THEN
    nxt := 'booked';
    UPDATE public.quotes SET job_status=nxt, scheduled_at=now(), last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'complete' THEN
    nxt := 'completed';
    UPDATE public.quotes SET job_status=nxt, completed_at=now(), last_activity_at=now() WHERE id=_quote_id;
  ELSIF _action = 'cancel' THEN
    nxt := 'cancelled';
    UPDATE public.quotes SET job_status=nxt, cancelled_at=now(), last_activity_at=now() WHERE id=_quote_id;
  ELSE
    RAISE EXCEPTION 'Unknown action %', _action;
  END IF;

  PERFORM public.fn_job_log(_quote_id, cid, _action, prev, COALESCE(nxt, prev), _payload);
  RETURN jsonb_build_object('ok', true, 'status', COALESCE(nxt, prev));
END;
$function$;

-- Final price confirmation also requires a claim
CREATE OR REPLACE FUNCTION public.fn_company_confirm_final_price(_quote_id uuid, _company_id uuid, _final_price numeric, _deposit numeric DEFAULT NULL::numeric, _additional numeric DEFAULT 0, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  q public.quotes;
  total numeric;
  rate numeric := 0.25;
  comm public.company_commissions;
  inv public.commission_invoices;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;
  IF NOT (public.is_staff() OR public.fn_lead_claimed_by_company(_quote_id, _company_id)) THEN
    RAISE EXCEPTION 'You must claim this job before confirming a final price';
  END IF;
  IF q.lead_status IN ('price_confirmed'::lead_status_enum,'customer_confirmed'::lead_status_enum,'completed'::lead_status_enum) THEN
    RAISE EXCEPTION 'Price is already locked — request a price revision instead';
  END IF;

  total := COALESCE(_final_price, 0) + COALESCE(_additional, 0);

  UPDATE public.quotes
     SET final_price = total,
         company_notes = COALESCE(_notes, company_notes),
         final_quote_sent_at = now(),
         job_status = 'final_quote_sent',
         lead_status = 'price_confirmed'::lead_status_enum,
         lead_status_updated_at = now()
   WHERE id = _quote_id;

  INSERT INTO public.company_price_revisions (
    quote_id, company_id, revision, previous_price, new_price,
    deposit_amount, additional_charges, reason, notes, kind, requested_by
  ) VALUES (
    _quote_id, _company_id, 1, q.final_price, total,
    _deposit, COALESCE(_additional, 0), 'Initial final price', _notes, 'initial', auth.uid()
  );

  INSERT INTO public.company_commissions (quote_id, company_id, base_price, rate, amount, broker_id, customer_id, due_date)
  VALUES (_quote_id, _company_id, total, rate, ROUND(total * rate, 2), q.assigned_broker_id, q.user_id, current_date + 14)
  ON CONFLICT (quote_id, company_id)
  DO UPDATE SET base_price = EXCLUDED.base_price, rate = EXCLUDED.rate,
                amount = EXCLUDED.amount, updated_at = now()
  RETURNING * INTO comm;

  PERFORM public.fn_finance_audit('commission.created','commission', comm.id, _quote_id, NULL, NULL, to_jsonb(comm));

  inv := public.fn_generate_commission_invoice(comm.id);

  PERFORM public.fn_job_log(_quote_id, _company_id, 'price_confirmed', q.job_status, 'final_quote_sent',
    jsonb_build_object('final_price', total, 'deposit', _deposit, 'additional', _additional));

  PERFORM public.fn_notify_marketplace(_quote_id, 'price_confirmed', 'Final price confirmed',
    'The moving company confirmed a final price of $' || ROUND(total)::text, _company_id);

  RETURN jsonb_build_object('ok', true, 'final_price', total,
    'commission_amount', comm.amount, 'invoice_number', inv.number);
END;
$function$;
