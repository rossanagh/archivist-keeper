-- Modify termen_pastrare column to accept both numbers and 'permanent'
ALTER TABLE public.inventare 
  ALTER COLUMN termen_pastrare TYPE text;

-- Update existing numeric values to keep them as text
-- (no data conversion needed, PostgreSQL handles this automatically)