# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server at localhost:3000
pnpm build     # Production build
pnpm lint      # Run ESLint
```

Package manager: **pnpm** (not npm or yarn).

## Architecture Overview

**Xeuron** is a Next.js 16 (App Router) platform for scientific collaboration — think Reddit for researchers, with posts, publications, events, Q&A, and polls.

### Route Groups

- `app/(auth)/` — Unauthenticated pages: login, signup, forgot-password, update-password
- `app/(app)/` — Authenticated app shell with sidebar + header layout, wraps all main routes
  - `/x/[slug]` — SubXeuron community pages
  - `/p/[slug]` — Publication detail pages
  - `/u/[slug]` — User profile pages
  - `/events/`, `/hot/`, `/popular/`, `/search/`, `/subxeurons/`, `/publications/` — Feed/list pages
  - `/create-post/`, `/create-publication/` — Creation flows

### Data Layer (`lib/supabase/`)

All database access goes through Supabase. The data layer has a strict three-layer pattern:

1. **`server.ts` / `client.ts` / `server-client.ts`** — Supabase client factories. Use `createClient()` (RLS-enforced) for almost everything. Use `getServiceClient()` only for admin operations that must bypass RLS (e.g., `reportContent`).
2. **`mappers.ts`** — Transforms snake_case DB rows → camelCase `App*` types. All DB query results must go through a mapper before use in the app.
3. **`types.ts`** — Canonical `App*` TypeScript types used everywhere in the app (e.g., `AppPost`, `AppPublication`, `AppEvent`). DB types are local to mappers only.

Query files by domain: `posts.ts`, `publications.ts`, `events.ts`, `event-qa.ts`, `event-polls.ts`, `event-favorites.ts`, `comments.ts`, `subxeurons.ts`, `votes.ts`, `user.ts`, `tags.ts`, `analytics.ts`.

`mutations.ts` — All write operations (create/update/delete). Authorization checks are embedded in mutations (e.g., only event creator can create polls, only pub creator/collaborator can create events).

### Server Actions (`action/`)

Next.js Server Actions are the mutation entry points called from Client Components. Each action file wraps one or more mutation functions from `lib/supabase/mutations.ts`. Actions call `revalidatePath` after mutations.

### Auth

`AuthProvider` / `useUser()` (from `lib/supabase/auth-context.tsx`) — client-side auth context wrapping the `(app)` layout. Session management via Supabase SSR middleware (`middleware.ts` → `lib/supabase/middleware.ts`).

### ID Generation

**Always use `generateId()` from `@/lib/utils/id`** for all database entity IDs. Direct imports of `uuid` v7 are ESLint-banned elsewhere. UUIDv7 is used for B-tree locality in Postgres.

### Formatting (Prettier)

- No semicolons
- Single quotes
- Print width: 100
- No bracket spacing

### Image Storage

User-uploaded images go to AWS S3 via `lib/s3.ts`. Supabase storage bucket is also configured. `next.config.ts` allows images from `yvbykhjypklymjlrbygw.supabase.co` and `content.xeuron.net`. Server Action body size limit is 20MB.

### Key Conventions

- Supabase tables use `snake_case`; app types use `camelCase` with `_id` (not `id`) for primary keys.
- Soft-delete pattern: posts/comments are never hard-deleted; `is_deleted: true` + content replaced with `[DELETED]`.
- Publication source URLs are validated against an allowlist of academic domains (arxiv, doi.org, nature.com, etc.) in `mutations.ts`.

## Engineering Plans and Summaries

**Always write session plans and summaries to `./ENG_DIR/SUMMARY/`** as markdown files, prefixed with a timestamp in the format `YYYYMMDDHHMMSS` (e.g., `20260305120000_session_summary.md`).

This applies to:
- End-of-session summaries
- Feature or architectural plans before implementation
- Any significant design decision documents
