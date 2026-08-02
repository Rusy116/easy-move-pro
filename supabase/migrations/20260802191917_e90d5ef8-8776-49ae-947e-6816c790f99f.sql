CREATE OR REPLACE FUNCTION public.fn_company_complete_move(_quote_id uuid, _company_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.quotes;
BEGIN
  IF NOT (public.fn_is_company_member(_company_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF q.assigned_company_id IS DISTINCT FROM _company_id THEN
    RAISE EXCEPTION 'This lead is not assigned to your company';
  END IF;

  UPDATE public.quotes
     SET job_status = 'completed',
         lead_status = 'completed'::lead_status_enum,
         lead_status_updated_at = now(),
         company_notes = COALESCE(_notes, company_notes),
         last_activity_at = now()
   WHERE id = _quote_id;

  -- Keep the job record in step with the lead
  UPDATE public.jobs
     SET status = 'completed', updated_at = now()
   WHERE quote_id = _quote_id AND status <> 'completed';

  -- Commission becomes earned once the move is delivered
  UPDATE public.company_commissions
     SET status = 'earned', updated_at = now()
   WHERE quote_id = _quote_id AND status = 'pending';

  PERFORM public.fn_job_log(_quote_id, _company_id, 'complete', q.job_status, 'completed',
    jsonb_build_object('notes', _notes));

  INSERT INTO public.lead_events (quote_id, company_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, _company_id, 'mover', auth.uid(), 'move.completed',
          jsonb_build_object('notes', _notes));

  PERFORM public.fn_notify_marketplace(_quote_id, 'move_completed', 'Move completed',
    'The move has been marked completed. A review request is now available.', _company_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;