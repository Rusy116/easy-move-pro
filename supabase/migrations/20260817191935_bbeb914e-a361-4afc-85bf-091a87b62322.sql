DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.sig);
  END LOOP;

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