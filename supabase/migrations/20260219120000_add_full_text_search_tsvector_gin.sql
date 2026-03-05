-- Full-text search: tsvector columns and GIN indexes (§3.6)
-- Run after base tables (user, subxeuron, post, comment, vote) exist.
-- Apply with: supabase db push  (or  supabase migration up)

-- 1) Add tsvector columns (if not already in table definitions)
ALTER TABLE subxeuron ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE post ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE comment ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2) Function to build tsvector from post body (Portable Text jsonb)
--    Extracts text from block content for indexing
CREATE OR REPLACE FUNCTION post_body_to_plain_text(body jsonb)
RETURNS text AS $$
  SELECT string_agg(
    elem->'children'->0->>'text',
    ' '
  )
  FROM jsonb_array_elements(body) AS elem
  WHERE elem->'children' IS NOT NULL
    AND jsonb_array_length(COALESCE(elem->'children', '[]'::jsonb)) > 0;
$$ LANGUAGE sql IMMUTABLE;

-- 3) Trigger function: keep subxeuron.search_vector in sync
CREATE OR REPLACE FUNCTION subxeuron_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subxeuron_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description ON subxeuron
  FOR EACH ROW EXECUTE FUNCTION subxeuron_search_vector_trigger();

-- 4) Trigger function: keep post.search_vector in sync (title + body text)
CREATE OR REPLACE FUNCTION post_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(post_body_to_plain_text(NEW.body), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_search_vector_update
  BEFORE INSERT OR UPDATE OF title, body ON post
  FOR EACH ROW EXECUTE FUNCTION post_search_vector_trigger();

-- 5) Trigger function: keep comment.search_vector in sync
CREATE OR REPLACE FUNCTION comment_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_search_vector_update
  BEFORE INSERT OR UPDATE OF content ON comment
  FOR EACH ROW EXECUTE FUNCTION comment_search_vector_trigger();

-- 6) Backfill existing rows (run once after adding columns/triggers)
UPDATE subxeuron SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B');
UPDATE post SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(post_body_to_plain_text(body), '')), 'B');
UPDATE comment SET search_vector = to_tsvector('english', COALESCE(content, ''));

-- 7) GIN indexes for fast textSearch
CREATE INDEX IF NOT EXISTS subxeuron_search_vector_idx ON subxeuron USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS post_search_vector_idx ON post USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS comment_search_vector_idx ON comment USING GIN (search_vector);
