-- Step 1: Base schema (user, subxeuron, post, comment, vote)
-- The database already exists with your Supabase project; this creates the tables.
-- Run with: supabase db push  or  supabase migration up

-- 1) public.user – app profile; id matches auth.users.id
CREATE TABLE IF NOT EXISTS public."user" (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text NOT NULL,
  image_url text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_reported boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) subxeuron
CREATE TABLE IF NOT EXISTS public.subxeuron (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  moderator_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  parent_subxeuron_id uuid REFERENCES public.subxeuron(id) ON DELETE SET NULL,
  body jsonb,
  pdf_url text,
  source_url text NOT NULL,
  image_url text,
  image_alt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subxeuron_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS subxeuron_slug_idx ON public.subxeuron (slug);
CREATE INDEX IF NOT EXISTS subxeuron_moderator_id_idx ON public.subxeuron (moderator_id);
CREATE INDEX IF NOT EXISTS subxeuron_created_at_idx ON public.subxeuron (created_at DESC);

-- 3) post
CREATE TABLE IF NOT EXISTS public.post (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  original_title text,
  author_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  subxeuron_id uuid NOT NULL REFERENCES public.subxeuron(id) ON DELETE RESTRICT,
  body jsonb,
  original_body jsonb,
  image_url text,
  image_alt text,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_reported boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_subxeuron_id_idx ON public.post (subxeuron_id);
CREATE INDEX IF NOT EXISTS post_published_at_idx ON public.post (published_at DESC);
CREATE INDEX IF NOT EXISTS post_author_id_idx ON public.post (author_id);
CREATE INDEX IF NOT EXISTS post_is_deleted_idx ON public.post (is_deleted) WHERE is_deleted = false;

-- 4) comment
CREATE TABLE IF NOT EXISTS public.comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  post_id uuid NOT NULL REFERENCES public.post(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.comment(id) ON DELETE CASCADE,
  is_reported boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_post_id_idx ON public.comment (post_id);
CREATE INDEX IF NOT EXISTS comment_parent_comment_id_idx ON public.comment (parent_comment_id);
CREATE INDEX IF NOT EXISTS comment_author_id_idx ON public.comment (author_id);

-- 5) vote – exactly one of post_id or comment_id
CREATE TABLE IF NOT EXISTS public.vote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  post_id uuid REFERENCES public.post(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comment(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS vote_user_post_unique ON public.vote (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vote_user_comment_unique ON public.vote (user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vote_post_id_idx ON public.vote (post_id);
CREATE INDEX IF NOT EXISTS vote_comment_id_idx ON public.vote (comment_id);

-- 6) RLS
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subxeuron ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote ENABLE ROW LEVEL SECURITY;

-- user: read all; update own row only
CREATE POLICY "user_select_all" ON public."user" FOR SELECT USING (true);
CREATE POLICY "user_update_own" ON public."user" FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_insert_own" ON public."user" FOR INSERT WITH CHECK (auth.uid() = id);

-- subxeuron: read all; insert/update/delete only as moderator
CREATE POLICY "subxeuron_select_all" ON public.subxeuron FOR SELECT USING (true);
CREATE POLICY "subxeuron_insert_moderator" ON public.subxeuron FOR INSERT WITH CHECK (auth.uid() = moderator_id);
CREATE POLICY "subxeuron_update_moderator" ON public.subxeuron FOR UPDATE USING (auth.uid() = moderator_id);
CREATE POLICY "subxeuron_delete_moderator" ON public.subxeuron FOR DELETE USING (auth.uid() = moderator_id);

-- post: read non-deleted or own; insert/update/delete own
CREATE POLICY "post_select_visible" ON public.post FOR SELECT USING (is_deleted = false OR author_id = auth.uid());
CREATE POLICY "post_insert_own" ON public.post FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "post_update_own" ON public.post FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "post_delete_own" ON public.post FOR DELETE USING (auth.uid() = author_id);

-- comment: read all; insert/update/delete own
CREATE POLICY "comment_select_all" ON public.comment FOR SELECT USING (true);
CREATE POLICY "comment_insert_own" ON public.comment FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comment_update_own" ON public.comment FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comment_delete_own" ON public.comment FOR DELETE USING (auth.uid() = author_id);

-- vote: read all; insert/update/delete own
CREATE POLICY "vote_select_all" ON public.vote FOR SELECT USING (true);
CREATE POLICY "vote_insert_own" ON public.vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vote_update_own" ON public.vote FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vote_delete_own" ON public.vote FOR DELETE USING (auth.uid() = user_id);
