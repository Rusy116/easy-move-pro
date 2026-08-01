CREATE OR REPLACE FUNCTION public.fn_fulfill_accepted_quote(_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q public.quotes; cust public.customers; job public.jobs; bol public.bills_of_lading;
  inv public.company_invoices; amount numeric; rate numeric; commission numeric; profit numeric;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF q.assigned_company_id IS NULL THEN RAISE EXCEPTION 'Quote has no assigned company'; END IF;

  amount := COALESCE(q.final_accepted_price, q.final_price);
  IF amount IS NULL THEN RAISE EXCEPTION 'Quote has no final price'; END IF;

  rate := 0.25;
  commission := ROUND(amount * rate, 2);
  profit := ROUND(amount - commission, 2);

  UPDATE public.quotes
     SET status='won',
         job_status='scheduled',
         final_accepted_price=amount,
         broker_commission=commission,
         gross_profit=profit,
         last_activity_at=now()
   WHERE id=q.id;

  UPDATE public.quote_assignments
     SET state='won', won_at=now(), closed_at=now(), updated_at=now()
   WHERE quote_id=q.id AND company_id=q.assigned_company_id AND state <> 'won';

  INSERT INTO public.customers (company_id, user_id, quote_id, full_name, email, phone, origin_address, destination_address)
  VALUES (q.assigned_company_id, q.user_id, q.id,
          COALESCE(q.details->>'full_name', q.details->>'fullName', q.contact_email),
          q.contact_email, q.contact_phone, q.origin_address, q.destination_address)
  ON CONFLICT (company_id, quote_id) DO UPDATE
    SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, phone=EXCLUDED.phone, updated_at=now()
  RETURNING * INTO cust;

  INSERT INTO public.jobs (job_number, quote_id, company_id, customer_id,
    status, scheduled_date, arrival_window, crew_size, truck_size, final_price, broker_commission, gross_profit, notes)
  VALUES ('JOB-' || to_char(now(),'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    q.id, q.assigned_company_id, cust.id, 'scheduled',
    COALESCE(q.final_move_date, q.move_date), q.arrival_window,
    COALESCE(q.crew_size, q.num_movers), COALESCE(q.final_truck_size, q.truck_size),
    amount, commission, profit, q.company_notes)
  ON CONFLICT (quote_id) DO UPDATE
    SET final_price=EXCLUDED.final_price, broker_commission=EXCLUDED.broker_commission,
        gross_profit=EXCLUDED.gross_profit, status='scheduled',
        scheduled_date=EXCLUDED.scheduled_date, updated_at=now()
  RETURNING * INTO job;

  SELECT * INTO inv FROM public.company_invoices WHERE quote_id=q.id AND kind='final' LIMIT 1;
  IF inv.id IS NULL THEN
    INSERT INTO public.company_invoices (company_id, quote_id, number, kind, status,
      customer_name, customer_email, customer_phone, subtotal, tax_amount, tax_rate, total,
      due_date, notes, created_by)
    VALUES (q.assigned_company_id, q.id, public.generate_company_invoice_number(), 'final', 'sent',
      cust.full_name, cust.email, cust.phone, amount, 0, 0, amount,
      current_date + 7, 'Auto-generated from accepted final quote', auth.uid())
    RETURNING * INTO inv;

    INSERT INTO public.company_invoice_items (invoice_id, company_id, description, quantity, unit_price, amount, position)
    VALUES (inv.id, q.assigned_company_id, 'Moving services — final quote', 1, amount, amount, 1);
  END IF;

  INSERT INTO public.bills_of_lading (number, job_id, quote_id, company_id, payload)
  VALUES ('BOL-' || to_char(now(),'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    job.id, q.id, q.assigned_company_id,
    jsonb_build_object(
      'quote_number', q.quote_number,
      'customer', jsonb_build_object('name', cust.full_name, 'email', cust.email, 'phone', cust.phone),
      'origin', q.origin_address, 'destination', q.destination_address,
      'move_date', COALESCE(q.final_move_date, q.move_date),
      'inventory', q.inventory, 'cubic_feet', q.estimated_cubic_feet,
      'weight_lbs', q.estimated_weight_lbs, 'truck_size', COALESCE(q.final_truck_size, q.truck_size),
      'crew_size', COALESCE(q.crew_size, q.num_movers),
      'total', amount))
  ON CONFLICT (job_id) DO NOTHING
  RETURNING * INTO bol;

  PERFORM public.fn_job_log(q.id, q.assigned_company_id, 'job_scheduled', q.job_status, 'scheduled',
    jsonb_build_object('amount', amount, 'job_id', job.id, 'invoice', inv.number, 'commission', commission));
  PERFORM public.fn_notify_broker(q.id, 'final_quote_accepted',
    'Customer ACCEPTED the final quote — $' || ROUND(amount)::text ||
    ' · job ' || job.job_number || ' scheduled · commission $' || ROUND(commission)::text);
  PERFORM public.fn_notify_marketplace(q.id, 'final_quote_accepted', 'Final quote accepted',
    'The customer accepted your final quote. Job ' || job.job_number || ' is now scheduled.', q.assigned_company_id);
  IF q.user_id IS NOT NULL THEN
    PERFORM public.fn_customer_notify(q.user_id, q.id, 'move_scheduled', 'Your move is booked',
      'Job ' || job.job_number || ' is scheduled. Your bill of lading is available in your portal.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'job_id', job.id, 'job_number', job.job_number,
    'invoice_number', inv.number, 'bill_of_lading', COALESCE(bol.number,''), 'commission', commission);
END $function$;

CREATE OR REPLACE FUNCTION public.fn_customer_respond_final_quote(_quote_number text, _token text, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; nxt text; fulfil jsonb;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quote_number=_quote_number AND portal_token=_token FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF q.job_status <> 'final_quote_sent' THEN RAISE EXCEPTION 'No final quote awaiting a response'; END IF;
  nxt := CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END;
  UPDATE public.quotes SET job_status=nxt, customer_response_at=now(), last_activity_at=now(),
    accepted_at = CASE WHEN _accept THEN now() ELSE accepted_at END
  WHERE id=q.id;
  PERFORM public.fn_job_log(q.id, q.assigned_company_id,
    CASE WHEN _accept THEN 'customer_accepted_final' ELSE 'customer_rejected_final' END,
    q.job_status, nxt, '{}'::jsonb);
  IF NOT _accept THEN
    UPDATE public.company_claims SET status='rejected', released_at=now(), updated_at=now() WHERE quote_id=q.id;
    RETURN jsonb_build_object('ok', true, 'status', nxt);
  END IF;

  fulfil := public.fn_fulfill_accepted_quote(q.id);
  RETURN jsonb_build_object('ok', true, 'status', 'accepted') || fulfil;
END $function$;

-- Backfill the quote accepted before this fix landed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.quotes
     WHERE job_status='accepted' AND assigned_company_id IS NOT NULL
       AND COALESCE(final_accepted_price, final_price) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.quote_id = quotes.id)
  LOOP
    PERFORM public.fn_fulfill_accepted_quote(r.id);
  END LOOP;
END $$;