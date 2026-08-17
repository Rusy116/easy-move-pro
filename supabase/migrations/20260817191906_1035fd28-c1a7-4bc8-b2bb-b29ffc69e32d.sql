-- 1. Fixed search_path on the two remaining functions
ALTER FUNCTION public.default_visibility_mask() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- 2. Staff over-reach: brokers must not read every profile / every role row
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- 3. Reviews: no anonymous read of raw rows (user_id / quote_id enumeration)
DROP POLICY IF EXISTS "reviews public read" ON public.customer_reviews;
CREATE POLICY "reviews own or staff read"
  ON public.customer_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());
REVOKE SELECT ON public.customer_reviews FROM anon;

-- 4. Lock every public function away from anonymous callers, then grant back
--    only what the unauthenticated quote portal and quote submission need.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
  END LOOP;
END $$;

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'default_visibility_mask',
        'generate_quote_number',
        'fn_portal_quote',
        'fn_quote_ticket',
        'fn_portal_current_estimate',
        'fn_portal_respond_estimate',
        'fn_estimate_mark_viewed',
        'accept_quote',
        'fn_customer_respond_final_quote'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn.sig);
  END LOOP;
END $$;