-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create fonduri (archive funds) table
CREATE TABLE public.fonduri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nume TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fonduri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fonduri"
  ON public.fonduri FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert fonduri"
  ON public.fonduri FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fonduri"
  ON public.fonduri FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fonduri"
  ON public.fonduri FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create compartimente (departments) table
CREATE TABLE public.compartimente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nume TEXT NOT NULL,
  fond_id UUID REFERENCES public.fonduri(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.compartimente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view compartimente"
  ON public.compartimente FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert compartimente"
  ON public.compartimente FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update compartimente"
  ON public.compartimente FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete compartimente"
  ON public.compartimente FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create inventare (inventories) table with locking mechanism
CREATE TABLE public.inventare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  an INTEGER NOT NULL,
  numar_dosare INTEGER NOT NULL DEFAULT 0,
  termen_pastrare INTEGER NOT NULL,
  compartiment_id UUID REFERENCES public.compartimente(id) ON DELETE CASCADE NOT NULL,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.inventare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view inventare"
  ON public.inventare FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert inventare"
  ON public.inventare FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inventare"
  ON public.inventare FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inventare"
  ON public.inventare FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create dosare (files) table
CREATE TABLE public.dosare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nr_crt INTEGER NOT NULL,
  indicativ_nomenclator TEXT NOT NULL,
  continut TEXT NOT NULL,
  date_extreme TEXT NOT NULL,
  numar_file INTEGER NOT NULL,
  observatii TEXT,
  nr_cutie INTEGER,
  inventar_id UUID REFERENCES public.inventare(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(inventar_id, nr_crt)
);

ALTER TABLE public.dosare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dosare"
  ON public.dosare FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert dosare"
  ON public.dosare FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dosare"
  ON public.dosare FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dosare"
  ON public.dosare FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to automatically update numar_dosare in inventare
CREATE OR REPLACE FUNCTION public.update_inventar_dosare_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventare
    SET numar_dosare = numar_dosare + 1
    WHERE id = NEW.inventar_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.inventare
    SET numar_dosare = numar_dosare - 1
    WHERE id = OLD.inventar_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to update dosare count
CREATE TRIGGER update_dosare_count
AFTER INSERT OR DELETE ON public.dosare
FOR EACH ROW
EXECUTE FUNCTION public.update_inventar_dosare_count();