-- Drop existing SELECT policy on fonduri
DROP POLICY IF EXISTS "Authenticated users can view fonduri" ON public.fonduri;

-- Create new SELECT policy that checks full_access or user_fond_access
CREATE POLICY "Users can view allowed fonduri"
ON public.fonduri
FOR SELECT
USING (
  -- Full access admins can see all fonduri
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.full_access = true
  )
  OR
  -- Limited access admins can only see fonduri they have access to
  EXISTS (
    SELECT 1 FROM public.user_fond_access
    WHERE user_fond_access.user_id = auth.uid() AND user_fond_access.fond_id = fonduri.id
  )
);