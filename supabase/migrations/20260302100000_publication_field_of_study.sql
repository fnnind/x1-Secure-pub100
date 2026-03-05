-- Add field_of_study to publication
-- Used for the category breadcrumb on the publication landing page
-- e.g. "Computer Science > Computation and Language"
-- Date: 2026-03-02

ALTER TABLE public.publication
  ADD COLUMN IF NOT EXISTS field_of_study text;
