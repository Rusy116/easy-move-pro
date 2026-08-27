CREATE OR REPLACE FUNCTION public.fn_set_factory_tick_secret(_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _value IS NULL OR length(_value) < 32 THEN
    RAISE EXCEPTION 'invalid secret';
  END IF;

  SELECT id INTO _id FROM vault.secrets WHERE name = 'FACTORY_TICK_SECRET';

  IF _id IS NULL THEN
    PERFORM vault.create_secret(_value, 'FACTORY_TICK_SECRET', 'Shared secret for AI factory tick endpoints');
    RETURN 'created';
  ELSE
    PERFORM vault.update_secret(_id, _value, 'FACTORY_TICK_SECRET', 'Shared secret for AI factory tick endpoints');
    RETURN 'updated';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_factory_tick_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_factory_tick_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_factory_tick_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'FACTORY_TICK_SECRET' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_factory_tick_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_factory_tick_secret() TO service_role;