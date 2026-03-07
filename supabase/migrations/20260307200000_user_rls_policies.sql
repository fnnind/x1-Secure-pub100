-- RLS policies for public.user
-- RLS is already enabled (rowsecurity = true).
-- Without these policies, authenticated users cannot insert or update their own profile,
-- causing getUser() in lib/supabase/user.ts to fail silently on first login.

-- Anyone can read public profiles or their own profile
CREATE POLICY "user_select"
  ON public."user"
  FOR SELECT
  USING (is_profile_public = true OR id = auth.uid());

-- Authenticated users can insert their own profile row (used by getUser() on first login)
CREATE POLICY "user_insert"
  ON public."user"
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Authenticated users can update their own profile row
CREATE POLICY "user_update"
  ON public."user"
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
