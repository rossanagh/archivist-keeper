-- Add unique constraint on dosare for upsert functionality
ALTER TABLE public.dosare 
ADD CONSTRAINT dosare_inventar_nr_crt_unique UNIQUE (inventar_id, nr_crt);