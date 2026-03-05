-- ─── Feature v1.1 Migration ──────────────────────────────────────────────────
-- Adds: page_view (instrumentation), subxeuron_tag, event_tag (search tags)
-- Date: 2026-03-01

-- ─── 1. page_view — engagement tracking ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.page_view (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text        NOT NULL CHECK (entity_type IN ('subxeuron', 'publication', 'event', 'post')),
  entity_id    uuid        NOT NULL,
  viewer_id    uuid        REFERENCES public."user"(id) ON DELETE SET NULL,
  session_id   text,                               -- anonymous session fingerprint (optional)
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_view_entity_idx    ON public.page_view (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS page_view_created_at_idx ON public.page_view (created_at DESC);
CREATE INDEX IF NOT EXISTS page_view_viewer_id_idx  ON public.page_view (viewer_id);

ALTER TABLE public.page_view ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a page view (anonymous OK — viewer_id nullable)
CREATE POLICY "pv_insert_all" ON public.page_view FOR INSERT WITH CHECK (true);
-- Reads restricted to service role (analytics queries run server-side)
CREATE POLICY "pv_select_own" ON public.page_view FOR SELECT USING (
  viewer_id = auth.uid() OR auth.role() = 'service_role'
);

-- ─── 2. subxeuron_tag — searchable tags per subxeuron ─────────────────────────
CREATE TABLE IF NOT EXISTS public.subxeuron_tag (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subxeuron_id  uuid        NOT NULL REFERENCES public.subxeuron(id) ON DELETE CASCADE,
  tag           text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subxeuron_tag_unique UNIQUE (subxeuron_id, tag)
);

CREATE INDEX IF NOT EXISTS subxeuron_tag_subxeuron_id_idx ON public.subxeuron_tag (subxeuron_id);
CREATE INDEX IF NOT EXISTS subxeuron_tag_tag_idx           ON public.subxeuron_tag (tag);

ALTER TABLE public.subxeuron_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select_all"    ON public.subxeuron_tag FOR SELECT USING (true);
CREATE POLICY "st_insert_own"    ON public.subxeuron_tag FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.subxeuron
    WHERE id = subxeuron_id AND moderator_id = auth.uid()
  )
);
CREATE POLICY "st_delete_own"    ON public.subxeuron_tag FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.subxeuron
    WHERE id = subxeuron_id AND moderator_id = auth.uid()
  )
);

-- ─── 3. event_tag — searchable tags per event ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_tag (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  tag        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_tag_unique UNIQUE (event_id, tag)
);

CREATE INDEX IF NOT EXISTS event_tag_event_id_idx ON public.event_tag (event_id);
CREATE INDEX IF NOT EXISTS event_tag_tag_idx       ON public.event_tag (tag);

ALTER TABLE public.event_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "et_select_all" ON public.event_tag FOR SELECT USING (true);
CREATE POLICY "et_insert_own" ON public.event_tag FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE id = event_id AND creator_id = auth.uid()
  )
);
CREATE POLICY "et_delete_own" ON public.event_tag FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE id = event_id AND creator_id = auth.uid()
  )
);
