# Production QA — Security & Reliability Fixes
**Date:** 2026-03-03
**Scope:** Full codebase audit of Xeuron (Next.js 16, Supabase, AWS S3)

---

## Task 1 — Rotate Compromised Credentials
**Category:** Secrets Management
**Status:** ✅ Done manually

`.env.local` contained real production credentials (OpenAI, AWS IAM, Linear, Supabase).
All keys were rotated out-of-band. File confirmed excluded from version control via `.gitignore`.

---

## Task 2 — Fix Open Redirect in Auth Callback and Login
**Category:** Auth
**Files changed:**
- `lib/utils/redirect.ts` ← new
- `app/auth/callback/route.ts`
- `app/(auth)/login/page.tsx`

**Problem:** `?next=` and `?redirectTo=` query params were used verbatim in redirects after login, allowing `?redirectTo=https://evil.com` to send users to external sites post-authentication.

**Fix:** Added `safeRedirect()` utility that rejects any value that isn't a plain same-origin path (blocks absolute URLs, protocol-relative `//`, and backslash variants `/\`). Applied at every redirect entry point.

```ts
// lib/utils/redirect.ts
export function safeRedirect(url: string | null | undefined): string {
  if (!url) return '/'
  if (!url.startsWith('/')) return '/'
  if (url.startsWith('//')) return '/'
  if (url.startsWith('/\\')) return '/'
  return url
}
```

---

## Task 3 — Rate Limiting on Votes, Comments, Posts, Q&A, Polls
**Category:** Abuse Prevention
**Files changed:**
- `supabase/migrations/20260303100000_rate_limit.sql` ← new
- `lib/utils/rateLimit.ts` ← new
- `action/upvote.ts`
- `action/downvote.ts`
- `action/createComment.ts`
- `action/createPost.tsx`
- `action/createQuestion.ts`
- `action/createAnswer.ts`
- `action/submitPollVote.ts`
- `action/voteEventQA.ts`
- `action/createPublicationComment.ts`

**Problem:** Every mutation was a raw database write with no throttle. Logged-in users could script unlimited votes, comments, and posts.

**Fix:** Supabase-backed fixed-window rate limiter. A single `check_rate_limit(key, window_seconds, max_count)` RPC atomically increments and checks the counter, pruning stale windows on each call.

| Action | Limit |
|--------|-------|
| Votes (all types) | 30 per user per 60 s |
| Comments | 10 per user per 60 s |
| Posts | 5 per user per hour |
| Q&A questions | 10 per user per 60 s |
| Q&A answers | 10 per user per 60 s |
| Poll submissions | 5 per user per 60 s |

Fails **open** on DB errors so a Supabase hiccup never blocks legitimate users.

---

## Task 4 — Content Moderation Fails Closed
**Category:** Content Safety
**Files changed:**
- `action/createPost.tsx`

**Problem:** The AI moderation call (`gpt-4.1-mini`) was wrapped in a `try/catch` that silently continued on failure with `console.error("Continuing without moderation.")`. Every OpenAI outage let all content bypass review.

**Fix:** On moderation failure, the post is **soft-deleted** (rolled back) and a retryable error is returned to the user. Content never goes live without passing the moderation step.

```ts
try {
  await generateText({ model: openai("gpt-4.1-mini"), ... })
} catch {
  await deletePost(post._id) // roll back
  return { error: "Content review is temporarily unavailable. Please try again in a moment." }
}
```

---

## Task 5 — lock-event API Route Authorization
**Category:** Auth / Authorization
**Files changed:**
- `app/api/lock-event/route.ts`

**Problem 1:** The API route called the `lockEventContent` Server Action without first verifying the caller was authenticated. An unauthenticated request would reach the action layer with no session, likely silently failing rather than returning 401.

**Problem 2:** The `Referer` header was used verbatim as a redirect destination after locking — an open redirect via a header.

**Fix:**
- Added explicit `supabase.auth.getUser()` check at the top of the route handler; returns 401 if no session.
- Safe redirect: extracts only the `pathname` from the Referer URL and passes it through `safeRedirect()`.

---

## Task 6 — File Upload Size Limits and Magic-Byte Validation
**Category:** Input Validation
**Files changed:**
- `lib/s3.ts`

**Problem:** Uploads validated only the client-supplied `Content-Type` header (trivially spoofed). No file size limits were enforced in code. A `.exe` renamed `.jpg` with `Content-Type: image/jpeg` would pass.

**Fix:**

| Check | Images | PDFs |
|-------|--------|------|
| Size limit | 8 MB | 20 MB |
| Content-type | Strict regex | `=== 'application/pdf'` (was `.includes('pdf')`) |
| Magic bytes | JPEG `FF D8 FF`, PNG `89 50 4E 47`, GIF `47 49 46`, WebP `52 49 46 46` | `%PDF-` (`25 50 44 46`) |

---

## Task 7 — Fix N+1 Queries in Post Feed and Event Q&A
**Category:** Performance
**Files changed:**
- `lib/supabase/posts.ts`
- `lib/supabase/event-qa.ts`

**Problem:**
- `getPostsForSubxeuron`: sequential loop calling `getPostVotes()` per post = **2N round-trips** for N posts (one COUNT query each for upvotes and downvotes).
- `getQuestionsForEvent` / `getAnswersForQuestion`: `Promise.all` over N items each firing a separate vote query = **N parallel round-trips**.

