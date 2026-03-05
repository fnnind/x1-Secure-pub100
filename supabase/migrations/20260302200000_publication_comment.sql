-- publication_comment + publication_comment_vote
-- Direct publication-scoped comment thread (no pinned-post indirection).
-- Date: 2026-03-02

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE public.publication_comment (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL REFERENCES public."user"(id)      ON DELETE CASCADE,
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  parent_id       uuid        REFERENCES public.publication_comment(id)  ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

CREATE INDEX publication_comment_pub_created_idx
  ON public.publication_comment (publication_id, created_at DESC);

CREATE INDEX publication_comment_parent_idx
  ON public.publication_comment (parent_id);

CREATE TABLE public.publication_comment_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid  NOT NULL REFERENCES public.publication_comment(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id)               ON DELETE CASCADE,
  vote_type   text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  UNIQUE (comment_id, user_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.publication_comment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_comment_vote ENABLE ROW LEVEL SECURITY;

-- publication_comment
CREATE POLICY "Public read non-deleted publication comments"
  ON public.publication_comment FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Authenticated users can post publication comments"
  ON public.publication_comment FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can soft-delete own publication comments"
  ON public.publication_comment FOR UPDATE
  USING  (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- publication_comment_vote
CREATE POLICY "Public read publication comment votes"
  ON public.publication_comment_vote FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote on publication comments"
  ON public.publication_comment_vote FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own publication comment votes"
  ON public.publication_comment_vote FOR DELETE
  USING (auth.uid() = user_id);
