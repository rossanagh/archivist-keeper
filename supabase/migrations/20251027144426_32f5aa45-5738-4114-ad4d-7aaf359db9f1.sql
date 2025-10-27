-- Create audit logs table for tracking all admin actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text NOT NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries on recent logs
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
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
$$;

-- Add triggers for all tables
CREATE TRIGGER audit_fonduri
AFTER INSERT OR UPDATE OR DELETE ON public.fonduri
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_compartimente
AFTER INSERT OR UPDATE OR DELETE ON public.compartimente
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_inventare
AFTER INSERT OR UPDATE OR DELETE ON public.inventare
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_dosare
AFTER INSERT OR UPDATE OR DELETE ON public.dosare
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();