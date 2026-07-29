
-- ============ CUSTOMER NOTIFICATIONS ============
CREATE TABLE public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer notif read own" ON public.customer_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_staff());
CREATE POLICY "customer notif update own" ON public.customer_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_customer_notif_user ON public.customer_notifications(user_id, created_at DESC);

-- ============ CUSTOMER REVIEWS ============
CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.moving_companies(id) ON DELETE SET NULL,
  rating_professionalism smallint NOT NULL CHECK (rating_professionalism BETWEEN 1 AND 5),
  rating_communication smallint NOT NULL CHECK (rating_communication BETWEEN 1 AND 5),
  rating_punctuality smallint NOT NULL CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_overall smallint NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  title text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customer_reviews TO authenticated;
GRANT SELECT ON public.customer_reviews TO anon;
GRANT ALL ON public.customer_reviews TO service_role;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.customer_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews owner insert" ON public.customer_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews owner update" ON public.customer_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_customer_reviews_touch BEFORE UPDATE ON public.customer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ MY LIBRARY (digital purchases) ============
CREATE TABLE public.customer_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL,
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  download_url text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_purchases TO authenticated;
GRANT ALL ON public.customer_purchases TO service_role;
ALTER TABLE public.customer_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases read own" ON public.customer_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_staff());

-- ============ NOTIFICATION PREFERENCES ============
CREATE TABLE public.customer_preferences (
  user_id uuid PRIMARY KEY,
  email_status_updates boolean NOT NULL DEFAULT true,
  email_messages boolean NOT NULL DEFAULT true,
  email_marketing boolean NOT NULL DEFAULT false,
  sms_status_updates boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customer_preferences TO authenticated;
GRANT ALL ON public.customer_preferences TO service_role;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own all" ON public.customer_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_customer_prefs_touch BEFORE UPDATE ON public.customer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CANCELLATION DETAIL ON QUOTES ============
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- ============ CUSTOMER VISIBILITY POLICIES ============
CREATE OR REPLACE FUNCTION public.fn_owns_quote(_quote_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = _quote_id AND q.user_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.fn_owns_quote(uuid) TO authenticated;

-- assigned company profile
CREATE POLICY "customers view assigned company" ON public.moving_companies
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.assigned_company_id = moving_companies.id AND q.user_id = auth.uid())
  );

-- timeline
CREATE POLICY "customers read own lead events" ON public.lead_events
  FOR SELECT TO authenticated USING (public.fn_owns_quote(quote_id));

CREATE POLICY "customers read own status history" ON public.quote_status_history
  FOR SELECT TO authenticated USING (public.fn_owns_quote(quote_id));

-- documents attached to their move
CREATE POLICY "customers read own move documents" ON public.company_documents
  FOR SELECT TO authenticated USING (quote_id IS NOT NULL AND public.fn_owns_quote(quote_id));

-- messaging with the assigned company
CREATE POLICY "customers read own conversations" ON public.company_conversations
  FOR SELECT TO authenticated USING (kind = 'broker' AND quote_id IS NOT NULL AND public.fn_owns_quote(quote_id));

CREATE POLICY "customers read own messages" ON public.company_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.company_conversations c
            WHERE c.id = company_messages.conversation_id
              AND c.quote_id IS NOT NULL AND public.fn_owns_quote(c.quote_id))
  );

CREATE POLICY "customers send own messages" ON public.company_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_user_id = auth.uid() AND sender_role = 'customer'
    AND EXISTS (SELECT 1 FROM public.company_conversations c
                WHERE c.id = company_messages.conversation_id
                  AND c.quote_id IS NOT NULL AND public.fn_owns_quote(c.quote_id))
  );

