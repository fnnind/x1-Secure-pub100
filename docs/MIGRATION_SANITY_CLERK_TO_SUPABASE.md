# Migration Plan: Sanity + Clerk → Supabase

This document outlines steps to migrate from Sanity (CMS) and Clerk (auth) to Supabase (database + auth), preserving existing naming conventions and application behavior.

---

## 0. Supabase project and environment

The Supabase project is created. In `.env.local` you have:

- `NEXT_PUBLIC_SUPABASE_URL=https://yvbykhjypklymjlrbygw.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...`

**Recommended:** Use Supabase’s standard env names so the official client and docs work as-is. Rename the key to **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (this is the “anon” / public key from Project Settings → API). For server-side writes with elevated privileges you will also need **`SUPABASE_SERVICE_ROLE_KEY`** (Project Settings → API → service_role; keep it server-only, never expose to the client).

Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yvbykhjypklymjlrbygw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

---

## 1. Current State Summary

### 1.1 Sanity schema types (document types)

| Sanity type   | Purpose                          | Key fields / references      |
|---------------|-----------------------------------|------------------------------|
| `user`        | User profile (synced from Clerk) | username, email, imageUrl, joinedAt, isReported, isDeleted |
| `post`        | Post in a subxeuron               | title, author→user, subxeuron→subxeuron, body (blocks), image, publishedAt, isReported, isDeleted |
| `subxeuron`   | Community / category              | title, slug, description, moderator→user, parentSubxeuron→subxeuron, body, pdfUrl, sourceUrl, image, createdAt |
| `comment`     | Comment on a post (threaded)      | content, author→user, post→post, parentComment→comment, isReported, isDeleted, createdAt |
| `vote`        | Upvote/downvote on post or comment| user→user, voteType (upvote\|downvote), post→post?, comment→comment?, createdAt, isDeleted |

### 1.2 GROQ usage (read)

- **Posts:** `getPosts`, `getPostById`, `getPostsForSubxeuron` (with vote counts; note: typo `postt._ref` in commentCount).
- **Subxeurons:** `getSubxeurons`, `getSubxeuronBySlug`, `searchSubxeurons` (title match), `createSubxeuron` (read check + create).
- **Comments:** `getPostComments` (top-level only, with nested replies + vote counts + user vote status), `getCommentReplies`, `getCommentById`.
- **Votes:** `getPostVotes`, `getUserPostVoteStatus`; comment votes are embedded in comment queries.
- **User:** `getUser` (Clerk + Sanity lookup/create), `addUser`.

### 1.3 Mutations (write)

- **User:** `addUser` (createIfNotExists).
- **Subxeuron:** `createSubxeuron` (create + image upload via Sanity assets).
- **Post:** `createPost` (create + image upload); `deletePost` (patch: isDeleted, title/body redaction, image unset/delete).
- **Comment:** `addComment`, `deleteComment` (patch: isDeleted, content redaction).
- **Vote:** `upvotePost`, `downvotePost`, `upvoteComment`, `downvoteComment` (create/patch/delete).
- **Report:** `reportContent` (patch `isReported` on any document).

### 1.4 Clerk usage

- `currentUser()` / `auth()` for session; user id is stored as Sanity `user._id`.
- `getUser()` ensures a Sanity `user` document exists for the Clerk user (create if not exists).

---

## 2. Naming convention (to preserve)

- **Table names:** Keep Sanity type names: `user`, `post`, `subxeuron`, `comment`, `vote`.
- **Column names:** Prefer current field names in **snake_case** in the database (Postgres convention). In TypeScript, keep the same names as today (camelCase) and map in data access (e.g. `published_at` ↔ `publishedAt`), or use Supabase/PostgREST with a small transform layer so the rest of the app still sees `publishedAt`, `isDeleted`, etc.

---

## 3. Supabase schema (tables + columns)

### 3.1 `user`

- Replaces Sanity `user`; after migration, **Supabase Auth will be source of truth** for identity; this table is the app profile.
- Keep same logical fields; id will align with `auth.users.id` (Supabase) instead of Clerk id.

