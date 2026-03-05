-- Migration: Event tables
-- Covers: event, event_url, event_question, event_question_vote,
--         event_answer, event_answer_vote, event_poll, event_poll_option,
--         event_poll_vote, mention, FTS trigger, RLS
-- Note: publication_id is nullable to allow standalone events linked via URL

-- ────────────────────────────────────────────────────────────────
-- 1. event
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id      uuid        REFERENCES public.publication(id) ON DELETE CASCADE,
  creator_id          uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,

  -- Identity
  title               text        NOT NULL,
  slug                text        NOT NULL,
  description         text,

  -- Event type
  event_type          text        NOT NULL DEFAULT 'conference'
                                  CHECK (event_type IN (
                                    'conference',
                                    'meetup',
                                    'presentation',
                                    'zoom',
                                    'webinar',
                                    'workshop',
                                    'symposium',
                                    'seminar',
                                    'poster_session',
                                    'panel',
                                    'other'
                                  )),
  event_type_custom   text,

  -- Location
  venue               text,
  city                text,
  region              text,
  country             text,
  is_virtual          boolean     NOT NULL DEFAULT false,

  -- Dates & time
  event_date          date        NOT NULL,
  start_date          date,
  end_date            date,
  event_time          time,
  timezone            text        NOT NULL DEFAULT 'UTC',

  -- Primary URLs
  conference_url      text,
  recorded_video_url  text,

  -- External link target (for standalone events, can link to a subxeuron URL or publication URL)
  linked_url          text,

  -- Moderation
  is_qa_locked        boolean     NOT NULL DEFAULT false,
  is_poll_locked      boolean     NOT NULL DEFAULT false,
  is_deleted          boolean     NOT NULL DEFAULT false,

  search_vector       tsvector,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz          DEFAULT now(),

  -- slug is scoped to publication when present; globally unique when standalone
  CONSTRAINT event_slug_pub_unique UNIQUE NULLS NOT DISTINCT (publication_id, slug)
);

CREATE INDEX IF NOT EXISTS event_publication_id_idx   ON public.event (publication_id);
CREATE INDEX IF NOT EXISTS event_creator_id_idx       ON public.event (creator_id);
CREATE INDEX IF NOT EXISTS event_event_date_idx       ON public.event (event_date DESC);
CREATE INDEX IF NOT EXISTS event_type_idx             ON public.event (event_type);
CREATE INDEX IF NOT EXISTS event_search_vector_idx    ON public.event USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS event_is_deleted_idx       ON public.event (is_deleted) WHERE is_deleted = false;

