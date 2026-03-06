# DESIGN: Publication Events Feature

**Status:** Design / Pre-implementation
**Author:** Engineering
**Parent feature:** `DESIGN_CREATE_Pub.md`
**Route pattern:** `/p/[pubSlug]/events/[eventId]`

---

## 1. Overview

Every **Publication** can have multiple child **Events** — real-world or virtual gatherings where the publication was presented, discussed, or referenced (e.g. an IEEE conference, a lab meetup, a Zoom seminar). Each event has:

- Venue / location metadata
- Multiple URLs (conference site, registration, recording, slides, etc.)
- A **Q&A board** — any logged-in user can post questions and answers; all voteable and sortable
- **Polls** — event creator creates time-boxed polls; login required to vote; auto-close at `closes_at`
- **User mentions** — `@username` or `/u/user_id` tagging in questions and answers
- Locking controls — creator can lock Q&A and/or polls at any time

**Design principle:** Events are modeled after a live conference session with async participation. The Q&A and Poll systems are deliberately lightweight — not a full forum — so they can be built quickly and extended in v2.

---

## 2. URL Structure

| URL | Description |
|-----|-------------|
| `/p/[pubSlug]/events` | All events for a publication |
| `/p/[pubSlug]/events/[eventId]` | Single event detail (Q&A, polls, info) |
| `/p/[pubSlug]/events/create` | Create event form (pub creator/collaborator only) |
| `/p/[pubSlug]/events/[eventId]/edit` | Edit event (event creator only) |

`[eventId]` is the UUID of the event (or a generated short slug for readability — see section 3.1).

---

## 3. Database Schema

### 3.1 `event` table

```sql
CREATE TABLE IF NOT EXISTS public.event (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),  -- uuidv7() after migration
  publication_id      uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  creator_id          uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,

  -- Identity
  title               text        NOT NULL,                  -- e.g. "ICRA 2026 Presentation"
  slug                text        NOT NULL,                  -- URL-safe, scoped to publication
  description         text,

  -- Event type
  event_type          text        NOT NULL DEFAULT 'conference'
                                  CHECK (event_type IN (
                                    'conference',
                                    'meetup',
                                    'presentation',
                                    'zoom',
                                    'webinar',
                                    'workshop',
                                    'symposium',
                                    'seminar',
                                    'poster_session',
                                    'panel',
                                    'other'
                                  )),
  event_type_custom   text,       -- populated only when event_type = 'other'; creator-defined label

  -- Location
  venue               text        NOT NULL,                  -- e.g. "Austria Center Vienna"
  city                text,
  region              text,                                  -- state / province
  country             text,
  is_virtual          boolean     NOT NULL DEFAULT false,    -- true = online-only

  -- Dates & time
  event_date          date        NOT NULL,                  -- single day OR start of multi-day
  start_date          date,                                  -- NULL for single-day events
  end_date            date,                                  -- NULL for single-day events
  event_time          time,                                  -- local start time (optional)
  timezone            text        NOT NULL DEFAULT 'UTC',    -- IANA tz e.g. 'Europe/Vienna'

  -- Primary URLs (kept denormalized for fast rendering; full list in event_url)
  conference_url      text,                                  -- main conference / event website
  recorded_video_url  text,                                  -- editable post-event by creator

  -- Moderation controls
  is_qa_locked        boolean     NOT NULL DEFAULT false,    -- locks all Q&A when true
  is_poll_locked      boolean     NOT NULL DEFAULT false,    -- locks all polls when true
  is_deleted          boolean     NOT NULL DEFAULT false,

  search_vector       tsvector,                              -- GIN synced by trigger

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz          DEFAULT now(),

  CONSTRAINT event_slug_pub_unique UNIQUE (publication_id, slug)
);

CREATE INDEX IF NOT EXISTS event_publication_id_idx   ON public.event (publication_id);
CREATE INDEX IF NOT EXISTS event_creator_id_idx       ON public.event (creator_id);
CREATE INDEX IF NOT EXISTS event_event_date_idx       ON public.event (event_date DESC);
CREATE INDEX IF NOT EXISTS event_type_idx             ON public.event (event_type);
CREATE INDEX IF NOT EXISTS event_search_vector_idx    ON public.event USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS event_is_deleted_idx       ON public.event (is_deleted) WHERE is_deleted = false;
```

