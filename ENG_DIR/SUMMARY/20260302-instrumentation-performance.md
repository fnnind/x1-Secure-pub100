# Instrumentation Performance Analysis
**Generated:** 2026-03-02 09:39:12
**Feature:** Feature_v1.1_Instrumentation
**Scope:** Latency impact (µs) of instrumentation on all mutations — with and without

---

## Assumptions

Same-region cloud deployment (e.g. Vercel + Supabase both on AWS us-east-1).

| Component | Unit Latency (µs) |
|---|---|
| `supabase.auth.getUser()` — HTTP to Supabase Auth service | 10,000 |
| SELECT user profile from `user` table | 5,000 |
| **`getUser()` total** (auth + profile, returning user) | **15,000** |
| Supabase SELECT single row (indexed) | 5,000 |
| Supabase INSERT | 5,000 |
| Supabase INSERT + SELECT with JOINs | 10,000 |
| Supabase UPDATE / UPSERT | 5,000 |
| Supabase batch INSERT | 6,000 |
| S3 upload (< 1 MB image) | 100,000 |
| Next.js server action handler overhead | 1,000 |
| `Promise.catch()` allocation (fire-and-forget) | 2 |
| Resend REST API (background, not user-facing) | 200,000 |

> All Supabase calls are **sequential** — each `await` blocks the next.
> Parallel calls via `Promise.all` cost `max(calls)` time.
> Cross-region deployment adds ~20,000–80,000 µs per Supabase round trip.

---

## Create Operations

| Operation | DB Calls (seq) | Without Instrumentation (µs) | With Instrumentation (µs) | Incremental (µs) | API Calls Added (instrumentation) |
|---|---|---|---|---|---|
| Create SubXeuron (no image) | 5 | 36,000 | 36,000 | **0** | `POST /api/track` — 16,000 µs, fired by `<TrackView>` client-side after page load, non-blocking |
| Create SubXeuron (with image) | 5 + S3 | 136,000 | 136,000 | **0** | same |
| Create Publication (no image, no DOI) | 6 | 37,000 | 37,000 | **0** | `POST /api/track` — client-side, non-blocking |
| Create Publication (no image, with DOI check) | 7 | 42,000 | 42,000 | **0** | same |
| Create Publication (with image) | 7 + S3 | 137,000–142,000 | 137,000–142,000 | **0** | same |
| Create Event — standalone | 3 | 26,000 | 26,000 | **0** | `POST /api/track` — client-side, non-blocking |
| Create Event — linked, user is pub creator | 4 | 31,000 | 31,000 | **0** | same |
| Create Event — linked, user is collaborator | 5 | 36,000 | 36,000 | **0** | same |
| Create Post | 3 | 21,000 | 21,000 | **0** | `POST /api/track` — client-side, non-blocking |

### Breakdown — Create SubXeuron (no image)

```
Action overhead              1,000 µs
getUser()                   15,000 µs  ← auth.getUser() HTTP + SELECT user profile
SELECT title uniqueness       5,000 µs
SELECT slug uniqueness        5,000 µs
INSERT subxeuron + SELECT+JOIN 10,000 µs
──────────────────────────────────────
Total                        36,000 µs
```

### Breakdown — Create Publication (no image, with DOI)

```
Action overhead              1,000 µs
getUser()                   15,000 µs
SELECT slug uniqueness        5,000 µs
SELECT DOI uniqueness         5,000 µs
INSERT publication            5,000 µs
SELECT creator username       5,000 µs
INSERT publication_author     6,000 µs  ← batch
──────────────────────────────────────
Total                        42,000 µs
```

### Breakdown — Create Event (linked, pub creator)

```
Action overhead              1,000 µs
getUser()                   15,000 µs
SELECT publication.creator_id 5,000 µs
INSERT event + SELECT        10,000 µs
──────────────────────────────────────
Total                        31,000 µs
```

---

## Vote Operations

| Operation | DB Calls (seq) | Without Instrumentation (µs) | With Instrumentation (µs) | Incremental (µs) | API Calls Added |
|---|---|---|---|---|---|
| Upvote / Downvote Post (first vote) | 4 | 26,000 | 26,000 | **0** | — |
| Upvote / Downvote Post (toggle / change) | 4 | 26,000 | 26,000 | **0** | — |
| Upvote / Downvote Comment | 4 | 26,000 | 26,000 | **0** | — |
| Vote Q&A Question (upvote / downvote) | 3 | 22,000 | 22,000 | **0** | — |
| Vote Q&A Question (remove vote) | 3 | 21,000 | 21,000 | **0** | — |
| Vote Q&A Answer (upvote / downvote) | 3 | 22,000 | 22,000 | **0** | — |

### Breakdown — Upvote / Downvote Post

```
Action overhead              1,000 µs
getUser()                   15,000 µs
SELECT existing vote          5,000 µs  ← always runs; check before INSERT or UPDATE
INSERT or UPDATE vote         5,000 µs
──────────────────────────────────────
Total                        26,000 µs
```

