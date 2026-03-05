# Xeuron — Session Context Export
> Generated: 2026-03-05. Copy this file to the new machine and place it anywhere convenient for reference.

---

## 1. Project Overview

**Xeuron** is a Next.js 16 (App Router) platform for scientific collaboration — Reddit for researchers, with posts, publications, events, Q&A, and polls.

- **Repo path (current machine):** `/Users/m4/NEURON_DIR/BEAUTIFUL_UI/SECURE_m1cursor`
- **Package manager:** pnpm
- **Git branch:** main

### Recent commit history
```
8e64214  fixed SUPABASE_SERVICE_ROLE_KEY calls the RPC via createClient() (no service key needed)
f8a5115  fix all vulnerability (security, resiliency) found by production-qa
62be9d5  Production QA — Findings Summary
ec292cc  adding all codes: subxeuron/pub/event, vote/comment/post, UI, sidebar
a1789df  first commit + .claude config
```

---

## 2. Commands

```bash
pnpm dev       # Start development server at localhost:3000
pnpm build     # Production build
pnpm lint      # Run ESLint
```

---

## 3. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5.9.3 |
| Database / Auth | Supabase (postgres + supabase-js 2.97, @supabase/ssr 0.5.2) |
| Image storage | AWS S3 (`@aws-sdk/client-s3`) |
| UI | Tailwind CSS v4, Radix UI primitives, lucide-react |
| AI | `ai` SDK, `@ai-sdk/openai`, `@ai-sdk/react` |
| Validation | Zod v4 |
| Formatting | Prettier (no semi, single quotes, printWidth 100, no bracketSpacing) |

---

## 4. Architecture

### Route Groups
```
app/(auth)/          — login, signup, forgot-password, update-password
app/(app)/           — authenticated shell (sidebar + header)
  /x/[slug]          — SubXeuron community pages
  /p/[slug]          — Publication detail pages
  /u/[slug]          — User profile pages
  /events/           — Events feed
  /hot/              — Hot feed
  /popular/          — Popular feed
  /search/           — Search
  /subxeurons/       — SubXeuron list
  /publications/     — Publications list
  /create-post/      — Post creation
  /create-publication/ — Publication creation
```

### Data Layer (`lib/supabase/`) — Three-layer pattern
1. **Client factories** — `server.ts` / `client.ts` / `server-client.ts`
   - Use `createClient()` (RLS-enforced) for almost everything
   - Use `getServiceClient()` ONLY for admin ops that must bypass RLS (e.g. `reportContent`)
2. **Mappers** — `mappers.ts` transforms snake_case DB rows → camelCase `App*` types
3. **Types** — `types.ts` holds canonical `App*` TypeScript types (`AppPost`, `AppPublication`, `AppEvent`, etc.)

**Domain query files:** `posts.ts`, `publications.ts`, `events.ts`, `event-qa.ts`, `event-polls.ts`, `event-favorites.ts`, `comments.ts`, `subxeurons.ts`, `votes.ts`, `user.ts`, `tags.ts`, `analytics.ts`

**`mutations.ts`** — All write ops (create/update/delete). Auth checks are embedded here.

### Server Actions (`action/`)
- Mutation entry points called from Client Components
- Each wraps one or more functions from `lib/supabase/mutations.ts`
- Must call `revalidatePath` after mutations

### Auth
- `AuthProvider` / `useUser()` from `lib/supabase/auth-context.tsx`
- Session management via Supabase SSR middleware: `middleware.ts` → `lib/supabase/middleware.ts`

---

## 5. Key Conventions

| Convention | Rule |
|---|---|
| ID generation | **Always use `generateId()` from `@/lib/utils/id`** (UUIDv7, B-tree locality). Direct `uuid` v7 imports are ESLint-banned. |
| Naming | Supabase tables: `snake_case`. App types: `camelCase` with `_id` suffix (not `id`) for PKs. |
| Soft-delete | Posts/comments never hard-deleted. `is_deleted: true` + content replaced with `[DELETED]`. |
| Source URLs | Publication source URLs validated against allowlist of academic domains (arxiv, doi.org, nature.com, etc.) in `mutations.ts`. |
| Image storage | User-uploaded images → AWS S3 via `lib/s3.ts`. `next.config.ts` allows images from `yvbykhjypklymjlrbygw.supabase.co` and `content.xeuron.net`. |
| Body size | Server Action body size limit: 20 MB. |

---

## 6. Database Schema (Supabase / Postgres)

### `user`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| username | text NOT NULL | |
| email | text NOT NULL | |
| image_url | text | optional |
| joined_at | timestamptz | default now() |
| is_reported | boolean | default false |
| is_deleted | boolean | default false |
| created_at / updated_at | timestamptz | |

### `subxeuron`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title, slug (UNIQUE) | text | |
| description | text | |
| moderator_id | uuid FK→user | |
| parent_subxeuron_id | uuid FK→subxeuron | nullable |
| body | jsonb | Portable Text blocks |
| pdf_url, source_url | text | source_url validated |
| image_url, image_alt | text | |
| search_vector | tsvector | GIN index for FTS |
| created_at / updated_at | timestamptz | |