**Notes:**
- `slug` is scoped to `publication_id` (UNIQUE together) — `/p/deep-learning-survey/events/icra-2026`
- `recorded_video_url` is intentionally kept on the parent row (not only in `event_url`) so it is prominently shown in the event header and editable after the event
- `timezone` uses IANA format to support accurate countdown timers and local time display
- `is_virtual = true` allows omitting `venue` or setting venue to e.g. "Zoom" / "Google Meet"
- Single-day events: `start_date = NULL`, `end_date = NULL`, `event_date` = the day
- Multi-day events: `event_date` = first day, `start_date` = first day, `end_date` = last day (consistent with ICRA example: June 1–5 2026)

---

### 3.2 `event_url` table

Supports multiple URLs per event with typed labels.

```sql
CREATE TABLE IF NOT EXISTS public.event_url (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  url_type    text  NOT NULL DEFAULT 'other'
                    CHECK (url_type IN (
                      'conference',
                      'recorded_video',
                      'registration',
                      'livestream',
                      'slides',
                      'paper_pdf',
                      'proceedings',
                      'other'
                    )),
  url         text  NOT NULL,
  label       text,                            -- optional display label overriding url_type
  added_by    uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_url_event_id_idx ON public.event_url (event_id);
```

**Notes:**
- The primary `conference_url` and `recorded_video_url` on the `event` row are the "featured" URLs; `event_url` stores additional / supplementary links
- Only the event creator (or accepted publication collaborators) can add URLs
- `recorded_video_url` on the `event` table is editable by the event creator post-event without needing to touch `event_url`

---

### 3.3 `event_question` table (Q&A)

```sql
CREATE TABLE IF NOT EXISTS public.event_question (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  author_id   uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  content     text  NOT NULL,    -- supports @username and /u/user_id mention syntax
  is_pinned   boolean NOT NULL DEFAULT false,  -- event creator can pin top question
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_question_event_id_idx    ON public.event_question (event_id);
CREATE INDEX IF NOT EXISTS event_question_author_id_idx   ON public.event_question (author_id);
CREATE INDEX IF NOT EXISTS event_question_created_at_idx  ON public.event_question (created_at DESC);
CREATE INDEX IF NOT EXISTS event_question_is_deleted_idx  ON public.event_question (is_deleted) WHERE is_deleted = false;
```

**Sort modes (computed at query time, not stored):**
- **Top Votes** (default): `(upvotes - downvotes) DESC`, then `created_at ASC`
- **Most Recent**: `created_at DESC`
- **Pinned First**: `is_pinned DESC`, then Top Votes

---

### 3.4 `event_question_vote` table

```sql
CREATE TABLE IF NOT EXISTS public.event_question_vote (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid  NOT NULL REFERENCES public.event_question(id) ON DELETE CASCADE,
  user_id      uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type    text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz          DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_qvote_unique ON public.event_question_vote (question_id, user_id);
CREATE INDEX IF NOT EXISTS event_qvote_question_id_idx ON public.event_question_vote (question_id);
```

**Notes:**
- One vote per (question, user) — update `vote_type` to change vote, delete to un-vote
- Mirrors the existing `vote` table pattern in the codebase

---

### 3.5 `event_answer` table

```sql
CREATE TABLE IF NOT EXISTS public.event_answer (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid  NOT NULL REFERENCES public.event_question(id) ON DELETE CASCADE,
  author_id    uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  content      text  NOT NULL,   -- supports @username and /u/user_id mentions
  is_accepted  boolean NOT NULL DEFAULT false,  -- event creator/question author can mark accepted answer
  is_deleted   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_answer_question_id_idx   ON public.event_answer (question_id);
CREATE INDEX IF NOT EXISTS event_answer_author_id_idx     ON public.event_answer (author_id);
CREATE INDEX IF NOT EXISTS event_answer_created_at_idx    ON public.event_answer (created_at DESC);
```

**Sort modes:**
- **Highest Vote** (default): `(upvotes - downvotes) DESC`
- **Most Recent**: `created_at DESC`
- **Accepted First**: `is_accepted DESC`, then Highest Vote

---

### 3.6 `event_answer_vote` table

```sql
CREATE TABLE IF NOT EXISTS public.event_answer_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id   uuid  NOT NULL REFERENCES public.event_answer(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type   text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz          DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_avote_unique ON public.event_answer_vote (answer_id, user_id);
CREATE INDEX IF NOT EXISTS event_avote_answer_id_idx ON public.event_answer_vote (answer_id);
```

---

### 3.7 `event_poll` table

