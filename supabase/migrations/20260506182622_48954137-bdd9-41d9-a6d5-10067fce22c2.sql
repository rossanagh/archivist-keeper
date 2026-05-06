
-- Security definer function to check full_access without recursion
CREATE OR REPLACE FUNCTION public.is_full_access_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND full_access = true
  )
$$;

-- Drop and recreate recursive policies on profiles
DROP POLICY IF EXISTS "Full access admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Full access admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Full access admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_full_access_admin(auth.uid()));

CREATE POLICY "Full access admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_full_access_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Fix recursive policies on user_fond_access and fonduri
DROP POLICY IF EXISTS "Full access admins can view all user_fond_access" ON public.user_fond_access;
DROP POLICY IF EXISTS "Full access admins can insert user_fond_access" ON public.user_fond_access;
DROP POLICY IF EXISTS "Full access admins can delete user_fond_access" ON public.user_fond_access;

CREATE POLICY "Full access admins can view all user_fond_access"
ON public.user_fond_access FOR SELECT
USING (public.is_full_access_admin(auth.uid()));

CREATE POLICY "Full access admins can insert user_fond_access"
ON public.user_fond_access FOR INSERT
WITH CHECK (public.is_full_access_admin(auth.uid()));

CREATE POLICY "Full access admins can delete user_fond_access"
ON public.user_fond_access FOR DELETE
USING (public.is_full_access_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view allowed fonduri" ON public.fonduri;
CREATE POLICY "Users can view allowed fonduri"
ON public.fonduri FOR SELECT
USING (
  public.is_full_access_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_fond_access
    WHERE user_fond_access.user_id = auth.uid()
      AND user_fond_access.fond_id = fonduri.id
  )
);

-- Allow admins to view audit_logs via has_role OR full_access
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_full_access_admin(auth.uid()));
