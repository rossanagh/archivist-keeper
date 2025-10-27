-- Fix PUBLIC_DATA_EXPOSURE: Require authentication for all SELECT policies
-- Drop existing public access policies
DROP POLICY IF EXISTS "Anyone can view fonduri" ON fonduri;
DROP POLICY IF EXISTS "Anyone can view compartimente" ON compartimente;
DROP POLICY IF EXISTS "Anyone can view inventare" ON inventare;
DROP POLICY IF EXISTS "Anyone can view dosare" ON dosare;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

-- Create authenticated-only SELECT policies
CREATE POLICY "Authenticated users can view fonduri" ON fonduri
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view compartimente" ON compartimente
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view inventare" ON inventare
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view dosare" ON dosare
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix MISSING_RLS: Add INSERT policy for audit_logs
CREATE POLICY "Users can insert their own audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Prevent updates to audit logs (immutability)
CREATE POLICY "Audit logs are immutable" ON audit_logs
  FOR UPDATE
  USING (false);

-- Fix OPEN_ENDPOINTS: Only admins can insert new roles
CREATE POLICY "Only admins can create roles" ON user_roles
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));