CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.assign_quote_identifiers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := public.generate_quote_number();
  END IF;
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(extensions.gen_random_bytes(18), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;