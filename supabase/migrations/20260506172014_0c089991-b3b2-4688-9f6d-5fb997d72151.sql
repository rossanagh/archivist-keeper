-- Broaden log_user_action to accept any action string, but force user_id/username server-side
CREATE OR REPLACE FUNCTION public.log_user_action(
  _action text,
  _table_name text DEFAULT NULL,
  _record_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 64 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_logs (user_id, username, action, table_name, record_id, details)
  VALUES (auth.uid(), COALESCE(v_username, 'unknown'), _action, _table_name, _record_id, COALESCE(_details, '{}'::jsonb));
END;
$$;
