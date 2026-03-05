# Implementation Progress: Publications + Events

**Architect:** System
**Started:** 2026-02-24
**Completed:** 2026-02-24
**Features:** DESIGN_CREATE_Pub.md → DESIGN_EVENT.md

---

## Status Legend
- ✅ Done
- 🔄 In Progress
- ⬜ Pending

---

## Phase 1: Database Migrations ✅

| File | Status |
|------|--------|
| `supabase/migrations/20260222130000_create_publication_tables.sql` | ✅ Applied |
| `supabase/migrations/20260222140000_create_event_tables.sql` | ✅ Applied |

Both migrations applied to remote Supabase DB via `pnpx supabase db push --include-all`.

---

## Phase 2: TypeScript Types + Mappers ✅

| File | Status |
|------|--------|
| `lib/supabase/types.ts` — AppPublication, AppEvent, AppPoll, etc. | ✅ |
| `lib/supabase/mappers.ts` — publication + event mappers | ✅ |

---

## Phase 3: Service Layer — Publications ✅

| File | Status |
|------|--------|
| `lib/supabase/publications.ts` | ✅ |
| `lib/supabase/mutations.ts` — publication mutations | ✅ |

---

## Phase 4: Server Actions — Publications ✅

| File | Status |
|------|--------|
| `action/createPublication.ts` | ✅ |
| `action/linkPublication.ts` | ✅ |
| `action/inviteCollaborator.ts` | ✅ |

---

## Phase 5: UI Components — Publications ✅

| Component | Status |
|-----------|--------|
| `components/publication/CreatePublicationButton.tsx` | ✅ Dialog form |
| `components/publication/CreatePublicationForm.tsx` | ✅ Full page form |
| `components/publication/PublicationBanner.tsx` | ✅ |
| `components/publication/PublicationCard.tsx` | ✅ |
| `components/publication/PublicationAuthors.tsx` | ✅ |
| `components/publication/LinkSubxeuronPanel.tsx` | ✅ |

---

## Phase 6: App Routes — Publications ✅

| Route | Status |
|-------|--------|
| `app/(app)/p/[slug]/page.tsx` | ✅ |
| `app/(app)/p/[slug]/events/page.tsx` | ✅ |
| `app/(app)/create-publication/page.tsx` | ✅ |

---

## Phase 7: Service Layer — Events ✅

| File | Status |
|------|--------|
| `lib/supabase/events.ts` | ✅ |
| `lib/supabase/event-qa.ts` | ✅ |
| `lib/supabase/event-polls.ts` | ✅ |
| `lib/supabase/mutations.ts` — event mutations | ✅ |

---

## Phase 8: Server Actions — Events ✅

| File | Status |
|------|--------|
| `action/createEvent.ts` | ✅ |
| `action/createQuestion.ts` | ✅ |
| `action/createAnswer.ts` | ✅ |
| `action/voteEventQA.ts` | ✅ |
| `action/createPoll.ts` | ✅ |
| `action/submitPollVote.ts` | ✅ |
| `action/lockEventContent.ts` | ✅ |

---

## Phase 9: UI Components — Events ✅

| Component | Status |
|-----------|--------|
| `components/event/EventCard.tsx` | ✅ |
| `components/event/EventBanner.tsx` | ✅ |
| `components/event/EventCountdown.tsx` | ✅ Client-side countdown |
| `components/event/CreateEventForm.tsx` | ✅ Full form with multi-day, timezone |
| `components/event/QuestionInput.tsx` | ✅ |
| `components/event/QuestionCard.tsx` | ✅ With inline answer posting |
| `components/event/AnswerCard.tsx` | ✅ With voting |
| `components/event/PollCard.tsx` | ✅ Single/multi choice |
| `components/event/PollResults.tsx` | ✅ Bar chart results |

---

## Phase 10: App Routes — Events ✅

| Route | Status |
|-------|--------|
| `app/(app)/p/[slug]/events/[eventId]/page.tsx` | ✅ Q&A + Polls + Info tabs |
| `app/(app)/p/[slug]/events/create/page.tsx` | ✅ |

---

## Sidebar ✅

- `CreatePublicationButton` added to `components/app-sidebar.tsx`

---

## DB Migration Summary

### Tables Created
**Publication feature:**
- `publication` — with FTS trigger (title A, abstract B, description C)
- `publication_author` — ordered, off-platform-author-friendly
- `publication_collaborator` — invite/role/status workflow
- `publication_subxeuron` — bidirectional cross-link junction
- `publication_tag` — keyword tags

**Event feature:**
- `event` — nullable `publication_id` (allows standalone events)
- `event_url` — multiple typed URLs per event
- `event_question` + `event_question_vote` — Q&A with voting
- `event_answer` + `event_answer_vote` — answers with voting
- `event_poll` + `event_poll_option` + `event_poll_vote` — polls with close time
- `mention` — unified @username / /u/uuid mention log

All tables have RLS enabled with appropriate policies.

---

## Architecture Decisions Made

1. **Standalone events**: `publication_id` made nullable so events can exist independently with `linked_url` pointing to a subxeuron or external resource.
2. **DOI deduplication**: Returns error with link to existing publication slug.
3. **Type casts**: Supabase JS returns typed unions; service layer uses `as any` casts consistently with pre-existing codebase pattern.
4. **Vote toggle**: `voteType: null` removes a vote (DELETE), matching the existing vote system.
5. **Poll single-choice enforcement**: Checked in Service Layer (`submitPollVote`) before DB insert, not only via DB index.
6. **Mention insertion**: Atomic with parent content insert in the same service call (no separate transaction needed — Postgres handles atomicity per statement).

---

## What's Left (Future / Out of Scope v1)

- `app/(app)/p/[slug]/edit/page.tsx` — edit publication (CRUD form)
- `app/(app)/p/[slug]/events/[eventId]/create-poll` — inline poll creation UI
- `app/(app)/p/[slug]/collaborators` — collaborator management page
- Mention autocomplete (`components/shared/MentionInput.tsx`)
- Real-time Q&A via Supabase Realtime
- Notification system