```sql
CREATE TABLE IF NOT EXISTS public.event_poll (
  id                    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              uuid  NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
  creator_id            uuid  NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  question              text  NOT NULL,
  description           text,                             -- optional context / instructions
  allow_multiple_choice boolean NOT NULL DEFAULT false,  -- single-choice by default
  closes_at             timestamptz NOT NULL,             -- required; auto-locks after this time
  is_locked             boolean NOT NULL DEFAULT false,   -- creator can lock early (before closes_at)
  show_results_before_close boolean NOT NULL DEFAULT true, -- toggle: hide results until close?
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_poll_event_id_idx     ON public.event_poll (event_id);
CREATE INDEX IF NOT EXISTS event_poll_creator_id_idx   ON public.event_poll (creator_id);
CREATE INDEX IF NOT EXISTS event_poll_closes_at_idx    ON public.event_poll (closes_at);
```

**Poll is effectively locked when:** `is_locked = true` OR `now() >= closes_at`
This is a computed condition — no background job needed. The Service Layer checks both conditions before allowing a vote insert.

**`show_results_before_close`:** When `false`, results are hidden to non-creators until `closes_at` passes. This prevents anchoring bias in real-time votes.

---

### 3.8 `event_poll_option` table

```sql
CREATE TABLE IF NOT EXISTS public.event_poll_option (
  id            uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       uuid     NOT NULL REFERENCES public.event_poll(id) ON DELETE CASCADE,
  option_text   text     NOT NULL,
  option_order  smallint NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_poll_option_poll_id_idx ON public.event_poll_option (poll_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_poll_option_order_unique
  ON public.event_poll_option (poll_id, option_order);
```

---

### 3.9 `event_poll_vote` table

```sql
CREATE TABLE IF NOT EXISTS public.event_poll_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid  NOT NULL REFERENCES public.event_poll(id) ON DELETE CASCADE,
  option_id   uuid  NOT NULL REFERENCES public.event_poll_option(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- For single-choice polls: one vote per (poll, user)
CREATE UNIQUE INDEX IF NOT EXISTS event_pvote_single_choice_unique
  ON public.event_poll_vote (poll_id, user_id)
  WHERE true;   -- enforced in Service Layer for allow_multiple_choice=false

-- For multiple-choice polls: one vote per (poll, option, user)
CREATE UNIQUE INDEX IF NOT EXISTS event_pvote_option_user_unique
  ON public.event_poll_vote (poll_id, option_id, user_id);

CREATE INDEX IF NOT EXISTS event_pvote_poll_id_idx   ON public.event_poll_vote (poll_id);
CREATE INDEX IF NOT EXISTS event_pvote_option_id_idx ON public.event_poll_vote (option_id);
```

**Vote enforcement strategy in Service Layer (`createPollVote()`):**
1. Check `event_poll.is_locked` OR `now() >= event_poll.closes_at` → reject with "poll is closed"
2. If `allow_multiple_choice = false`: check `event_poll_vote` for existing `(poll_id, user_id)` → reject with "already voted"
3. If `allow_multiple_choice = true`: only check `(poll_id, option_id, user_id)` uniqueness
4. Insert the vote

---

### 3.10 `mention` table

Unified mention log for `@username` / `/u/user_id` tags across all content types.

```sql
CREATE TABLE IF NOT EXISTS public.mention (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       text  NOT NULL CHECK (source_type IN (
                              'post',
                              'comment',
                              'event_question',
                              'event_answer'
                          )),
  source_id         uuid  NOT NULL,                                -- FK to the row in source_type table
  mentioned_user_id uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  mentioner_id      uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mention_mentioned_user_id_idx ON public.mention (mentioned_user_id);
CREATE INDEX IF NOT EXISTS mention_source_idx            ON public.mention (source_type, source_id);
CREATE INDEX IF NOT EXISTS mention_mentioner_id_idx      ON public.mention (mentioner_id);
```

**Notes:**
- `source_id` is not a typed FK because it references different tables depending on `source_type` — validated in the Service Layer
- The mention parsing regex at save time: `/@(\w{3,30})/g` for `@username` and `\/u\/([0-9a-f-]{36})/g` for `/u/uuid`
- Mentions are inserted as part of the same transaction as the parent content (question / answer / comment / post)
- Mention-based notifications are surfaced in a future `notification` table; for now the `mention` table is the source of truth

---

## 4. Full-Text Search for Events

```sql
CREATE OR REPLACE FUNCTION event_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.venue, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.country, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, venue, city, country ON public.event
  FOR EACH ROW EXECUTE FUNCTION event_search_vector_trigger();
```

