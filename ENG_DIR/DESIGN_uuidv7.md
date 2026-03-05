# DESIGN: UUIDv7 Adoption for Time-Sortable IDs

**Status:** Design / Pre-implementation
**Author:** Engineering
**Scope:** Service Layer + Database defaults (all tables)

---

## 1. Why UUIDv7?

The current schema uses PostgreSQL's `gen_random_uuid()` which produces **UUIDv4** — completely random 128-bit identifiers. These are excellent for global uniqueness but have a critical scalability problem: **random IDs destroy index locality**.

| Property | UUIDv4 (`gen_random_uuid()`) | UUIDv7 |
|----------|-------------------------------|--------|
| Sortable by creation time | No | Yes — 48-bit ms timestamp in high bits |
| B-tree index fragmentation | High (random inserts scattered) | Low (new rows appended near the end) |
| Clustered index efficiency | Poor | Good |
| Page cache hit rate | Poor | Good |
| Human debuggability | Opaque | Timestamp readable (`uuidv7` → `2026-02-22T...`) |
| Uniqueness guarantee | Cryptographic | High (timestamp + random suffix) |
| Standard | RFC 4122 | RFC 9562 (2024) |

**At scale**, UUIDv4 causes write amplification because PostgreSQL must fetch random B-tree pages for every insert, most of which won't be in cache. UUIDv7 keeps inserts at the "right end" of the index — same performance characteristic as auto-increment integers, but globally unique and without coordination.

**Additional benefit:** `ORDER BY id` gives approximate chronological order — useful for pagination and debugging without always needing a separate `created_at` column sort.

---

## 2. Package: `uuid` (npm)

The `uuid` npm package (v9+) includes `v7()` support:

```
npm package: uuid
version: ^9.0.0  (v7 was added in v9.0.0)
pnpm install uuid
pnpm install --save-dev @types/uuid
```

**Key exports used:**
```typescript
import { v7 as uuidv7 } from 'uuid'

const id = uuidv7()
// e.g. "019584b2-3c6a-7000-8000-000000000001"
// First 48 bits = Unix milliseconds → monotonically increasing
```

---

## 3. Implementation Plan

### Step 1 — Install the `uuid` package

```
pnpm add uuid
pnpm add -D @types/uuid
```

Verify the installed version supports `v7`:
```
node -e "const { v7 } = require('uuid'); console.log(v7())"
```

---

### Step 2 — Create a shared ID utility

**File:** `lib/utils/id.ts`

```typescript
import { v7 as uuidv7 } from 'uuid'

/**
 * Generate a time-sortable UUIDv7.
 * Use this for ALL new database record IDs instead of letting
 * the DB generate UUIDv4 via gen_random_uuid().
 *
 * UUIDv7 encodes millisecond timestamp in the high bits, which:
 * - Keeps B-tree index pages hot (sequential inserts)
 * - Allows `ORDER BY id` to approximate creation order
 * - Aids horizontal database scaling (sharding, replication)
 */
export function generateId(): string {
  return uuidv7()
}
```

**Rules:**
- NEVER call `uuidv7()` directly in application code — always use `generateId()` so the source is traceable and can be swapped (e.g., to ULID or Snowflake) in one place
- NEVER pass `undefined` as an ID; always call `generateId()` explicitly before the insert
- Only generate IDs in the **Service Layer** (`lib/supabase/mutations.ts`, `lib/supabase/*.ts`), never in React components or Server Actions

---

### Step 3 — Update the Service Layer (all mutations)

Update every `supabase.from('table').insert({...})` call to pass an explicit `id: generateId()` rather than relying on the DB default.

#### Files to update:

| File | Functions to update |
|------|-------------------|
| `lib/supabase/mutations.ts` | `createSubxeuron()`, `createPost()`, `addComment()` (and all future mutations) |
| `lib/supabase/publications.ts` (new) | `createPublication()` |
| `lib/supabase/events.ts` (new) | `createEvent()`, `createEventUrl()` |
| `lib/supabase/event-qa.ts` (new) | `createQuestion()`, `createAnswer()`, `voteOnQuestion()`, `voteOnAnswer()` |
| `lib/supabase/event-polls.ts` (new) | `createPoll()`, `createPollOption()`, `submitPollVote()` |

#### Before (current pattern):
```typescript
const { data, error } = await supabase
  .from('subxeuron')
  .insert({
    title: name,
    slug,
    // id not provided → DB uses gen_random_uuid() → UUIDv4
  })
  .select('id')
  .single()
```

#### After (UUIDv7 pattern):
```typescript
import { generateId } from '@/lib/utils/id'

const id = generateId()                    // ← generate before insert
const { data, error } = await supabase
  .from('subxeuron')
  .insert({
    id,                                    // ← explicit UUIDv7
    title: name,
    slug,
  })
  .select('id')
  .single()
```

**Why generate in the Service Layer instead of the DB?**
- The ID is known before the insert → can be used in related inserts within the same logical operation (e.g. insert publication then insert publication_author with `publication_id = id`) without a round-trip
- Enables offline-first / optimistic UI patterns in the future
- The DB column retains its `DEFAULT gen_random_uuid()` as a fallback for direct SQL inserts (migrations, seed scripts, admin queries)

---

### Step 4 — Update Database Column Defaults (Migration)

Change `DEFAULT gen_random_uuid()` to `DEFAULT gen_random_uuid()` on existing tables — **keep the default as-is for now**. Rationale:

