
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.is_broker()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'broker'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'broker'::app_role);
$$;

-- Primary role for post-login routing. Precedence: admin > broker > mover > customer.
CREATE OR REPLACE FUNCTION public.fn_my_primary_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT r::text FROM (
       SELECT role AS r,
              CASE role
                WHEN 'admin'::app_role THEN 1
                WHEN 'broker'::app_role THEN 2
                WHEN 'mover'::app_role THEN 3
                ELSE 4 END AS ord
       FROM public.user_roles WHERE user_id = auth.uid()
     ) x ORDER BY ord LIMIT 1),
    'customer');
$$;

CREATE OR REPLACE FUNCTION public.fn_my_account_status()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status FROM public.profiles WHERE id = auth.uid()), 'active');
$$;

REVOKE ALL ON FUNCTION public.is_broker() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_my_primary_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_my_account_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_broker() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_my_primary_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_my_account_status() TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff());
