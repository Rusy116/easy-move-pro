CREATE OR REPLACE FUNCTION public.fn_customer_name(_q public.quotes)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(TRIM(COALESCE(
    _q.details->>'fullName',
    _q.details->>'full_name',
    _q.details->>'name',
    TRIM(COALESCE(_q.details->>'firstName','') || ' ' || COALESCE(_q.details->>'lastName','')),
    ''
  )), '')
$$;

UPDATE public.customers c
   SET full_name = COALESCE(public.fn_customer_name(q), c.full_name), updated_at = now()
  FROM public.quotes q
 WHERE q.id = c.quote_id
   AND (c.full_name IS NULL OR c.full_name = c.email)
   AND public.fn_customer_name(q) IS NOT NULL;