- The DB default is a **safety net** for direct SQL inserts (migrations, seeds); changing it to a custom UUIDv7 function requires installing `pgcrypto` extensions or a PL/pgSQL wrapper
- Since the Service Layer now always passes an explicit `id`, the column default is only a fallback
- A future migration can add a PG-native UUIDv7 function once PostgreSQL 17 ships native `uuid_generate_v7()` or once the Supabase platform supports it

**Optional: Add a PL/pgSQL UUIDv7 shim for the DB default** (included for completeness, not required for v1):

```sql
-- supabase/migrations/20260222150000_add_uuidv7_default.sql
-- Pure SQL implementation of UUIDv7 (no extension required)
CREATE OR REPLACE FUNCTION public.gen_uuidv7()
RETURNS uuid AS $$
DECLARE
  v_time  bigint;       -- milliseconds since epoch
  v_uuid  bytea;
BEGIN
  v_time := EXTRACT(EPOCH FROM clock_timestamp()) * 1000;

  -- Build 128-bit UUID:
  -- Bits 0-47:  48-bit ms timestamp
  -- Bits 48-51: version = 0b0111 (7)
  -- Bits 52-63: 12 random bits
  -- Bits 64-65: variant = 0b10
  -- Bits 66-127: 62 random bits

  v_uuid := decode(
    lpad(to_hex(v_time), 12, '0') ||                      -- 48-bit timestamp
    '7' ||                                                 -- version nibble
    encode(gen_random_bytes(2), 'hex') ||                  -- 12 random bits
    to_hex((get_byte(gen_random_bytes(1), 0) & 63) | 128) || -- variant + 6 random bits
    encode(gen_random_bytes(7), 'hex'),                    -- 56 random bits
    'hex'
  );
  RETURN encode(v_uuid, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql;

-- Then alter each table (run for all tables):
ALTER TABLE public."user"         ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.subxeuron      ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.post           ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.comment        ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.vote           ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
ALTER TABLE public.publication    ALTER COLUMN id   SET DEFAULT public.gen_uuidv7();
-- ... (all new tables from DESIGN_CREATE_Pub.md and DESIGN_EVENT.md)
```

**Decision for v1:** Skip the DB shim. Enforce UUIDv7 only through the Service Layer. Add the shim in a follow-up migration.

---

### Step 5 — Linting / Enforcement

Add an ESLint rule or a custom lint check to prevent direct calls to `uuidv7()` outside of `lib/utils/id.ts`:

**Option A — ESLint `no-restricted-imports` rule:**
```json
// .eslintrc.json or eslint.config.js
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "uuid",
            "importNames": ["v7"],
            "message": "Use generateId() from '@/lib/utils/id' instead of importing uuidv7 directly."
          }
        ]
      }
    ]
  }
}
```

**Option B — Grep CI check (simpler):**
```bash
# .github/workflows/lint.yml or package.json scripts
grep -rn "from 'uuid'" --include="*.ts" --include="*.tsx" . \
  | grep -v "lib/utils/id.ts" \
  && echo "ERROR: Import uuid only via @/lib/utils/id" && exit 1 \
  || echo "OK"
```

---

### Step 6 — Verify and Test

**Unit test for `generateId()`:**
```typescript
// lib/utils/id.test.ts
import { generateId } from './id'

describe('generateId', () => {
  it('returns a valid UUID string', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates time-sortable IDs', () => {
    const ids = Array.from({ length: 100 }, generateId)
    const sorted = [...ids].sort()
    // UUIDv7 strings sort lexicographically in time order
    expect(ids).toEqual(sorted)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 1000 }, generateId))
    expect(ids.size).toBe(1000)
  })
})
```

**Integration test:** Insert 1000 records via the Service Layer, then verify `SELECT id FROM table ORDER BY id` returns them in insertion order.

---

## 4. Migration File Naming

```
supabase/migrations/20260222150000_add_uuidv7_db_default.sql
```

This file is optional for v1 (DB keeps `gen_random_uuid()` fallback). The Service Layer change is the critical path.

---

## 5. Rollout Order

```
1. pnpm add uuid @types/uuid
2. Create lib/utils/id.ts
3. Add ESLint rule
4. Update lib/supabase/mutations.ts (existing functions)
5. Write unit tests for generateId()
6. All new Service Layer files (publications, events, polls, Q&A) use generateId() from day one
7. (Optional v2) Write and apply the gen_uuidv7() PG function migration
8. (Optional v2) Run a data migration to backfill existing UUIDv4 rows — generally NOT needed unless you are migrating to a sharded DB that requires time-ordered IDs on existing rows
```

---

## 6. Impact on Existing Data

**No migration of existing rows is needed for v1.** Existing UUIDv4 IDs remain valid — PostgreSQL and Supabase do not care whether a UUID column contains v4 or v7 values. The uniqueness constraint, FK integrity, and RLS all continue to work identically.

New rows created after this change will have UUIDv7 IDs. Pagination and sorting by `id` will be slightly inconsistent for records that span the cutover, but `created_at` is always available as a reliable sort key.

---

## 7. Summary: What Changes, What Doesn't

| Area | Change |
|------|--------|
| `lib/utils/id.ts` | NEW — `generateId()` wrapper around `uuidv7()` |
| `lib/supabase/mutations.ts` | UPDATE — all `insert()` calls pass explicit `id: generateId()` |
| New Service Layer files | WRITE — always use `generateId()` from the start |
| DB column definitions | NO CHANGE for v1 — `DEFAULT gen_random_uuid()` kept as safety fallback |
| RLS policies | NO CHANGE |
| TypeScript types | NO CHANGE — IDs are still typed as `string` / `uuid` |
| Existing data | NO CHANGE — UUIDv4 rows remain valid |
| API responses | NO CHANGE — clients receive UUID strings regardless of version |