### `post`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title, original_title | text | original preserved for soft-delete |
| author_id | uuid FK→user | |
| subxeuron_id | uuid FK→subxeuron | |
| body, original_body | jsonb | Portable Text |
| image_url, image_alt | text | |
| published_at | timestamptz | |
| is_reported, is_deleted | boolean | |
| search_vector | tsvector | GIN index |

### `comment`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| content | text NOT NULL | |
| author_id | uuid FK→user | |
| post_id | uuid FK→post | |
| parent_comment_id | uuid FK→comment | nullable (threaded replies) |
| is_reported, is_deleted | boolean | |
| search_vector | tsvector | optional GIN index |

### `vote`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→user | |
| vote_type | text | CHECK in ('upvote','downvote') |
| post_id | uuid FK→post | nullable |
| comment_id | uuid FK→comment | nullable |
| is_deleted | boolean | |
| Constraint | | exactly one of post_id or comment_id |
| Unique | | (user_id, post_id) and (user_id, comment_id) via partial unique indexes |

### Full-text Search
- `search_vector` tsvector column + GIN index on `subxeuron`, `post`, optionally `comment`
- Kept in sync via Postgres triggers (on INSERT/UPDATE of title/description/body/content)
- Query using Supabase `.textSearch('search_vector', term, { type: 'websearch', config: 'english' })`
- Migration: `supabase/migrations/20260219120000_add_full_text_search_tsvector_gin.sql`

---

## 7. Security Fixes Applied (production-qa — commit f8a5115)

| # | Task | What was done |
|---|---|---|
| 1 | Rotate Compromised Credentials | Rotated exposed keys |
| 2 | Open Redirect in Auth Callback | `safeRedirect(url)` — rejects anything not starting with `/` |
| 3 | Rate Limiting | Votes, Comments, Posts, Q&A, Polls |
| 4 | Content Moderation Fails Closed | Moderation errors now block content (fail-closed) |
| 5 | lock-event API Route Auth | Authorization enforced on lock-event endpoint |
| 6 | File Upload Limits | Size limits + magic-byte validation on uploads |
| 7 | N+1 Queries | Fixed in Post Feed and Event Q&A |
| 8 | console.log Leaks | Removed |
| 9 | /api/track View-Count Inflation | Fixed; also fixed in Task 4 |
| 10 | Email Notifications | Downgraded from service role + send-rate limit |
| 11 | Security Response Headers | Added |
| 12 | Loose Equality in Delete Auth | Strict equality (`===`) |

Also: `getServiceClient()` (service role) replaced by `createClient()` + RPC for most uses (commit 8e64214).

---

## 8. Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://yvbykhjypklymjlrbygw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role — server-only, never expose to client>
# AWS S3
AWS_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

---

## 9. Modified Files (uncommitted at export time)

```
action/createPost.tsx
app/(app)/create-post/page.tsx
app/(app)/events/[eventId]/page.tsx
app/(app)/p/[slug]/events/[eventId]/page.tsx
app/(app)/p/[slug]/page.tsx
app/(app)/x/[slug]/page.tsx
components/event/EventTabs.tsx
components/header/Header.tsx
components/post/CreatePostForm.tsx
components/post/Post.tsx
components/publication/tabs/DetailsTab.tsx
components/publication/tabs/PapersTab.tsx
lib/supabase/mutations.ts
lib/supabase/posts.ts
supabase/migrations/20260303300000_post_context.sql  (untracked)
```

---

## 10. Migration History (Sanity + Clerk → Supabase)

The project was originally built with Sanity (CMS) and Clerk (auth), then fully migrated to Supabase for both database and auth. Full migration plan is in `docs/MIGRATION_SANITY_CLERK_TO_SUPABASE.md`.

Key decisions:
- Table names mirror Sanity type names: `user`, `post`, `subxeuron`, `comment`, `vote`
- Body stored as `jsonb` Portable Text — same block structure, same frontend renderer
- Images migrated to S3 URLs stored in `image_url` column
- Auth: `auth.uid()` = `user.id` (profile table keyed by Supabase Auth user id)
- All GROQ read queries replaced with Supabase `from().select()` equivalents
- Complex aggregates (vote counts, comment trees) handled via Postgres RPCs

---

## 11. Setup on New Machine

```bash
# 1. Clone / copy repo
cd /path/to/project

# 2. Install dependencies
pnpm install

# 3. Set env vars
cp .env.local.example .env.local   # then fill in values from section 8

# 4. Apply any pending migrations
supabase db push
# or
supabase migration up

# 5. Run dev server
pnpm dev
```

---

## 12. CLAUDE.md Instructions Summary (for Claude Code on new machine)

- Package manager: **pnpm**
- Always use `generateId()` from `@/lib/utils/id` for IDs (never import uuid directly)
- Use `createClient()` (RLS) by default; `getServiceClient()` only for admin bypass
- All DB results must pass through `mappers.ts` before use
- Prettier: no semicolons, single quotes, printWidth 100, no bracket spacing
- Soft-delete: never hard-delete posts/comments
- Server Actions must call `revalidatePath` after mutations
