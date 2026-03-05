-- Migration: Publication tables
-- Covers: publication, publication_author, publication_collaborator,
--         publication_subxeuron, publication_tag, FTS trigger, RLS

-- ────────────────────────────────────────────────────────────────
-- 1. publication
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publication (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text        NOT NULL,
  slug               text        NOT NULL,
  description        text,
  abstract           text,
  creator_id         uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  body               jsonb,
  publication_type   text        NOT NULL DEFAULT 'preprint'
                                 CHECK (publication_type IN (
                                   'journal_article',
                                   'preprint',
                                   'conference_paper',
                                   'book_chapter',
                                   'thesis',
                                   'whitepaper',
                                   'technical_report',
                                   'other'
                                 )),
  status             text        NOT NULL DEFAULT 'published'
                                 CHECK (status IN ('draft', 'published', 'archived')),
  published_year     smallint,
  doi                text,
  source_url         text,
  pdf_url            text,
  image_url          text,
  image_alt          text,
  is_reported        boolean     NOT NULL DEFAULT false,
  is_deleted         boolean     NOT NULL DEFAULT false,
  search_vector      tsvector,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz          DEFAULT now(),
  CONSTRAINT publication_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS publication_slug_idx          ON public.publication (slug);
CREATE INDEX IF NOT EXISTS publication_creator_id_idx    ON public.publication (creator_id);
CREATE INDEX IF NOT EXISTS publication_created_at_idx    ON public.publication (created_at DESC);
CREATE INDEX IF NOT EXISTS publication_type_idx          ON public.publication (publication_type);
CREATE INDEX IF NOT EXISTS publication_search_vector_idx ON public.publication USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS publication_is_deleted_idx    ON public.publication (is_deleted) WHERE is_deleted = false;

-- ────────────────────────────────────────────────────────────────
-- 2. publication_author
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publication_author (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES public."user"(id) ON DELETE SET NULL,
  author_name      text        NOT NULL,
  affiliation      text,
  author_order     smallint    NOT NULL DEFAULT 1,
  is_corresponding boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pub_author_order_positive CHECK (author_order > 0)
);

CREATE INDEX IF NOT EXISTS pub_author_publication_id_idx ON public.publication_author (publication_id);
CREATE INDEX IF NOT EXISTS pub_author_user_id_idx        ON public.publication_author (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS pub_author_order_unique
  ON public.publication_author (publication_id, author_order);

-- ────────────────────────────────────────────────────────────────
-- 3. publication_collaborator
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publication_collaborator (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  invited_by       uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  role             text        NOT NULL DEFAULT 'co-author'
                               CHECK (role IN ('co-author', 'reviewer', 'editor', 'contributor')),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at       timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz          DEFAULT now(),
  CONSTRAINT pub_collab_unique UNIQUE (publication_id, user_id)
);

CREATE INDEX IF NOT EXISTS pub_collab_publication_id_idx ON public.publication_collaborator (publication_id);
CREATE INDEX IF NOT EXISTS pub_collab_user_id_idx        ON public.publication_collaborator (user_id);
CREATE INDEX IF NOT EXISTS pub_collab_status_idx         ON public.publication_collaborator (status);

-- ────────────────────────────────────────────────────────────────
-- 4. publication_subxeuron (cross-link junction)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publication_subxeuron (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  subxeuron_id     uuid        NOT NULL REFERENCES public.subxeuron(id) ON DELETE CASCADE,
  linked_by        uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pub_subx_unique UNIQUE (publication_id, subxeuron_id)
);

CREATE INDEX IF NOT EXISTS pub_subx_publication_id_idx ON public.publication_subxeuron (publication_id);
CREATE INDEX IF NOT EXISTS pub_subx_subxeuron_id_idx   ON public.publication_subxeuron (subxeuron_id);

-- ────────────────────────────────────────────────────────────────
-- 5. publication_tag
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publication_tag (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid  NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  tag              text  NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pub_tag_publication_id_idx ON public.publication_tag (publication_id);
CREATE INDEX IF NOT EXISTS pub_tag_tag_idx            ON public.publication_tag (tag);

-- ────────────────────────────────────────────────────────────────
-- 6. Full-text search trigger
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION publication_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publication_search_vector_update
  BEFORE INSERT OR UPDATE OF title, abstract, description ON public.publication
  FOR EACH ROW EXECUTE FUNCTION publication_search_vector_trigger();

-- ────────────────────────────────────────────────────────────────
-- 7. Row Level Security
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.publication              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_author       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_collaborator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_subxeuron    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_tag          ENABLE ROW LEVEL SECURITY;

-- publication: anyone reads non-deleted; insert/update/delete = creator
CREATE POLICY "pub_select_visible"
  ON public.publication FOR SELECT
  USING (is_deleted = false OR creator_id = auth.uid());

CREATE POLICY "pub_insert_own"
  ON public.publication FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "pub_update_own"
  ON public.publication FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "pub_delete_own"
  ON public.publication FOR DELETE
  USING (auth.uid() = creator_id);

-- publication_author: anyone reads; creator manages
CREATE POLICY "pub_author_select_all"
  ON public.publication_author FOR SELECT USING (true);

CREATE POLICY "pub_author_insert"
  ON public.publication_author FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publication p
      WHERE p.id = publication_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "pub_author_delete"
  ON public.publication_author FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.publication p
      WHERE p.id = publication_id AND p.creator_id = auth.uid()
    )
  );

-- publication_collaborator: creator manages invites; invited user updates own status
CREATE POLICY "pub_collab_select"
  ON public.publication_collaborator FOR SELECT USING (true);

CREATE POLICY "pub_collab_insert"
  ON public.publication_collaborator FOR INSERT
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "pub_collab_update_status"
  ON public.publication_collaborator FOR UPDATE
  USING (user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "pub_collab_delete"
  ON public.publication_collaborator FOR DELETE
  USING (invited_by = auth.uid());

-- publication_subxeuron cross-link: anyone reads; linked_by = auth.uid()
CREATE POLICY "pub_subx_select"
  ON public.publication_subxeuron FOR SELECT USING (true);

CREATE POLICY "pub_subx_insert"
  ON public.publication_subxeuron FOR INSERT
  WITH CHECK (linked_by = auth.uid());

CREATE POLICY "pub_subx_delete"
  ON public.publication_subxeuron FOR DELETE
  USING (linked_by = auth.uid());

-- publication_tag: anyone reads; creator inserts
CREATE POLICY "pub_tag_select_all"
  ON public.publication_tag FOR SELECT USING (true);

CREATE POLICY "pub_tag_insert"
  ON public.publication_tag FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.publication p
      WHERE p.id = publication_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "pub_tag_delete"
  ON public.publication_tag FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.publication p
      WHERE p.id = publication_id AND p.creator_id = auth.uid()
    )
  );