---

## 5. Row Level Security (RLS)

```sql
ALTER TABLE public.event              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_url          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_question     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_question_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_answer       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_answer_vote  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll_option  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_poll_vote    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mention            ENABLE ROW LEVEL SECURITY;

-- Events: read all non-deleted; insert/update/delete = creator only
CREATE POLICY "event_select_visible"   ON public.event FOR SELECT USING (is_deleted = false OR creator_id = auth.uid());
CREATE POLICY "event_insert_own"       ON public.event FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "event_update_own"       ON public.event FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "event_delete_own"       ON public.event FOR DELETE USING (auth.uid() = creator_id);

-- Q&A questions: read all; post only if logged in AND qa not locked (enforced in Service Layer)
CREATE POLICY "eq_select_all"          ON public.event_question FOR SELECT USING (true);
CREATE POLICY "eq_insert_own"          ON public.event_question FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "eq_update_own"          ON public.event_question FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "eq_delete_own"          ON public.event_question FOR DELETE USING (auth.uid() = author_id);

-- Q&A answers: same pattern
CREATE POLICY "ea_select_all"          ON public.event_answer FOR SELECT USING (true);
CREATE POLICY "ea_insert_own"          ON public.event_answer FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ea_update_own"          ON public.event_answer FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "ea_delete_own"          ON public.event_answer FOR DELETE USING (auth.uid() = author_id);

-- Votes: one per user per target (enforced by unique index + Service Layer)
CREATE POLICY "eqv_select_all"         ON public.event_question_vote FOR SELECT USING (true);
CREATE POLICY "eqv_insert_own"         ON public.event_question_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "eqv_update_own"         ON public.event_question_vote FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "eqv_delete_own"         ON public.event_question_vote FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "eav_select_all"         ON public.event_answer_vote FOR SELECT USING (true);
CREATE POLICY "eav_insert_own"         ON public.event_answer_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "eav_update_own"         ON public.event_answer_vote FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "eav_delete_own"         ON public.event_answer_vote FOR DELETE USING (auth.uid() = user_id);

-- Polls: read all; create = event creator only (enforced in Service Layer too)
CREATE POLICY "ep_select_all"          ON public.event_poll FOR SELECT USING (true);
CREATE POLICY "ep_insert_own"          ON public.event_poll FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "ep_update_own"          ON public.event_poll FOR UPDATE USING (auth.uid() = creator_id);

-- Poll votes: logged in users only; Service Layer checks close time
CREATE POLICY "epv_select_all"         ON public.event_poll_vote FOR SELECT USING (true);
CREATE POLICY "epv_insert_own"         ON public.event_poll_vote FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "epv_delete_own"         ON public.event_poll_vote FOR DELETE USING (auth.uid() = user_id);

-- Mentions: read own; insert own
CREATE POLICY "mention_select_own"     ON public.mention FOR SELECT USING (mentioned_user_id = auth.uid() OR mentioner_id = auth.uid());
CREATE POLICY "mention_insert_own"     ON public.mention FOR INSERT WITH CHECK (mentioner_id = auth.uid());
```

---

## 6. TypeScript Types (App Layer)

```typescript
// lib/supabase/types.ts additions

export type EventType =
  | 'conference'
  | 'meetup'
  | 'presentation'
  | 'zoom'
  | 'webinar'
  | 'workshop'
  | 'symposium'
  | 'seminar'
  | 'poster_session'
  | 'panel'
  | 'other'

export type AppEvent = {
  _id: string
  publicationId: string
  creator?: AppUser | null
  title: string
  slug: string
  description?: string | null
  eventType: EventType
  eventTypeCustom?: string | null
  venue: string
  city?: string | null
  country?: string | null
  isVirtual: boolean
  eventDate: string               // ISO date string
  startDate?: string | null
  endDate?: string | null
  timezone: string
  conferenceUrl?: string | null
  recordedVideoUrl?: string | null
  isQaLocked: boolean
  isPollLocked: boolean
  urls?: AppEventUrl[]
  created_at: string
}

export type AppEventUrl = {
  _id: string
  urlType: string
  url: string
  label?: string | null
  addedBy?: AppUser | null
}

export type AppEventQuestion = {
  _id: string
  content: string
  author?: AppUser | null
  isPinned: boolean
  isDeleted: boolean
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
  answers?: AppEventAnswer[]
  createdAt: string
}

export type AppEventAnswer = {
  _id: string
  content: string
  author?: AppUser | null
  isAccepted: boolean
  votes: { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }
  createdAt: string
}

export type AppPoll = {
  _id: string
  question: string
  description?: string | null
  allowMultipleChoice: boolean
  closesAt: string               // ISO datetime string
  isLocked: boolean
  isClosed: boolean              // computed: isLocked || now >= closesAt
  showResultsBeforeClose: boolean
  options: AppPollOption[]
  totalVotes: number
  userVotedOptionIds?: string[]  // empty if not voted or results hidden
}

export type AppPollOption = {
  _id: string
  optionText: string
  optionOrder: number
  voteCount: number
  percentage: number             // computed from totalVotes
}
```