| Column       | Type         | Notes |
|-------------|--------------|-------|
| id          | uuid (PK)    | Same as `auth.users.id` |
| username    | text         | NOT NULL |
| email       | text         | NOT NULL |
| image_url   | text         | Optional (was Clerk imageUrl) |
| joined_at   | timestamptz  | NOT NULL, default now() |
| is_reported | boolean      | default false |
| is_deleted  | boolean      | default false |
| created_at  | timestamptz  | default now() |
| updated_at  | timestamptz  | default now() |

- RLS: users can read all; update only own row (by `auth.uid()`).

### 3.2 `subxeuron`

| Column             | Type         | Notes |
|--------------------|--------------|-------|
| id                 | uuid (PK)    | default gen_random_uuid() |
| title              | text         | NOT NULL |
| slug               | text         | NOT NULL, UNIQUE |
| description        | text         | |
| moderator_id       | uuid (FK→user) | NOT NULL |
| parent_subxeuron_id| uuid (FK→subxeuron) | nullable |
| body               | jsonb        | Portable Text blocks (same structure as Sanity) |
| pdf_url            | text         | |
| source_url         | text         | NOT NULL (validate in app: doi/arxiv/nature) |
| image_url          | text         | After migration: store URL to file in Supabase Storage or S3 |
| image_alt          | text         | |
| created_at         | timestamptz  | NOT NULL, default now() |
| updated_at         | timestamptz  | default now() |
| search_vector      | tsvector     | For full-text search (see §3.6) |

- Index: `UNIQUE(subxeuron.slug)`, index on `slug` for lookups; **GIN index on `search_vector`** for `textSearch`.
- RLS: read all; insert/update/delete by moderator or admin.

### 3.3 `post`

| Column        | Type         | Notes |
|---------------|--------------|-------|
| id            | uuid (PK)    | default gen_random_uuid() |
| title         | text         | NOT NULL |
| original_title| text         | For soft-delete preservation |
| author_id     | uuid (FK→user) | NOT NULL |
| subxeuron_id  | uuid (FK→subxeuron) | NOT NULL |
| body          | jsonb        | Portable Text blocks |
| original_body | jsonb        | For soft-delete |
| image_url     | text         | After migration: Storage/S3 URL |
| image_alt     | text         | |
| published_at  | timestamptz  | NOT NULL, default now() |
| is_reported   | boolean      | default false |
| is_deleted    | boolean      | default false |
| created_at    | timestamptz  | default now() |
| updated_at    | timestamptz  | default now() |
| search_vector | tsvector     | For full-text search (see §3.6) |

- Indexes: `subxeuron_id`, `published_at desc`, `author_id`; **GIN index on `search_vector`** for `textSearch`.
- RLS: read non-deleted (or all for author); insert own; update/delete own.

### 3.4 `comment`

| Column           | Type         | Notes |
|------------------|--------------|-------|
| id               | uuid (PK)    | default gen_random_uuid() |
| content          | text         | NOT NULL |
| author_id        | uuid (FK→user) | NOT NULL |
| post_id          | uuid (FK→post) | NOT NULL |
| parent_comment_id| uuid (FK→comment) | nullable (replies) |
| is_reported      | boolean      | default false |
| is_deleted       | boolean      | default false |
| created_at       | timestamptz  | NOT NULL, default now() |
| updated_at       | timestamptz  | default now() |
| search_vector    | tsvector     | Optional: for full-text search on content (see §3.6) |

- Indexes: `post_id`, `parent_comment_id`, `author_id`; **GIN index on `search_vector`** if you add it.
- RLS: read all (or filter is_deleted in app); insert own; update/delete own.

### 3.5 `vote`

