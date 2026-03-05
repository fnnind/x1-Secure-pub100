-- Rate limit table: one row per (key, fixed time window).
-- Keys are opaque strings like 'votes:user-id' — no PII stored directly.
CREATE TABLE rate_limit (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX rate_limit_window_start_idx ON rate_limit (window_start);

-- Returns TRUE if the request is allowed, FALSE if the caller is over the limit.
-- Uses a fixed window: the epoch is divided into equal buckets of p_window_seconds.
-- SECURITY DEFINER so it bypasses RLS on the rate_limit table.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_max_count      integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start timestamptz;
  v_count        integer;
BEGIN
  -- Bucket the current time into a fixed window boundary
  v_window_start := to_timestamp(
    (extract(epoch from now())::bigint / p_window_seconds) * p_window_seconds
  );

  -- Atomically insert or increment the counter
  INSERT INTO rate_limit (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limit.count + 1
  RETURNING count INTO v_count;

  -- Prune stale windows for this key (keep at most the last 2 windows)
  DELETE FROM rate_limit
  WHERE key = p_key
    AND window_start < v_window_start - (p_window_seconds * interval '1 second');

  RETURN v_count <= p_max_count;
END;
$$;
