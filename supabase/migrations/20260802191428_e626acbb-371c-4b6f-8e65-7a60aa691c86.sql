-- 1) Proper broker assignment action with timeline + audit + notification
CREATE OR REPLACE FUNCTION public.fn_assign_broker(_quote_id uuid, _broker_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev uuid;
  qnum text;
  bname text;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT assigned_broker_id, quote_number INTO prev, qnum
    FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF qnum IS NULL AND prev IS NULL AND NOT FOUND THEN RAISE EXCEPTION 'quote not found'; END IF;

  IF _broker_id IS NOT NULL AND NOT public.has_role(_broker_id, 'broker'::public.app_role)
     AND NOT public.has_role(_broker_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'user is not a broker';
  END IF;

  IF prev IS NOT DISTINCT FROM _broker_id THEN RETURN; END IF;

  UPDATE public.quotes
    SET assigned_broker_id = _broker_id,
        last_activity_at = now()
    WHERE id = _quote_id;

  SELECT COALESCE(full_name, first_name || ' ' || last_name) INTO bname
    FROM public.profiles WHERE id = _broker_id;

  INSERT INTO public.lead_events (quote_id, actor_type, actor_id, event_type, payload)
  VALUES (_quote_id, 'admin', auth.uid(),
          CASE WHEN _broker_id IS NULL THEN 'broker.unassigned' ELSE 'broker.assigned' END,
          jsonb_build_object('broker_id', _broker_id, 'broker', bname, 'previous_broker_id', prev));

  IF _broker_id IS NOT NULL THEN
    PERFORM public.fn_notify_broker(_quote_id, 'lead_assigned',
      'Lead ' || COALESCE(qnum, '') || ' assigned to you');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assign_broker(uuid, uuid) TO authenticated;

-- 2) Brokers only see their own or unassigned leads; admins see everything
DROP POLICY IF EXISTS "Staff can view all quotes" ON public.quotes;

CREATE POLICY "Brokers view assigned or unassigned quotes"
ON public.quotes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'broker'::public.app_role)
    AND (assigned_broker_id IS NULL OR assigned_broker_id = auth.uid())
  )
);