| Column      | Type         | Notes |
|-------------|--------------|-------|
| id          | uuid (PK)    | default gen_random_uuid() |
| user_id     | uuid (FK→user) | NOT NULL |
| vote_type   | text         | NOT NULL, check (vote_type in ('upvote','downvote')) |
| post_id     | uuid (FK→post) | nullable |
| comment_id  | uuid (FK→comment) | nullable |
| created_at  | timestamptz  | NOT NULL, default now() |
| is_deleted  | boolean      | default false |
| updated_at  | timestamptz  | default now() |

- Constraint: exactly one of `post_id` or `comment_id` (check constraint).
- Unique: one vote per (user, post) or (user, comment):  
  `UNIQUE(user_id, post_id)` where post_id is not null, and similar for comment (or use partial unique indexes).
- RLS: read all; insert/update/delete own votes.

### 3.6 Full-text search (tsvector + GIN index)

To get **better search performance** and ranking, use Postgres full-text search with a **tsvector** column and **GIN index** on each searchable table. Then use Supabase’s `.textSearch()` (or RPC) instead of `ilike`.

**Tables and source columns:**

| Table      | tsvector column  | Source columns (concatenated, with coalesce)     |
|------------|------------------|----------------------------------------------------|
| subxeuron  | search_vector    | title, description                                 |
| post       | search_vector    | title + plain text extracted from body jsonb      |
| comment    | search_vector    | content (optional; add if you need comment search) |

**Migration SQL:** Stored in `supabase/migrations/20260219120000_add_full_text_search_tsvector_gin.sql`. Run with Supabase CLI: `supabase db push` or `supabase migration up` (after base tables exist).

```sql
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
```

**Using `textSearch` in Supabase client:**

- **searchSubxeurons(searchTerm):**  
  Use `.textSearch('search_vector', query, { config: 'english' })` (and optionally `type: 'websearch'` or `plainto_tsquery` for phrase). Example:

  ```ts
  const { data } = await supabase
    .from('subxeuron')
    .select('id, title, slug, description, image_url, image_alt, created_at, moderator:user(id, username, email, image_url)')
    .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false });
  ```

- **searchPosts(searchTerm)** (optional):  
  Same pattern on `post` with `.eq('is_deleted', false)` and `.textSearch('search_vector', searchTerm, { config: 'english' })`.

- **searchComments(searchTerm)** (optional):  
  Same on `comment` with `.textSearch('search_vector', searchTerm, { config: 'english' })`.

PostgREST exposes full-text search via the `@@` operator: the client’s `.textSearch(column, query)` builds a filter like `search_vector @@ to_tsquery(...)` and uses the GIN index for performance.

---

## 4. Images and rich content

- **Current:** Sanity image type (asset reference, hotspot, crop); body is Portable Text (block array).
- **Migration:**
  - **Body:** Keep Portable Text structure; store as **jsonb** in `post.body` and `subxeuron.body`. No change to block structure; frontend can keep using the same renderer (e.g. @portabletext/react).
  - **Images:**  
    - **Option A:** Supabase Storage: upload on create/update; store final URL in `image_url` (and optional `image_alt`).  
    - **Option B:** Keep S3 (e.g. existing `uploadPdfToS3` pattern) and store URL in `image_url`.  
  - **Image builder:** Replace `sanity/lib/image.ts` `urlFor()` with a small helper that returns the stored `image_url` (or a signed URL from Storage/S3 when needed).

---

## 5. GROQ → Supabase (query mapping)

Use **Supabase client** (`@supabase/supabase-js`) and **SQL** (or generated types). Prefer single queries with joins and small, focused queries to avoid N+1.

### 5.1 getPosts

- **GROQ:** `*[_type == "post" && !isDeleted] { ... } | order(publishedAt desc)`
- **Supabase:**  
  `from('post').select('*, author:user(*), subxeuron:subxeuron(*)').eq('is_deleted', false).order('published_at', { ascending: false })`  
  (Adjust select to match exact shape you expose to the app, e.g. `author:user(id, username, email, image_url)`.)

### 5.2 getPostById

- **Supabase:**  
  `from('post').select('*, author:user(*), subxeuron:subxeuron(*)').eq('id', postId).single()`

