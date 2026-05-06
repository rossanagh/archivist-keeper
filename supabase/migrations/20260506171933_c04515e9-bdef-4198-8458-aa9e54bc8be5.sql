-- 1. PRIVILEGE ESCALATION: prevent users from modifying their own full_access flag
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND full_access = (SELECT full_access FROM public.profiles WHERE id = auth.uid())
);

-- Allow full_access admins to update any profile (including full_access flag)
CREATE POLICY "Full access admins can update any profile"
ON public.profiles FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.full_access = true));

-- 2. PROFILES read restriction: only self or full_access admin
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Full access admins can view all profiles"
ON public.profiles FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.full_access = true));

-- 3. AUDIT LOGS: restrict reads to admins, remove client INSERT, provide SECURITY DEFINER function
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_user_action(
  _action text,
  _table_name text DEFAULT NULL,
  _record_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Whitelist allowed client-side actions to prevent spoofing
  IF _action NOT IN ('LOGIN', 'LOGOUT') THEN
    RAISE EXCEPTION 'Action not allowed from client';
  END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs (user_id, username, action, table_name, record_id, details)
  VALUES (auth.uid(), COALESCE(v_username, 'unknown'), _action, _table_name, _record_id, _details);
END;
$$;

-- 4. Sanitize sensitive fields in log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
  v_old_record jsonb;
  v_new_record jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'inventare' THEN
    v_old_record := to_jsonb(OLD) - 'locked_by' - 'locked_at';
    v_new_record := to_jsonb(NEW) - 'locked_by' - 'locked_at';
    IF v_old_record = v_new_record THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = auth.uid();

  -- Strip potentially sensitive fields from snapshots
  INSERT INTO public.audit_logs (user_id, username, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    COALESCE(v_username, 'unknown'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', CASE WHEN OLD IS NULL THEN NULL ELSE to_jsonb(OLD) - 'full_access' - 'password' END,
      'new', CASE WHEN NEW IS NULL THEN NULL ELSE to_jsonb(NEW) - 'full_access' - 'password' END
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Restrict SELECT on compartimente / inventare / dosare to user's accessible fonds
CREATE OR REPLACE FUNCTION public.user_can_access_fond(_user_id uuid, _fond_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND full_access = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_fond_access WHERE user_id = _user_id AND fond_id = _fond_id
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can view compartimente" ON public.compartimente;
CREATE POLICY "Users can view compartimente of accessible fonduri"
ON public.compartimente FOR SELECT
USING (public.user_can_access_fond(auth.uid(), fond_id));

DROP POLICY IF EXISTS "Authenticated users can view inventare" ON public.inventare;
CREATE POLICY "Users can view inventare of accessible fonduri"
ON public.inventare FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.compartimente c
  WHERE c.id = inventare.compartiment_id
    AND public.user_can_access_fond(auth.uid(), c.fond_id)
));

DROP POLICY IF EXISTS "Authenticated users can view dosare" ON public.dosare;
CREATE POLICY "Users can view dosare of accessible fonduri"
ON public.dosare FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM public.inventare i
  JOIN public.compartimente c ON c.id = i.compartiment_id
  WHERE i.id = dosare.inventar_id
    AND public.user_can_access_fond(auth.uid(), c.fond_id)
));
