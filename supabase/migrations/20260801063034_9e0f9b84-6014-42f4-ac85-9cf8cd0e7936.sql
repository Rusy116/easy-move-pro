CREATE OR REPLACE FUNCTION public.fn_portal_current_estimate(_quote_number text, _token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE q public.quotes; rev public.estimate_revisions; co public.moving_companies;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quote_number = _quote_number AND portal_token = _token;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;

  SELECT * INTO rev FROM public.estimate_revisions
   WHERE quote_id = q.id AND status IN ('sent','viewed','accepted','rejected')
   ORDER BY is_current DESC, revision DESC LIMIT 1;
  IF rev.id IS NULL THEN RETURN jsonb_build_object('ok', true, 'estimate', NULL); END IF;

  PERFORM public.fn_estimate_mark_viewed(rev.id);
  SELECT * INTO rev FROM public.estimate_revisions WHERE id = rev.id;
  SELECT * INTO co FROM public.moving_companies WHERE id = rev.company_id;

  RETURN jsonb_build_object('ok', true, 'estimate', jsonb_build_object(
    'id', rev.id, 'revision', rev.revision, 'amount', rev.amount, 'status', rev.status,
    'breakdown', rev.breakdown, 'notes', rev.notes, 'valid_until', rev.valid_until,
    'sent_at', rev.sent_at, 'viewed_at', rev.viewed_at, 'accepted_at', rev.accepted_at,
    'rejected_at', rev.rejected_at, 'company_name', co.name));
END $$;

CREATE OR REPLACE FUNCTION public.fn_portal_respond_estimate(
  _quote_number text, _token text, _accept boolean, _reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE q public.quotes; rev public.estimate_revisions;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE quote_number = _quote_number AND portal_token = _token;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Quote not found'; END IF;
  SELECT * INTO rev FROM public.estimate_revisions
   WHERE quote_id = q.id AND status IN ('sent','viewed')
   ORDER BY is_current DESC, revision DESC LIMIT 1;
  IF rev.id IS NULL THEN RAISE EXCEPTION 'No estimate awaiting your response'; END IF;
  RETURN public.fn_estimate_respond(rev.id, _accept, _reason);
END $$;

GRANT EXECUTE ON FUNCTION public.fn_portal_current_estimate(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_portal_respond_estimate(text, text, boolean, text) TO anon, authenticated;