-- ============ CUSTOMER ACTIONS ============
CREATE OR REPLACE FUNCTION public.fn_customer_notify(_user_id uuid, _quote_id uuid, _type text, _title text, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.customer_notifications(user_id, quote_id, type, title, body)
  VALUES (_user_id, _quote_id, _type, _title, _body);
END; $$;

CREATE OR REPLACE FUNCTION public.fn_customer_confirm_move(_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Move not found'; END IF;
  IF q.lead_status <> 'price_confirmed' THEN
    RAISE EXCEPTION 'Final price is not ready for confirmation';
  END IF;

  UPDATE public.quotes
     SET lead_status = 'customer_confirmed',
         lead_status_updated_at = now(),
         customer_response_at = now(),
         job_status = 'customer_confirmed'
   WHERE id = _quote_id;

  PERFORM public.log_lead_event(_quote_id, 'customer_confirmed', 'customer', '{}'::jsonb, NULL, q.assigned_company_id);
  PERFORM public.fn_customer_notify(q.user_id, _quote_id, 'move_confirmed', 'Move confirmed',
    'You confirmed your final quote. Your moving company has been notified.');

  IF q.assigned_company_id IS NOT NULL THEN
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (q.assigned_company_id, 'customer_confirmed', 'Customer confirmed the move',
            coalesce(q.quote_number, '') || ' was confirmed by the customer.', _quote_id);
  END IF;

  INSERT INTO public.admin_notifications(type, quote_id, message)
  VALUES ('customer_confirmed', _quote_id, 'Customer confirmed move ' || coalesce(q.quote_number, _quote_id::text));

  RETURN jsonb_build_object('ok', true, 'status', 'customer_confirmed');
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_customer_confirm_move(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_customer_cancel_move(_quote_id uuid, _reason text, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Move not found'; END IF;
  IF q.lead_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This move can no longer be cancelled';
  END IF;

  UPDATE public.quotes
     SET lead_status = 'cancelled',
         lead_status_updated_at = now(),
         job_status = 'cancelled',
         cancellation_reason = _reason,
         cancellation_note = _note,
         cancelled_by = auth.uid(),
         cancelled_at = now(),
         closed_at = now(),
         closed_reason = 'cancelled'
   WHERE id = _quote_id;

  PERFORM public.log_lead_event(_quote_id, 'customer_cancelled', 'customer',
    jsonb_build_object('reason', _reason, 'note', _note), NULL, q.assigned_company_id);

  PERFORM public.fn_customer_notify(q.user_id, _quote_id, 'move_cancelled', 'Move cancelled',
    'Your move was cancelled. Reason: ' || coalesce(_reason, 'not provided'));

  IF q.assigned_company_id IS NOT NULL THEN
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (q.assigned_company_id, 'customer_cancelled', 'Customer cancelled the move',
            coalesce(q.quote_number, '') || ' — ' || coalesce(_reason, 'no reason given'), _quote_id);
  END IF;

  INSERT INTO public.admin_notifications(type, quote_id, message)
  VALUES ('customer_cancelled', _quote_id,
          'Customer cancelled ' || coalesce(q.quote_number, _quote_id::text) || ' — ' || coalesce(_reason, 'no reason'));

  RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_customer_cancel_move(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_customer_start_conversation(_quote_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; conv_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Move not found'; END IF;
  IF q.assigned_company_id IS NULL THEN RAISE EXCEPTION 'No moving company assigned yet'; END IF;

  SELECT id INTO conv_id FROM public.company_conversations
   WHERE quote_id = _quote_id AND company_id = q.assigned_company_id AND kind = 'broker'
   ORDER BY created_at LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.company_conversations(company_id, kind, subject, quote_id, created_by)
    VALUES (q.assigned_company_id, 'broker', 'Move ' || coalesce(q.quote_number, left(_quote_id::text, 8)), _quote_id, auth.uid())
    RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_customer_start_conversation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_customer_submit_review(
  _quote_id uuid, _professionalism smallint, _communication smallint,
  _punctuality smallint, _overall smallint, _title text, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = _quote_id AND user_id = auth.uid();
  IF q.id IS NULL THEN RAISE EXCEPTION 'Move not found'; END IF;
  IF q.lead_status <> 'completed' THEN RAISE EXCEPTION 'You can review a move after it is completed'; END IF;

  INSERT INTO public.customer_reviews(quote_id, user_id, company_id,
    rating_professionalism, rating_communication, rating_punctuality, rating_overall, title, body)
  VALUES (_quote_id, auth.uid(), q.assigned_company_id,
    _professionalism, _communication, _punctuality, _overall, _title, _body)
  ON CONFLICT (quote_id) DO UPDATE SET
    rating_professionalism = excluded.rating_professionalism,
    rating_communication = excluded.rating_communication,
    rating_punctuality = excluded.rating_punctuality,
    rating_overall = excluded.rating_overall,
    title = excluded.title, body = excluded.body, updated_at = now();

  IF q.assigned_company_id IS NOT NULL THEN
    INSERT INTO public.company_notifications(company_id, type, title, body, quote_id)
    VALUES (q.assigned_company_id, 'review_received', 'New customer review',
            'A customer left a review for ' || coalesce(q.quote_number, ''), _quote_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_customer_submit_review(uuid, smallint, smallint, smallint, smallint, text, text) TO authenticated;