**Fix:** Both replaced with a single `.in(ids)` batch query, then aggregated in memory.

```
Before: 10 posts → 21 DB queries
After:  10 posts →  2 DB queries
```

`event-qa.ts` introduces a shared `buildVoteMap()` helper that handles aggregation and per-user vote status in one pass over the rows.

---

## Task 8 — Remove console.log Leaks
**Category:** Sensitive Data / Logging
**Files changed:**
- `action/deletePost.ts`
- `action/deleteComment.ts`
- `action/createPost.tsx` (also fixed in Task 4)

**Problem:** `console.log(post)` and `console.log(post.author?._id, user?.id)` in delete actions emitted full post objects and user IDs to production stdout logs, which Vercel aggregates and may forward to third-party log services.

**Fix:** All `console.log` calls removed from action files. Only `console.error` for genuine error paths is retained (and only in the data layer, not actions).

---

## Task 9 — /api/track View-Count Inflation
**Category:** Abuse Prevention / Data Integrity
**Files changed:**
- `app/api/track/route.ts`

**Problem:** The page-view tracking endpoint accepted unauthenticated POST requests with no rate limiting and no `entityId` type validation. Bots could inflate view counts for any entity indefinitely.

**Fix:**
- Added IP-based rate limit: 60 inserts per IP per 60 s (silent 200 on breach — no signal to bots).
- Added `typeof entityId !== 'string'` type guard.
- IP extracted safely from `x-forwarded-for` (Vercel sets this).

---

## Task 10 — Email Notifications: Downgrade from Service Role + Send-Rate Limit
**Category:** Security / Resiliency
**Files changed:**
- `action/createComment.ts`
- `action/createAnswer.ts`
- `action/createPublicationComment.ts`

**Problem 1:** All three notification helpers used `getServiceClient()` (RLS-bypassing service role key) purely to look up a post/question author's email. Unnecessary privilege — if that code path has a bug, it has full database access.

**Problem 2:** No rate limit on email sends. 100 comments on one post = 100 emails to the author.

**Fix:**
- Replaced `getServiceClient()` with `await createClient()` (RLS-scoped session client). Authors can read their own content, so queries still resolve correctly.
- Added per-resource email rate limit via `checkRateLimit()`: **1 notification email per (resource, recipient) per hour**.

---

## Task 11 — Security Response Headers
**Category:** Defense in Depth
**Files changed:**
- `next.config.ts`

**Problem:** No security headers were set. Missing CSP, HSTS, X-Frame-Options, etc.

**Fix:** Added to all routes via `headers()` in `next.config.ts`:

| Header | Value | Effect |
|--------|-------|--------|
| `X-Frame-Options` | `DENY` | Blocks clickjacking |
| `X-Content-Type-Options` | `nosniff` | Stops MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No full URL leaked to third parties |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS enforced for 2 years |
| `Permissions-Policy` | camera, mic, geolocation, payment all off | Reduces attack surface |
| `Content-Security-Policy-Report-Only` | See config | Captures violations without breaking anything |

> **Next step for CSP:** Monitor browser console for CSP violation reports in production. Once the report stream is clean, change `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `next.config.ts` to enforce it.

---

## Task 12 — Loose Equality in Delete Authorization
**Category:** Auth / Correctness
**Files changed:**
- `action/deletePost.ts`
- `action/deleteComment.ts`

**Problem:** `post.author?._id != user._id` used loose inequality (`!=`), which performs type coercion. In authorization logic, a false-negative means privilege escalation.

**Fix:** Replaced with strict `!==` in both delete actions. The `console.log` statements above the checks were removed at the same time (see Task 8).

---

## Files Created / Changed Summary

| File | Change |
|------|--------|
| `lib/utils/redirect.ts` | New — `safeRedirect()` |
| `lib/utils/rateLimit.ts` | New — `checkRateLimit()` |
| `supabase/migrations/20260303100000_rate_limit.sql` | New — `rate_limit` table + RPC |
| `app/auth/callback/route.ts` | Open redirect fix |
| `app/(auth)/login/page.tsx` | Open redirect fix |
| `app/api/track/route.ts` | Rate limit + type guard |
| `app/api/lock-event/route.ts` | Auth gate + safe redirect |
| `next.config.ts` | Security headers |
| `lib/s3.ts` | Size limits + magic-byte checks |
| `lib/supabase/posts.ts` | N+1 fix |
| `lib/supabase/event-qa.ts` | N+1 fix |
| `action/upvote.ts` | Rate limit |
| `action/downvote.ts` | Rate limit |
| `action/createComment.ts` | Rate limit + email fix |
| `action/createPost.tsx` | Rate limit + moderation fail-closed + console.log removal |
| `action/createQuestion.ts` | Rate limit |
| `action/createAnswer.ts` | Rate limit + email fix |
| `action/submitPollVote.ts` | Rate limit |
| `action/voteEventQA.ts` | Rate limit |
| `action/createPublicationComment.ts` | Rate limit + email fix |
| `action/deletePost.ts` | console.log removal + strict equality |
| `action/deleteComment.ts` | console.log removal + strict equality |