---

## 7. Service Layer

### Files to create:

| File | Purpose |
|------|---------|
| `lib/supabase/events.ts` | `getEventsForPublication()`, `getEventById()`, `getEventBySlug()` |
| `lib/supabase/event-qa.ts` | `getQuestionsForEvent()`, `getAnswersForQuestion()` |
| `lib/supabase/event-polls.ts` | `getPollsForEvent()`, `getPollWithResults()` |
| `lib/supabase/mutations.ts` | Extend with: `createEvent()`, `updateEvent()`, `deleteEvent()`, `addEventUrl()`, `createQuestion()`, `createAnswer()`, `voteOnQuestion()`, `voteOnAnswer()`, `createPoll()`, `submitPollVote()`, `lockEvent()` |
| `action/createEvent.ts` | Server Action |
| `action/createQuestion.ts` | Server Action |
| `action/createAnswer.ts` | Server Action |
| `action/voteEventQA.ts` | Server Action (handles both question and answer votes) |
| `action/createPoll.ts` | Server Action |
| `action/submitPollVote.ts` | Server Action |
| `action/lockEventContent.ts` | Server Action for locking Q&A / polls |

### Key Service Layer rules:

```typescript
// createQuestion(eventId, content, userId):
// 1. Load event — check is_qa_locked AND event.is_deleted
// 2. Parse @username / /u/uuid mentions from content
// 3. Insert event_question row
// 4. Insert mention rows (transaction)
// 5. Return mapped AppEventQuestion

// submitPollVote(pollId, optionIds[], userId):
// 1. Load poll — check is_locked || now() >= closes_at
// 2. If allow_multiple_choice = false: assert optionIds.length === 1
// 3. Check existing vote for (pollId, userId)
// 4. Insert event_poll_vote rows
// 5. Return updated poll results

// lockEventContent(eventId, target: 'qa' | 'poll' | 'both', userId):
// 1. Verify userId === event.creator_id
// 2. Patch is_qa_locked and/or is_poll_locked
// 3. Return updated event
```

---

## 8. UI Components

### Component tree for an Event detail page:

```
/p/[pubSlug]/events/[eventId]/page.tsx
  ├── EventBanner                    ← title, type badge, venue, date range, URLs
  ├── EventCountdown                 ← "Starts in X days" / "Ongoing" / "Ended X days ago"
  ├── EventUrlList                   ← conference_url, recorded_video_url, + extras
  ├── EventTabBar                    ← "Q&A" | "Polls" | "Info"
  │
  ├── [Tab: Q&A]
  │   ├── QALockBanner               ← shown when is_qa_locked
  │   ├── QuestionInput              ← textarea with @mention autocomplete; login required
  │   ├── QuestionSortBar            ← "Top Votes" | "Most Recent"
  │   └── QuestionList
  │       └── QuestionCard
  │           ├── VoteButtons
  │           ├── QuestionContent    ← renders @mention as links
  │           ├── AnswerList
  │           │   └── AnswerCard
  │           │       ├── VoteButtons
  │           │       ├── AcceptedBadge
  │           │       └── AnswerContent
  │           └── AnswerInput        ← login required; collapsed by default
  │
  ├── [Tab: Polls]
  │   ├── PollLockBanner             ← shown when is_poll_locked
  │   ├── CreatePollButton           ← event creator only
  │   └── PollList
  │       └── PollCard
  │           ├── PollQuestion
  │           ├── PollCloseCountdown ← "Closes in Xh Ym" / "Closed"
  │           ├── PollOptions        ← radio (single) or checkbox (multi)
  │           ├── VoteButton         ← login required; disabled if closed/locked
  │           └── PollResults        ← bar chart; hidden before close if show_results_before_close=false
  │
  └── [Tab: Info]
      ├── EventDescription
      ├── EventVenueMap              ← optional: Google Maps embed via city+country
      └── EventAttendeeSection       ← future: RSVP list
```

