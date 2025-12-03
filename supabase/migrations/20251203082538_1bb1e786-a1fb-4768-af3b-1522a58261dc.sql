-- Create table for user-fund access permissions
CREATE TABLE public.user_fond_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fond_id UUID NOT NULL REFERENCES public.fonduri(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, fond_id)
);

-- Enable RLS
ALTER TABLE public.user_fond_access ENABLE ROW LEVEL SECURITY;

-- Only full_access admins can view all access records
CREATE POLICY "Full access admins can view all user_fond_access"
ON public.user_fond_access
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND full_access = true
  )
);

-- Only full_access admins can insert access records
CREATE POLICY "Full access admins can insert user_fond_access"
ON public.user_fond_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND full_access = true
  )
);

-- Only full_access admins can delete access records
CREATE POLICY "Full access admins can delete user_fond_access"
ON public.user_fond_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND full_access = true
  )
);

-- Users can view their own access records
CREATE POLICY "Users can view own fund access"
ON public.user_fond_access
FOR SELECT
USING (auth.uid() = user_id);