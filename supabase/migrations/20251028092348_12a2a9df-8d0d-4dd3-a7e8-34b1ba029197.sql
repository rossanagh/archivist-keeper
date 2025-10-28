-- Drop and recreate the log_audit_event function to ignore lock-only updates
DROP FUNCTION IF EXISTS public.log_audit_event() CASCADE;

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_old_record jsonb;
  v_new_record jsonb;
BEGIN
  -- For UPDATE operations on inventare table, check if only locked_by/locked_at changed
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'inventare' THEN
    -- Create copies of OLD and NEW without locked_by and locked_at fields
    v_old_record := to_jsonb(OLD) - 'locked_by' - 'locked_at';
    v_new_record := to_jsonb(NEW) - 'locked_by' - 'locked_at';
    
    -- If the records are identical after removing lock fields, don't log
    IF v_old_record = v_new_record THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Get username from profiles
  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO public.audit_logs (user_id, username, action, table_name, record_id, details)
  VALUES (
    auth.uid(),
    COALESCE(v_username, 'unknown'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate triggers on all tables
CREATE TRIGGER fonduri_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.fonduri
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER compartimente_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.compartimente
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER inventare_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventare
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER dosare_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.dosare
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();