-- Allow posts to belong to a publication or event (not only a subxeuron)
-- Step 1: drop the NOT NULL constraint on subxeuron_id
ALTER TABLE public.post
  ALTER COLUMN subxeuron_id DROP NOT NULL;

-- Step 2: add optional publication / event foreign keys
ALTER TABLE public.post
  ADD COLUMN IF NOT EXISTS publication_id uuid REFERENCES public.publication(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_id       uuid REFERENCES public.event(id)       ON DELETE CASCADE;

-- Step 3: every post must belong to at least one context
ALTER TABLE public.post
  ADD CONSTRAINT post_context_check CHECK (
    subxeuron_id IS NOT NULL OR
    publication_id IS NOT NULL OR
    event_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS post_publication_id_idx ON public.post (publication_id) WHERE publication_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS post_event_id_idx       ON public.post (event_id)       WHERE event_id IS NOT NULL;
