-- Event favorites: users can tag any event (including their own) as favorite
CREATE TABLE IF NOT EXISTS public.event_favorite (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS event_favorite_user_id_idx ON public.event_favorite (user_id);
CREATE INDEX IF NOT EXISTS event_favorite_event_id_idx ON public.event_favorite (event_id);

ALTER TABLE public.event_favorite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_favorite_select_own"
  ON public.event_favorite FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "event_favorite_insert_own"
  ON public.event_favorite FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_favorite_delete_own"
  ON public.event_favorite FOR DELETE
  USING (auth.uid() = user_id);
