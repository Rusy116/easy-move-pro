CREATE OR REPLACE FUNCTION public.fn_company_complete_job(_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q public.quotes; amount numeric; commission numeric; inv public.company_invoices;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF q.assigned_company_id IS NULL OR NOT public.fn_is_company_member(q.assigned_company_id) THEN
    RAISE EXCEPTION 'You do not own this job';
  END IF;

  amount := COALESCE(q.final_accepted_price, q.final_price);
  IF amount IS NULL THEN RAISE EXCEPTION 'Set the final agreed price before completing this job'; END IF;

  -- Creates customer, job, invoice and bill of lading when missing.
  PERFORM public.fn_fulfill_accepted_quote(_quote_id);

  commission := ROUND(amount * 0.25, 2);
  SELECT * INTO inv FROM public.company_invoices WHERE quote_id = _quote_id AND kind = 'final' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.company_commissions WHERE quote_id = _quote_id) THEN
    INSERT INTO public.company_commissions (quote_id, company_id, base_price, rate, amount, status, invoice_id, due_date)
    VALUES (_quote_id, q.assigned_company_id, amount, 0.25, commission, 'pending', inv.id, current_date + 14);
  END IF;

  UPDATE public.quotes
     SET job_status = 'completed', completed_at = now(), last_activity_at = now()
   WHERE id = _quote_id;

  UPDATE public.jobs SET status = 'completed', updated_at = now() WHERE quote_id = _quote_id;

  PERFORM public.fn_job_log(_quote_id, q.assigned_company_id, 'complete', q.job_status, 'completed',
    jsonb_build_object('amount', amount, 'commission', commission, 'invoice', inv.number));

  RETURN jsonb_build_object('ok', true, 'invoice', inv.number, 'commission', commission);
END $function$;