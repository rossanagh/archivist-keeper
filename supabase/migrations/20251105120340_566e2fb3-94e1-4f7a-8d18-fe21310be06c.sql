-- Make numar_file nullable in dosare table
ALTER TABLE public.dosare 
ALTER COLUMN numar_file DROP NOT NULL;