### Component files to create:

| Component | File |
|-----------|------|
| Event banner | `components/event/EventBanner.tsx` |
| Event countdown | `components/event/EventCountdown.tsx` |
| Q&A question input | `components/event/QuestionInput.tsx` |
| Q&A question card | `components/event/QuestionCard.tsx` |
| Q&A answer card | `components/event/AnswerCard.tsx` |
| Poll card | `components/event/PollCard.tsx` |
| Poll results | `components/event/PollResults.tsx` |
| Create event form | `components/event/CreateEventForm.tsx` |
| Create event button | `components/event/CreateEventButton.tsx` |
| Mention autocomplete | `components/shared/MentionInput.tsx` (shared with post/comment) |

---

## 9. Create Event Form Fields

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | 3–200 chars |
| Slug | Yes | auto-generated; scoped to publication |
| Event Type | Yes | dropdown; "Other" reveals custom text field |
| Venue | Yes | text; required unless `is_virtual = true` |
| City | No | free text |
| Country | No | free text |
| Is Virtual | No | toggle; hides venue requirement when true |
| Event Date | Yes | date picker (single day) |
| Multi-Day Toggle | No | reveals Start Date + End Date pickers |
| Start Date | Conditional | required when multi-day = true |
| End Date | Conditional | required when multi-day = true; must be ≥ start |
| Event Time | No | local time; displayed with timezone label |
| Timezone | Yes (default UTC) | IANA tz picker |
| Conference URL | No | validated as URL |
| Description | No | textarea |

**Post-event editable fields** (via "Edit Event" — event creator only):
- `recorded_video_url` — prominently placed "Add recording" CTA after event date passes
- Additional URLs via "Add URL" button

---

## 10. Mention Parsing

The `@username` and `/u/user_id` syntax is parsed at save time:

```
Regex for @username:   /@([a-zA-Z0-9_]{3,30})/g
Regex for /u/uuid:     /\/u\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
```

**On content save (Server Action):**
1. Run both regexes to extract mention targets
2. Resolve usernames to `user_id` via DB lookup (batch query)
3. Insert rows into `mention` table within the same transaction as the content row
4. Unresolved usernames (user not found) are kept as literal text without inserting a `mention` row

**On content render (Client Component):**
- Replace `@username` with `<Link href="/u/username">@username</Link>`
- Replace `/u/uuid` with `<Link href="/u/username">@username</Link>` after resolving uuid → username

---

## 11. Event Locking Behavior Summary

| Control | Scope | Who can toggle | Effect |
|---------|-------|---------------|--------|
| `is_qa_locked` | All Q&A on this event | Event creator | No new questions or answers; voting still allowed |
| `is_poll_locked` | All polls on this event | Event creator | All polls immediately locked regardless of `closes_at` |
| `event_poll.is_locked` | Single poll | Poll creator (= event creator) | That poll locked early |
| `event_poll.closes_at` | Single poll | Poll creator (at creation) | Auto-lock at this timestamp |

---

## 12. Future Enhancements (Out of Scope v1)

- **RSVP / Attendee list:** `event_attendee` table; users mark themselves as attending
- **Speaker list:** `event_speaker` table; link speakers to user profiles or off-platform names
- **Real-time Q&A:** Supabase Realtime subscriptions on `event_question` and `event_answer`
- **Notification system:** `notification` table fed by `mention`, new answers, poll close events
- **Anonymous questions:** Allow unauthenticated questions (moderated by creator before showing)
- **Export:** Download Q&A as PDF/Markdown post-event
- **Recurring events:** `event_series` to group related events (e.g., weekly lab seminars)

---

## 13. Migration File Naming

```
supabase/migrations/20260222140000_create_event_tables.sql
```

Contents: all DDL from sections 3.1–3.10, RLS from section 5, FTS trigger from section 4.

---

## 14. Example: ICRA 2026

Illustrative data for the example mentioned in the brief:

```json
{
  "title": "ICRA 2026 — Presentation",
  "slug": "icra-2026",
  "event_type": "conference",
  "venue": "Austria Center Vienna",
  "city": "Vienna",
  "country": "Austria",
  "is_virtual": false,
  "event_date": "2026-06-01",
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "timezone": "Europe/Vienna",
  "conference_url": "https://2026.ieee-icra.org"
}
```