### 5.3 getSubxeurons

- **Supabase:**  
  `from('subxeuron').select('*, moderator:user(*)').order('created_at', { ascending: false })`

### 5.4 getSubxeuronBySlug(slug)

- **Supabase:**  
  `from('subxeuron').select('*, moderator:user(*)').eq('slug', slug).maybeSingle()`

### 5.5 getPostsForSubxeuron(id)

- **Supabase:**  
  - Posts: `from('post').select('*, author:user(*), subxeuron:subxeuron(*)').eq('subxeuron_id', id).eq('is_deleted', false).order('published_at', { ascending: false })`  
  - Vote counts: either **database views/functions** that aggregate votes (recommended for scale), or two extra queries:  
    - `from('vote').select('post_id, vote_type').eq('post_id', in: postIds)` and aggregate in app, or  
    - One RPC that returns posts with upvotes/downvotes/net_score and comment_count (single round-trip).

### 5.6 searchSubxeurons(searchTerm)

- **GROQ:** `title match $searchTerm + "*"`
- **Supabase (full-text, preferred):**  
  Use the `search_vector` tsvector and GIN index (see §3.6). For better search performance and ranking:

  ```ts
  const { data } = await supabase
    .from('subxeuron')
    .select('id, title, slug, description, image_url, image_alt, created_at, moderator:user(id, username, email, image_url)')
    .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'english' })
    .order('created_at', { ascending: false });
  ```

  If `searchTerm` is empty or whitespace, return `[]` without calling the API (same as current behavior).
- **Fallback (no tsvector):**  
  `from('subxeuron').select('...').ilike('title', searchTerm + '%')` — use only if you have not yet applied the full-text search migration.

### 5.7 getPostComments(postId, userId)

- **Logic:** Top-level comments (`parent_comment_id` is null), with replies and vote counts and current user’s vote status.
- **Supabase:**  
  - Top-level comments: `from('comment').select('*, author:user(*)').eq('post_id', postId).is('parent_comment_id', null).eq('is_deleted', false)`.  
  - For each comment (or batch): replies same way by `parent_comment_id`; vote aggregates via view or RPC; user vote via `from('vote').select('vote_type').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()`.  
  - **Better:** One **Postgres function** or **view** that returns comment tree with upvotes/downvotes/net_score and optional user vote_status (parameterised by `user_id`), then call it via RPC so one query replaces the GROQ.

### 5.8 getCommentReplies(commentId, userId)

- **Supabase:** Same pattern as comments: `from('comment').select('*, author:user(*)').eq('parent_comment_id', commentId)` plus vote aggregates and user vote status (or same RPC as above).

### 5.9 getCommentById(commentId)

- **Supabase:**  
  `from('comment').select('*, author:user(*)').eq('id', commentId).single()`

### 5.10 getPostVotes(postId)

- **Supabase:**  
  Aggregate in SQL:  
  `select count(*) filter (where vote_type = 'upvote') as upvotes, count(*) filter (where vote_type = 'downvote') as downvotes from vote where post_id = $1 and (is_deleted = false)`  
  Expose as RPC or run in app with two count queries.

### 5.11 getUserPostVoteStatus(postId, userId)

- **Supabase:**  
  `from('vote').select('vote_type').eq('post_id', postId).eq('user_id', userId).maybeSingle()`  
  (and optionally filter `is_deleted = false` if you soft-delete votes).

### 5.12 User: getUser / addUser

- **Clerk → Supabase Auth:**  
  - Replace Clerk middleware with Supabase auth (e.g. `@supabase/ssr`).  
  - On login/signup, ensure a row in `user` exists (id = `auth.uid()`).  
  - **getUser:** `auth.getUser()` then `from('user').select('*').eq('id', user.id).single()`; if no row, insert (addUser) then return.  
  - **addUser:** `from('user').insert({ id, username, email, image_url, joined_at }).select().single()` (or use upsert on conflict id).

---

