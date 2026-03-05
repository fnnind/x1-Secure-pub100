-- ─── Analytics RPC: get_popular_entities ─────────────────────────────────────
-- Replaces JS-side GROUP BY aggregation in lib/supabase/analytics.ts.
-- Runs entirely in the DB using existing indexes on (entity_type, entity_id)
-- and created_at DESC, so cost is O(index scan in period) not O(all rows).
-- Date: 2026-03-02

CREATE OR REPLACE FUNCTION public.get_popular_entities(
  p_entity_type text,
  p_since       timestamptz,
  p_limit       int DEFAULT 20
)
RETURNS TABLE (entity_id uuid, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER   -- runs as owner, bypasses RLS on page_view for aggregate reads
SET search_path = public
AS $$
  SELECT
    pv.entity_id,
    COUNT(*)::bigint AS view_count
  FROM public.page_view pv
  WHERE pv.entity_type = p_entity_type
    AND pv.created_at  >= p_since
  GROUP BY pv.entity_id
  ORDER BY view_count DESC
  LIMIT p_limit;
$$;

-- Allow anon + authenticated roles to call via the JS client
GRANT EXECUTE ON FUNCTION public.get_popular_entities(text, timestamptz, int)
  TO anon, authenticated;