> `votes.ts` uses **SELECT → UPDATE/INSERT** sequentially (not a native UPSERT), so it always costs 2 DB round trips regardless of first-vote or toggle.

---

## Comment / Answer Operations

| Operation | DB Calls (seq) | Without Instrumentation (µs) | With Instrumentation (µs) | Incremental (µs) | API Calls Added (instrumentation) |
|---|---|---|---|---|---|
| Create Comment | 3 | 21,000 | 21,002 | **+2** | BG: `SELECT post+author` (10,000 µs) + `POST api.resend.com` (200,000 µs) — non-blocking |
| Create Q&A Question (no @mentions) | 4 | 26,000 | 26,000 | **0** | — |
| Create Q&A Question (with @mentions) | 6 | 37,000 | 37,000 | **0** | — |
| Create Q&A Answer (no @mentions) | 5 | 31,000 | 31,002 | **+2** | BG: `SELECT question` + `SELECT event` + `SELECT publication` (15,000 µs) + `POST api.resend.com` (200,000 µs) — non-blocking |
| Create Q&A Answer (with @mentions) | 7 | 42,000 | 42,002 | **+2** | same BG |

### Breakdown — Create Comment

```
WITHOUT instrumentation:
  Action overhead              1,000 µs
  getUser()                   15,000 µs
  INSERT comment               5,000 µs
  ──────────────────────────────────────
  Total                        21,000 µs

WITH instrumentation:
  Action overhead              1,000 µs
  getUser()                   15,000 µs
  INSERT comment               5,000 µs
  Promise.catch() allocation       2 µs  ← only added cost
  ──────────────────────────────────────
  Total                        21,002 µs  (+2 µs)

Background (non-blocking, after response returns to client):
  SELECT post + author        10,000 µs
  POST api.resend.com        200,000 µs
  ──────────────────────────────────────
  BG total                   210,000 µs  (user never waits for this)
```

### Breakdown — Create Q&A Answer (no @mentions)

```
WITHOUT instrumentation:
  Action overhead              1,000 µs
  getUser()                   15,000 µs
  SELECT event_question        5,000 µs
  SELECT event (qa_locked)     5,000 µs
  INSERT event_answer          5,000 µs
  ──────────────────────────────────────
  Total                        31,000 µs

WITH instrumentation:
  (same) + Promise.catch()         2 µs
  ──────────────────────────────────────
  Total                        31,002 µs  (+2 µs)

Background (non-blocking):
  SELECT event_question        5,000 µs
  SELECT event                 5,000 µs
  SELECT publication (URL)     5,000 µs
  POST api.resend.com        200,000 µs
  ──────────────────────────────────────
  BG total                   215,000 µs
```

---

## Poll Operations

| Operation | DB Calls (seq) | Without Instrumentation (µs) | With Instrumentation (µs) | Incremental (µs) | API Calls Added |
|---|---|---|---|---|---|
| Create Poll (2+ options) | 5 | 32,000 | 32,000 | **0** | — |
| Submit Poll Vote (single-choice, no prior vote) | 5 | 31,000 | 31,000 | **0** | — |
| Submit Poll Vote (multi-choice) | 4 | 26,000 | 26,000 | **0** | — |

### Breakdown — Create Poll

```
Action overhead              1,000 µs
getUser()                   15,000 µs
SELECT event (creator, lock)  5,000 µs
INSERT event_poll             5,000 µs
INSERT poll_options (batch)   6,000 µs
──────────────────────────────────────
Total                        32,000 µs
```

### Breakdown — Submit Poll Vote (single-choice)

```
Action overhead              1,000 µs
getUser()                   15,000 µs
SELECT poll (locked, closes_at) 5,000 µs
SELECT existing vote          5,000 µs
INSERT event_poll_vote        5,000 µs
──────────────────────────────────────
Total                        31,000 µs
```

---

## New Infrastructure — Tracking Endpoint

These did not exist before instrumentation.

| Operation | DB Calls | Without Instrumentation (µs) | With Instrumentation (µs) | Incremental (µs) | Notes |
|---|---|---|---|---|---|
| `POST /api/track` (page view record) | 2 | — (new) | **16,000** | **+16,000** | Fired by `<TrackView>` via `useEffect` after browser render; separate browser HTTP request, does not block navigation or any server action |
| `GET /popular` — no view data yet | 4 parallel → 4 parallel | 6,000 | 9,000 | **+3,000** | +2 analytics SELECTs on empty `page_view` table, then fallback to same queries as before |
| `GET /popular` — modest data (≤ 1k rows) | 4 parallel → 4 parallel | 6,000 | 11,000 | **+5,000** | Analytics aggregate in JS + ID-based re-fetch |
| `GET /popular` — high traffic (10k+ rows) | 4 parallel → 4 parallel | 6,000 | 20,000–40,000 | **+14,000–34,000** | Analytics scans full `page_view` window, aggregates in JS — degrades at scale |

### Breakdown — POST /api/track

```
Handler overhead             1,000 µs
supabase.auth.getUser()     10,000 µs  ← nullable; anonymous views allowed
INSERT page_view             5,000 µs
──────────────────────────────────────
Total                        16,000 µs
```