## 6. Mutations → Supabase

- **createSubxeuron:** Insert into `subxeuron`; upload image to Storage/S3, set `image_url`; enforce unique `title` and `slug` in DB (unique constraints) or check before insert.
- **createPost:** Insert into `post`; same image handling; resolve `subxeuron_id` from slug (query by slug first).
- **deletePost:** Update `post` set `is_deleted = true`, `title = '[DELETED POST]'`, `body`/`original_body` as needed, `image_url` = null; optionally delete asset from Storage.
- **addComment:** Insert into `comment` with `post_id`, `parent_comment_id` (if reply), `author_id`.
- **deleteComment:** Update `comment` set `is_deleted = true`, `content = '[DELETED]'`.
- **upvotePost / downvotePost:** Same logic as today: select existing vote by (user_id, post_id); if exists, update vote_type or delete; else insert. Use Supabase `upsert` with conflict on (user_id, post_id) and update vote_type, or do select then insert/update/delete.
- **upvoteComment / downvoteComment:** Same as post votes, keyed by (user_id, comment_id).
- **reportContent:** Update target table (post/comment/user) set `is_reported = true` where id = contentId (you may need to know table type or have a small router).

---

## 7. Step-by-step migration (high level)

1. **Supabase project and schema**
   - **Database:** The database is created automatically when you create a Supabase project; you do not create it separately. This step is about creating the **schema** (tables, RLS) inside that database.
   - Project is created; URL and keys are in `.env.local` (see §0; use `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`).
   - **First migration:** `supabase/migrations/20260219100000_create_base_tables.sql` creates the five tables (user, subxeuron, post, comment, vote) with FKs, constraints, indexes, and RLS policies. Run it with `supabase db push` or `supabase migration up`.
   - **Second migration:** `supabase/migrations/20260219120000_add_full_text_search_tsvector_gin.sql` adds tsvector columns, triggers, and GIN indexes (§3.6); run after the first.
   - Enable Auth in the dashboard (and optional email magic link, OAuth, etc.) if not already on.
   - Add any **database views or RPCs** for comment trees + vote counts to mirror current GROQ shape in one call (optional, later).

2. **Auth: Clerk → Supabase**
   - Install `@supabase/supabase-js` and `@supabase/ssr`; configure middleware and server client with cookies.
   - Replace Clerk middleware with Supabase auth middleware.
   - Replace `currentUser()` / `auth()` with `auth.getUser()` (or session) from Supabase.
   - Implement “getOrCreate profile” on login: if no `user` row for `auth.uid()`, insert one (migrate username/email from Clerk or from Supabase Auth metadata).

3. **Data access layer**
   - Create a `supabase/` (or `lib/supabase/`) module: one file per “domain” (e.g. `posts.ts`, `subxeurons.ts`, `comments.ts`, `votes.ts`, `users.ts`).
   - For each current Sanity GROQ function (e.g. `getPosts`, `getSubxeuronBySlug`), add a Supabase equivalent that returns the same TypeScript shape (same property names: `publishedAt`, `isDeleted`, etc.) so components don’t need to change.
   - Keep existing function names and signatures where possible (e.g. `getPostById(postId)`, `getPostsForSubxeuron(id)`).

4. **Types**
   - Generate Supabase types (`supabase gen types typescript`) and map to your current `sanity.types.ts`-style types (or replace sanity.types with types derived from Supabase + small mappings). Keep exported types like `Post`, `Comment`, `Subxeuron`, `User`, `Vote` with the same field names as today.

5. **Images**
   - Implement upload path: Supabase Storage (or existing S3) for post/subxeuron images; store URL in `image_url`.
   - Replace `sanity/lib/image.ts` with a helper that uses `image_url` (and optional signed URL).

6. **Portable Text**
   - Keep `body` as jsonb; no schema change to block structure. Ensure insert/update send the same JSON shape as before.