-- ────────────────────────────────────────────────────────────────
-- 2. event_url
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_url (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  url_type    text  NOT NULL DEFAULT 'other'
                    CHECK (url_type IN (
                      'conference',
                      'recorded_video',
                      'registration',
                      'livestream',
                      'slides',
                      'paper_pdf',
                      'proceedings',
                      'other'
                    )),
  url         text  NOT NULL,
  label       text,
  added_by    uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_url_event_id_idx ON public.event_url (event_id);

-- ────────────────────────────────────────────────────────────────
-- 3. event_question (Q&A)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_question (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  author_id   uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  content     text  NOT NULL,
  is_pinned   boolean NOT NULL DEFAULT false,
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_question_event_id_idx   ON public.event_question (event_id);
CREATE INDEX IF NOT EXISTS event_question_author_id_idx  ON public.event_question (author_id);
CREATE INDEX IF NOT EXISTS event_question_created_at_idx ON public.event_question (created_at DESC);
CREATE INDEX IF NOT EXISTS event_question_is_deleted_idx ON public.event_question (is_deleted) WHERE is_deleted = false;

-- ────────────────────────────────────────────────────────────────
-- 4. event_question_vote
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_question_vote (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid  NOT NULL REFERENCES public.event_question(id) ON DELETE CASCADE,
  user_id      uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type    text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz          DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_qvote_unique       ON public.event_question_vote (question_id, user_id);
CREATE INDEX        IF NOT EXISTS event_qvote_question_idx ON public.event_question_vote (question_id);

-- ────────────────────────────────────────────────────────────────
-- 5. event_answer
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_answer (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid  NOT NULL REFERENCES public.event_question(id) ON DELETE CASCADE,
  author_id    uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  content      text  NOT NULL,
  is_accepted  boolean NOT NULL DEFAULT false,
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_answer_question_id_idx ON public.event_answer (question_id);
CREATE INDEX IF NOT EXISTS event_answer_author_id_idx   ON public.event_answer (author_id);
CREATE INDEX IF NOT EXISTS event_answer_created_at_idx  ON public.event_answer (created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 6. event_answer_vote
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_answer_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id   uuid  NOT NULL REFERENCES public.event_answer(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type   text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_avote_unique      ON public.event_answer_vote (answer_id, user_id);
CREATE INDEX        IF NOT EXISTS event_avote_answer_idx  ON public.event_answer_vote (answer_id);

-- ────────────────────────────────────────────────────────────────
-- 7. event_poll
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_poll (
  id                       uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  creator_id               uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  question                 text  NOT NULL,
  description              text,
  allow_multiple_choice    boolean NOT NULL DEFAULT false,
  closes_at                timestamptz NOT NULL,
  is_locked                boolean NOT NULL DEFAULT false,
  show_results_before_close boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_poll_event_id_idx   ON public.event_poll (event_id);
CREATE INDEX IF NOT EXISTS event_poll_creator_id_idx ON public.event_poll (creator_id);
CREATE INDEX IF NOT EXISTS event_poll_closes_at_idx  ON public.event_poll (closes_at);

-- ────────────────────────────────────────────────────────────────
-- 8. event_poll_option
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_poll_option (
  id            uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       uuid     NOT NULL REFERENCES public.event_poll(id) ON DELETE CASCADE,
  option_text   text     NOT NULL,
  option_order  smallint NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_poll_option_poll_id_idx ON public.event_poll_option (poll_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_poll_option_order_unique
  ON public.event_poll_option (poll_id, option_order);

-- ────────────────────────────────────────────────────────────────
-- 9. event_poll_vote
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_poll_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid  NOT NULL REFERENCES public.event_poll(id) ON DELETE CASCADE,
  option_id   uuid  NOT NULL REFERENCES public.event_poll_option(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Per-option-per-user uniqueness (covers both single and multi-choice)
CREATE UNIQUE INDEX IF NOT EXISTS event_pvote_option_user_unique
  ON public.event_poll_vote (poll_id, option_id, user_id);

CREATE INDEX IF NOT EXISTS event_pvote_poll_id_idx   ON public.event_poll_vote (poll_id);
CREATE INDEX IF NOT EXISTS event_pvote_option_id_idx ON public.event_poll_vote (option_id);

-- ────────────────────────────────────────────────────────────────
-- 10. mention (unified across post/comment/event_question/event_answer)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mention (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       text  NOT NULL CHECK (source_type IN (
                              'post',
                              'comment',
                              'event_question',
                              'event_answer'
                          )),
  source_id         uuid  NOT NULL,
  mentioned_user_id uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  mentioner_id      uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mention_mentioned_user_id_idx ON public.mention (mentioned_user_id);
CREATE INDEX IF NOT EXISTS mention_source_idx            ON public.mention (source_type, source_id);
CREATE INDEX IF NOT EXISTS mention_mentioner_id_idx      ON public.mention (mentioner_id);

-- ────────────────────────────────────────────────────────────────
-- 11. Full-text search trigger for events
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION event_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.venue, '')), 'C') ||
    setweight(to_tsvector('english',
      COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.country, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, venue, city, country ON public.event
  FOR EACH ROW EXECUTE FUNCTION event_search_vector_trigger();

-- ────────────────────────────────────────────────────────────────
-- 12. Row Level Security
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.event               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_url           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_question      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_question_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_answer        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_answer_vote   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll_option   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll_vote     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mention             ENABLE ROW LEVEL SECURITY;

-- event
CREATE POLICY "event_select_visible"
  ON public.event FOR SELECT
  USING (is_deleted = false OR creator_id = auth.uid());

CREATE POLICY "event_insert_own"
  ON public.event FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "event_update_own"
  ON public.event FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "event_delete_own"
  ON public.event FOR DELETE
  USING (auth.uid() = creator_id);

-- event_url
CREATE POLICY "event_url_select_all"
  ON public.event_url FOR SELECT USING (true);

CREATE POLICY "event_url_insert_own"
  ON public.event_url FOR INSERT
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "event_url_delete_own"
  ON public.event_url FOR DELETE
  USING (auth.uid() = added_by);

-- event_question
CREATE POLICY "eq_select_all"
  ON public.event_question FOR SELECT USING (true);

CREATE POLICY "eq_insert_own"
  ON public.event_question FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "eq_update_own"
  ON public.event_question FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "eq_delete_own"
  ON public.event_question FOR DELETE
  USING (auth.uid() = author_id);

-- event_question_vote
CREATE POLICY "eqv_select_all"
  ON public.event_question_vote FOR SELECT USING (true);

CREATE POLICY "eqv_insert_own"
  ON public.event_question_vote FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eqv_update_own"
  ON public.event_question_vote FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "eqv_delete_own"
  ON public.event_question_vote FOR DELETE
  USING (auth.uid() = user_id);

-- event_answer
CREATE POLICY "ea_select_all"
  ON public.event_answer FOR SELECT USING (true);

CREATE POLICY "ea_insert_own"
  ON public.event_answer FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "ea_update_own"
  ON public.event_answer FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "ea_delete_own"
  ON public.event_answer FOR DELETE
  USING (auth.uid() = author_id);

-- event_answer_vote
CREATE POLICY "eav_select_all"
  ON public.event_answer_vote FOR SELECT USING (true);

CREATE POLICY "eav_insert_own"
  ON public.event_answer_vote FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eav_update_own"
  ON public.event_answer_vote FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "eav_delete_own"
  ON public.event_answer_vote FOR DELETE
  USING (auth.uid() = user_id);

-- event_poll
CREATE POLICY "ep_select_all"
  ON public.event_poll FOR SELECT USING (true);

CREATE POLICY "ep_insert_own"
  ON public.event_poll FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "ep_update_own"
  ON public.event_poll FOR UPDATE
  USING (auth.uid() = creator_id);

-- event_poll_option (public read; creator manages)
CREATE POLICY "epo_select_all"
  ON public.event_poll_option FOR SELECT USING (true);

CREATE POLICY "epo_insert"
  ON public.event_poll_option FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_poll ep
      WHERE ep.id = poll_id AND ep.creator_id = auth.uid()
    )
  );

-- event_poll_vote
CREATE POLICY "epv_select_all"
  ON public.event_poll_vote FOR SELECT USING (true);

CREATE POLICY "epv_insert_own"
  ON public.event_poll_vote FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "epv_delete_own"
  ON public.event_poll_vote FOR DELETE
  USING (auth.uid() = user_id);

-- mention
CREATE POLICY "mention_select_own"
  ON public.mention FOR SELECT
  USING (mentioned_user_id = auth.uid() OR mentioner_id = auth.uid());

CREATE POLICY "mention_insert_own"
  ON public.mention FOR INSERT
  WITH CHECK (mentioner_id = auth.uid());
