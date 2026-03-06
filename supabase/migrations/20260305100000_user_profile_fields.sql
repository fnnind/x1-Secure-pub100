-- Add extended profile fields to public.user

ALTER TABLE public.user
  ADD COLUMN IF NOT EXISTS first_name         text,
  ADD COLUMN IF NOT EXISTS last_name          text,
  ADD COLUMN IF NOT EXISTS nickname           text,
  ADD COLUMN IF NOT EXISTS interests          text[],
  ADD COLUMN IF NOT EXISTS expertise          text[],
  ADD COLUMN IF NOT EXISTS category           text
    CONSTRAINT user_category_check CHECK (category IN (
      'researcher',
      'academic',
      'industry_professional',
      'independent_scientist',
      'builder',
      'engineer',
      'professional',
      'curiosity',
      'intellect',
      'other'
    )),
  ADD COLUMN IF NOT EXISTS innovation_summary text
    CONSTRAINT user_innovation_summary_length CHECK (
      char_length(innovation_summary) <= 1000
    ),
  ADD COLUMN IF NOT EXISTS is_profile_public  boolean NOT NULL DEFAULT false;

-- Backfill: default nickname to username for existing rows
UPDATE public.user SET nickname = username WHERE nickname IS NULL;