7. **Actions and API**
   - Point all server actions (createPost, deletePost, addComment, upvote, downvote, reportContent, createSubxeuron, etc.) to the new Supabase data layer and Supabase Auth for “current user”.
   - Remove Sanity `adminClient` and `client` usage from these paths.

8. **Data migration (existing content)**
   - Export from Sanity (API or export script) to JSON/NDJSON.
   - Map Sanity `_id` to UUIDs: use deterministic mapping (e.g. seed from _id) or new UUIDs and maintain an `_id → uuid` map for references.
   - Map references: `author._ref` → `author_id`, `subxeuron._ref` → `subxeuron_id`, etc.
   - Map slug: `slug.current` → `slug`.
   - Map body and images: body → jsonb; image asset URLs → download and re-upload to Storage/S3, then set `image_url`.
   - Insert in dependency order: user → subxeuron → post → comment → vote.
   - Run migration script; validate counts and spot-checks.

9. **Studio and config**
   - Remove or redirect Sanity Studio routes; remove `next-sanity`, `sanity`, Sanity env vars from app.
   - Remove Clerk packages and env vars.
   - Run typecheck and tests; fix any remaining references.

10. **Cleanup**
    - Delete Sanity schema types and GROQ files (or keep in a `/legacy` folder for reference); remove `sanity.config.ts`, `sanity.cli.ts`, Studio entry. Remove Clerk middleware and components.

---

## 8. File-level checklist (what to add/change/remove)

| Area | Action |
|------|--------|
| **Schema** | Add Supabase migrations (SQL) for `user`, `subxeuron`, `post`, `comment`, `vote` with RLS. |
| **Schema types** | Keep `sanity/schemaTypes/*` only if you need them for reference; types for app come from Supabase + mapping. |
| **GROQ / read** | Replace each file under `sanity/lib/*` (getPosts, getPostById, getSubxeurons, getSubxeuronBySlug, getPostsForSubxeuron, searchSubxeurons, getPostComments, getCommentReplies, getCommentById, getPostVotes, getUserPostVoteStatus, getUser, addUser) with Supabase equivalents in e.g. `lib/supabase/` or `supabase/queries/`, preserving function names and return shapes. |
| **Mutations** | Replace Sanity adminClient create/patch/delete in createSubxeuron, createPost, deletePost, addComment, deleteComment, upvotePost, downvoteComment, etc., with Supabase inserts/updates/deletes. |
| **Images** | Replace `sanity/lib/image.ts` with URL helper; implement upload in actions using Storage or S3. |
| **Auth** | Replace Clerk in middleware, `getUser`, and all `currentUser()`/`auth()` with Supabase auth and profile table. |
| **Env** | Use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (§0). Replace `SANITY_*` and `CLERK_*`. |
| **Full-text search** | Add tsvector columns, triggers, and GIN indexes per §3.6; use `.textSearch('search_vector', query)` in `searchSubxeurons` (and optional searchPosts/searchComments). |

---

## 9. Summary

- **Schema:** Five tables in Supabase mirroring Sanity document types, with snake_case columns and FKs; body as jsonb; image as URL.
- **Naming:** Table names = current type names (user, post, subxeuron, comment, vote); keep application-facing field names (camelCase) via mapping or select aliases.
- **GROQ:** Each read is replaced by Supabase `from().select().eq().order()` or an RPC for complex trees/aggregates.
- **Mutations:** All Sanity create/patch/delete become Supabase insert/update; vote toggle logic unchanged.
- **Auth:** Clerk → Supabase Auth; `user` table = profile keyed by `auth.uid()`.
- **Images:** Store URLs in `image_url`; upload via Supabase Storage or S3.
- **Portable Text:** Unchanged structure in jsonb; same front-end rendering.
- **Search:** Full-text search via tsvector + GIN index on `subxeuron`, `post`, and optionally `comment`; use Supabase `.textSearch('search_vector', query)` for better performance than `ilike`.

Following this plan keeps your existing naming and behavior while moving to a single, scalable stack (Supabase) and removing Sanity and Clerk hosting costs.
