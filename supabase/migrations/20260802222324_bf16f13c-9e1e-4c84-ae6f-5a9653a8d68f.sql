
CREATE OR REPLACE FUNCTION public.fn_claim_expiry_tick()
RETURNS TABLE(quote_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_now timestamptz := now(); v_co uuid;
BEGIN
  FOR r IN
    SELECT q.id AS qid, q.assigned_company_id AS coid, q.quote_number AS qnum
    FROM public.quotes q
    WHERE q.job_status = 'claimed'
      AND q.claim_deadline_at IS NOT NULL
      AND q.claim_deadline_at <= v_now
  LOOP
    v_co := r.coid;
    PERFORM public.fn_return_job_to_market(r.qid, '12-hour response timer expired', 'claim_expired');

    UPDATE public.company_claims cc
      SET status = 'expired', updated_at = v_now
      WHERE cc.quote_id = r.qid AND cc.company_id = v_co AND cc.status = 'released';

    IF v_co IS NOT NULL THEN
      PERFORM public.fn_issue_company_warning(v_co, r.qid, 'claim_expired',
        'You did not contact the customer within 12 hours. Lead '
        || COALESCE(r.qnum,'') || ' returned to the marketplace.');
    END IF;

    RETURN QUERY SELECT r.qid;
  END LOOP;
END $$;
