-- UUIDv7 as default for entity primary keys (B-tree–friendly, time-ordered).
-- Application inserts already pass id via generateId(); this makes raw SQL/defaults use UUIDv7 too.
-- Requires pgcrypto for gen_random_bytes (Supabase has it enabled).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.gen_uuidv7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_time  bigint;
  v_hex   text;
  v_uuid  bytea;
BEGIN
  v_time := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;

  -- UUIDv7 layout: 48-bit ms timestamp, version 7, variant, rest random.
  v_uuid := decode(
    lpad(to_hex(v_time), 12, '0')
    || '7'
    || encode(gen_random_bytes(2), 'hex')
    || to_hex((get_byte(gen_random_bytes(1), 0)::int & 63) | 128)
    || encode(gen_random_bytes(7), 'hex'),
    'hex'
  );
  v_hex := encode(v_uuid, 'hex');
  RETURN (
    substr(v_hex, 1, 8) || '-'
    || substr(v_hex, 9, 4) || '-'
    || substr(v_hex, 13, 4) || '-'
    || substr(v_hex, 17, 4) || '-'
    || substr(v_hex, 21, 12)
  )::uuid;
END;
$$;

-- Only tables that use generated ids (exclude public.user — id comes from auth.users).
ALTER TABLE public.subxeuron  ALTER COLUMN id SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.post       ALTER COLUMN id SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.comment   ALTER COLUMN id SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.vote      ALTER COLUMN id SET DEFAULT public.gen_uuidv7();
