-- Add full_access column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_access boolean NOT NULL DEFAULT false;

-- Update ghitaoarga to have full_access
UPDATE public.profiles 
SET full_access = true 
WHERE username = 'ghitaoarga';