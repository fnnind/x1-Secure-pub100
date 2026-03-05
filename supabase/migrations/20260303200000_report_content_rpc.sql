-- Add is_reported to tables that were missing it
ALTER TABLE subxeuron ADD COLUMN IF NOT EXISTS is_reported boolean NOT NULL DEFAULT false;
ALTER TABLE event     ADD COLUMN IF NOT EXISTS is_reported boolean NOT NULL DEFAULT false;

-- SECURITY DEFINER RPC lets any authenticated user flag content
-- without requiring service-role key or direct UPDATE grants.
-- Runs with the privileges of the function owner (postgres).
CREATE OR REPLACE FUNCTION flag_content_as_reported(
  p_content_type text,
  p_content_id   text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  CASE p_content_type
    WHEN 'post'        THEN UPDATE post        SET is_reported = true WHERE id = p_content_id;
    WHEN 'comment'     THEN UPDATE comment     SET is_reported = true WHERE id = p_content_id;
    WHEN 'publication' THEN UPDATE publication SET is_reported = true WHERE id = p_content_id;
    WHEN 'subxeuron'   THEN UPDATE subxeuron   SET is_reported = true WHERE id = p_content_id;
    WHEN 'event'       THEN UPDATE event       SET is_reported = true WHERE id = p_content_id;
    ELSE RETURN false;
  END CASE;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Restrict to authenticated users only
REVOKE EXECUTE ON FUNCTION flag_content_as_reported(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION flag_content_as_reported(text, text) TO authenticated;
