-- ==========================================================
-- ADMITTO SUPABASE MIGRATION: 007_supabase_auth_integration.sql
-- Links Supabase Auth (auth.users) to the ADMITTO profiles table
-- so that signing up through Supabase Auth automatically creates
-- an ADMITTO profile with role = 'ADMIN'.
-- ==========================================================

-- 1. Add auth_id column to profiles to link Supabase Auth users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Add password_hash column for backward compat (may already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Index for fast lookup by auth_id
CREATE INDEX IF NOT EXISTS profiles_auth_id_idx ON profiles(auth_id);

-- 4. Auto-create profile when a new Supabase Auth user is created
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'ADMIN'
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_id = EXCLUDED.auth_id
    WHERE profiles.auth_id IS NULL;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- 5. Basic RLS policies (enable RLS if not already done)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_id);

-- Allow service role to do everything (server-side operations)
DROP POLICY IF EXISTS "profiles_service_role_all" ON profiles;
CREATE POLICY "profiles_service_role_all"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "profiles_authenticated_select" ON profiles;
CREATE POLICY "profiles_authenticated_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

-- 6. Update existing profiles to use their email for lookup
-- (Admins who registered via the old system won't have auth_id until they sign up via Supabase Auth)
-- This is intentional — old accounts will get linked on first Supabase Auth signup.
