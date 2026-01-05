-- Fix handle_new_user() to NOT automatically assign admin role to all new users
-- This is a critical security fix - only profiles should be created, not admin roles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert profile, do NOT assign admin role automatically
  -- Admin roles should only be assigned by existing admins via create-admin edge function
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  
  -- DO NOT automatically assign admin role - this was a security vulnerability
  -- New users must be granted admin access explicitly by existing admins
  
  RETURN NEW;
END;
$$;