### Breakdown — GET /popular (with modest data)

```
WITHOUT instrumentation (Promise.all — all parallel):
  getSubxeurons(page)          5,000 µs ─┐
  getPublications(page)        5,000 µs  ├─ parallel → max = 5,000 µs
  getSubxeuronsCount()         3,000 µs  │
  getPublicationsCount()       3,000 µs ─┘
  Handler overhead             1,000 µs
  ──────────────────────────────────────
  Total                         6,000 µs

WITH instrumentation:
  Phase 1 — parallel analytics queries:
    getPopularEntityIds('subxeuron', period) 5,000 µs ─┐ parallel → 5,000 µs
    getPopularEntityIds('publication', period) 5,000 µs ─┘

  Phase 2 — parallel ID-based fetches:
    getSubxeuronsByIds(slice)    6,000 µs ─┐ parallel → 6,000 µs
    getPublicationsByIds(slice)  6,000 µs ─┘

  Handler overhead             1,000 µs
  ──────────────────────────────────────
  Total                        12,000 µs  (+6,000 µs)
```

---

## Summary — Incremental Cost by Category

| Category | User-Facing Incremental Cost | Root Cause |
|---|---|---|
| Create SubXeuron / Publication / Event / Post | **0 µs** | `<TrackView>` fires client-side via `useEffect` after page render — entirely decoupled from server action |
| Vote Post / Comment | **0 µs** | No instrumentation touches vote actions |
| Vote Q&A Question / Answer | **0 µs** | No instrumentation touches vote actions |
| Create Comment | **+2 µs** | `Promise.catch()` object allocation for fire-and-forget email |
| Create Q&A Answer | **+2 µs** | Same |
| Create Q&A Question / Create Poll / Submit Poll Vote | **0 µs** | No instrumentation touches these actions |
| `POST /api/track` (new endpoint) | **+16,000 µs** | New endpoint; runs as a background browser request, never blocks navigation |
| `GET /popular` (no data) | **+3,000 µs** | Two extra analytics SELECTs on empty table |
| `GET /popular` (modest data) | **+5,000–6,000 µs** | Analytics queries + ID-based re-fetch |
| `GET /popular` (high traffic, 10k+ views) | **+14,000–34,000 µs** | JS-side aggregation of large `page_view` result sets |

---

## Why Mutation Actions Show 0 µs Incremental

Instrumentation was implemented with two non-blocking patterns:

| Pattern | Applied To | User-Facing Latency Added |
|---|---|---|
| `<TrackView>` client component | Page views (subxeuron, publication, event) | **0 µs** — `useEffect` fires after React hydration; browser sends `POST /api/track` as a separate fire-and-forget fetch that the user never waits for |
| `sendNotifyPostAuthor().catch(()=>{})` | `createComment` | **+2 µs** — only the cost of allocating a `Promise` object; email work executes in the Node.js event loop after the server action response is already sent |
| `sendNotifyQuestionAuthor().catch(()=>{})` | `createAnswer` | **+2 µs** — same |

---

## Scale Risk: /popular Page Analytics Query

The current implementation of `getPopularEntityIds()` in `lib/supabase/analytics.ts`:

```ts
// Fetches ALL rows in period, then aggregates in JS
const { data } = await supabase
  .from('page_view')
  .select('entity_id')
  .eq('entity_type', entityType)
  .gte('created_at', since)

// JS-side GROUP BY
const counts = new Map<string, number>()
for (const row of data) {
  counts.set(row.entity_id, (counts.get(row.entity_id) ?? 0) + 1)
}
```

| `page_view` rows in window | Estimated query latency |
|---|---|
| 0 (new install) | ~3,000 µs |
| 1,000 | ~5,000 µs |
| 10,000 | ~15,000 µs |
| 100,000 | ~50,000–100,000 µs |

### Recommended Fix — Push GROUP BY into the Database

Replace JS aggregation with a Supabase RPC function that does server-side `GROUP BY`:

```sql
-- supabase/migrations/YYYYMMDD_popular_rpc.sql
CREATE OR REPLACE FUNCTION get_popular_entities(
  p_entity_type text,
  p_since       timestamptz,
  p_limit       int DEFAULT 20
)
RETURNS TABLE (entity_id uuid, view_count bigint)
LANGUAGE sql STABLE AS \$\$
  SELECT entity_id, COUNT(*) AS view_count
  FROM public.page_view
  WHERE entity_type = p_entity_type
    AND created_at >= p_since
  GROUP BY entity_id
  ORDER BY view_count DESC
  LIMIT p_limit;
\$\$;
```

```ts
// lib/supabase/analytics.ts — updated call
const { data } = await supabase.rpc('get_popular_entities', {
  p_entity_type: entityType,
  p_since: since,
  p_limit: limit,
})
```

This brings `/popular` page latency to **~6,000–8,000 µs at any traffic volume** because the database engine uses the `(entity_type, entity_id)` + `created_at` indexes efficiently rather than returning all rows to the application layer.