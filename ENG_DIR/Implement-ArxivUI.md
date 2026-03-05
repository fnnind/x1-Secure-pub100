# Implement ArXiv-style Publication Landing Page (r1x-UI-v2)

**Source design:** `ENG_DIR/r1x-UI-v2.png`
**Date:** 2026-03-02
**Status:** ✅ Implemented — 2026-03-02

---

## 1. What Changes (Current → Target)

| Area | Current | Target (r1x-UI-v2) |
|---|---|---|
| Banner header | Image thumb + title + authors + abstract preview + action buttons | Category breadcrumb · arXiv-style ID badge · Large title · Authors (no image thumb) |
| Content structure | Banner → 2-col flat (main + sidebar) | Banner → AI Summary → Tab bar → Tab content + Right sidebar |
| Tab navigation | None | **Papers · Events · Q&A · Details · References** |
| AI Summary | None | Collapsible card showing `abstract` labelled "AI Summary" (Phase 1) |
| Comments/Discussion | Not on pub page | Inline thread via new `publication_comment` table (scoped directly to publication) |
| Right sidebar | Creator card + Linked SubXeurons | Topic search box + tag cloud + Linked SubXeurons |
| Category breadcrumb | Not shown | New DB field `field_of_study` → `Computer Science > Computation and Language` |
| Publication ID badge | Type badge ("Preprint") | arXiv-style: `arXiv:{doi} [cs.CL]` if DOI present, else type label |

---

## 2. Resolved Design Decisions

| Question | Decision |
|---|---|
| Comment scoping | New `publication_comment` table — scoped directly to `publication_id`, no pinned post indirection |
| AI Summary data | Show `abstract` with label "AI Summary" — no new DB field needed for Phase 1 |
| Category breadcrumb | New DB field `field_of_study` (text) on `publication` table |
| Events tab content | Publication events only (from `getEventsForPublication`) |
| Tab name | "Conferences" → **"Events"** — shorter, accurate, fits mobile without overflow |

---

## 3. Layout Options Analysis

### Context constraints

- **Left nav** (app-sidebar): ~240px on desktop, collapses to hamburger on mobile — full width reclaimed
- **Right sidebar** target: ~288px (w-72) with topic search + tag cloud
- **5 tabs**: Papers · Events · Q&A · Details · References
- **Available widths**: mobile ≈ 375px, tablet ≈ 768px, desktop ≈ 1040px usable (after 240px left nav)

---

### Option A — Persistent 3-zone (sidebar always present, tabs scroll horizontally on mobile)

```
DESKTOP (≥1024px)
┌─────────────┬──────────────────────────────────┬──────────────┐
│  app-       │  [Banner]                        │  Topic       │
│  sidebar    │  [AI Summary]                    │  search      │
│  (240px)    │  [Papers|Events|Q&A|Details|Refs]│              │
│             │  ──────────────────────────────  │  Tag cloud   │
│             │  Tab content (flex-1)            │  (w-72)      │
└─────────────┴──────────────────────────────────┴──────────────┘

MOBILE (<768px)
┌────────────────────────────────────────┐
│  [Banner: title stacked]               │
│  [AI Summary collapsed]                │
│  ← Papers|Events|Q&A|Details|Refs →   │  horizontal scroll
│  ─────────────────────────────────     │
│  Tab content (full width)              │
│  ─────────────────────────────────     │
│  [Topic search]   ← stacked below      │
│  [Tag cloud]      ← stacked below      │
└────────────────────────────────────────┘
```

**Pros**
- Tag cloud always in the DOM — discoverable by scrolling
- Single layout path, no conditional rendering
- Right sidebar stacked at bottom on mobile is familiar (Reddit mobile pattern)

**Cons**
- Mobile user must scroll past entire tab content to reach tags — low discovery
- Two scroll axes (horizontal tabs + vertical page) feel jarring on mobile
- Right sidebar buried at the bottom of a long comment thread on mobile

---

### Option B — Sidebar folds into Details tab on mobile ✅ RECOMMENDED

```
DESKTOP (≥1024px)
┌─────────────┬──────────────────────────────────┬──────────────┐
│  app-       │  [Banner]                        │  Topic       │
│  sidebar    │  [AI Summary collapsible]        │  search      │
│  (240px)    │  [Papers|Events|Q&A|Details|Refs]│  ──────────  │
│             │  ──────────────────────────────  │  Tag cloud   │
│             │  Tab content (flex-1)            │  ──────────  │
│             │                                  │  Creator     │
└─────────────┴──────────────────────────────────┴──────────────┘

TABLET (768–1023px)
┌──────────────────────────────────────────────┐
│  [Banner]                                    │
│  [AI Summary]                                │
│  [Papers|Events|Q&A|Details|Refs] (scrolls)  │
│  ────────────────────────────────────────    │
│  Tab content (full width)                    │
│  Details tab → topic search + tags + info    │
└──────────────────────────────────────────────┘

MOBILE (<768px)
┌────────────────────────────────────────┐
│  [Banner: compact, authors truncated]  │
│  [AI Summary — collapsed by default]   │
│  [ Papers | Events | Q&A | Details ]   │  4 short labels, no scroll needed
│  ──────────────────────────────────    │
│  Tab content (full width)              │
│  Details tab = tags + search + meta    │
└────────────────────────────────────────┘
```

**Key mechanic:** `<PublicationMeta>` is a shared server component rendered twice:
- Once as a sticky `<aside className="hidden lg:block w-72">` (desktop right sidebar)
- Once inside the Details tab panel `<div className="lg:hidden">` (mobile/tablet)

**Pros**
- No horizontal scroll needed on mobile — 4 short tab labels fit a 375px screen cleanly
- Clean single-column layout on mobile, no buried content
- Right sidebar sticky on desktop — tag cloud stays visible while reading a long thread
- Tab state is a `?tab=events` URL search param — SSR-rendered, bookmarkable, no hydration required for initial paint
- Details tab is a natural metadata bucket on any screen size
- Zero extra JS — responsive purely via Tailwind breakpoint classes

**Cons**
- Tags are "behind a tap" on mobile (not glanceable on first load)
- Sidebar data rendered twice in the HTML — mitigated by it being a lightweight list of strings
- Must remember to update both render sites if `<PublicationMeta>` structure changes (mitigated by extracting into one component)

---

### Option C — Accordion on mobile, tabs on desktop

```
MOBILE:
┌────────────────────────────────────────┐
│  [Banner]                              │
│  ▼ Papers (expanded by default)        │
│    [Post list]                         │
│  ▶ Events                              │
│  ▶ Q&A                                 │
│  ▶ Details                             │
│  ▶ References                          │
└────────────────────────────────────────┘
```

**Pros**
- All content visible in one pass on mobile — no hidden sections
- No horizontal scroll. No JS required (CSS `<details>/<summary>`)

**Cons**
- Two entirely different UI paradigms → double the component logic
- `?tab=papers` URL param has no visual meaning in accordion mode — breaks shared links on mobile
- Diverges significantly from the r1x-UI-v2 target design
- Accordion "Papers" open by default still pushes Events/Q&A far down the page

---

### Option D — Fixed bottom tab bar on mobile (native app pattern)

```
MOBILE:
┌────────────────────────────────────────┐
│  [Banner + active tab content]         │
│                                        │
├────────────────────────────────────────┤
│  Papers│Events│ Q&A │Details│  Ref    │  ← fixed bottom
└────────────────────────────────────────┘
```

**Pros**
- Maximum vertical content area
- Thumbs-reachable navigation. Familiar from iOS/Android apps

**Cons**
- Clashes with iOS Safari bottom chrome — content obscured
- Requires `pb-16` body padding everywhere
- Not a web-native pattern — unexpected for a content/academic site
- Z-index conflicts with modals and sheets
- History navigation doesn't map cleanly to tab changes

---

## 4. Chosen Layout: Option B

**Rationale:** cleanest mobile UX, zero extra JS, SSR-friendly tab routing, single shared `<PublicationMeta>` component, matches r1x-UI-v2 spirit at all breakpoints.

**Banner mobile adjustment:**
- Title: full width, 2-line clamp, then truncated
- Authors: show first author + "et al." with expand link
- DOI/source links: hidden on mobile, visible in Details tab
- Keeps banner under ~90px tall on mobile so tab bar is immediately visible

---

## 5. Implementation Tasks

### Task 1 — DB Migration: `field_of_study` field
**File:** `supabase/migrations/20260302XXXXXX_publication_field_of_study.sql`
- `ALTER TABLE public.publication ADD COLUMN field_of_study text;`
- Update `AppPublication` type in `lib/supabase/types.ts`
- Update mapper in `lib/supabase/mappers.ts`

### Task 2 — Banner Redesign
**File:** `components/publication/PublicationBanner.tsx`
- Remove thumbnail image
- Add category breadcrumb: `{field_of_study}` rendered as `Field > Subfield` (split on ` > `)
- Replace type badge with arXiv-style ID badge: `arXiv:{doi} [cs.CL]` if DOI present, else type label
- Remove abstract preview (moves to Details tab)
- Remove action buttons from banner (Edit/Add Event stay in Details or creator toolbar)
- Mobile: clamp title to 2 lines, show first author + "et al." expand

### Task 3 — Tab Navigation Component
**File:** `components/publication/PublicationTabs.tsx` (new)
- Tab labels: **Papers · Events · Q&A · Details · References**
- State: `?tab=papers` URL search param — router.push on click (client component)
- Active tab: bottom-border underline accent
- Receives `activeTab` prop derived from `searchParams` in the page

### Task 4 — Shared Metadata Component
**File:** `components/publication/PublicationMeta.tsx` (new)
- Topic search box: `<input>` filtering the tag list client-side
- Tag cloud: pill badges linking to `/search?query={tag}`
- Linked SubXeurons list
- Creator card
- Rendered as sticky sidebar on `lg:` and as Details tab content on `< lg`

### Task 5 — AI Summary Card
**File:** `components/publication/PublicationAISummary.tsx` (new)
- Shows `publication.abstract` labelled **"AI Summary"**
- Collapsed by default on mobile (show first 3 lines, "Show more" toggle)
- Expanded by default on desktop
- Client component for the expand toggle, content is server-rendered

### Task 6 — Tab Content Panels
**File:** `components/publication/tabs/` (new directory)
- `PapersTab.tsx` — publication comment thread using new `PublicationCommentList` + `PublicationCommentInput` components
- `EventsTab.tsx` — `getEventsForPublication()` list + "Add Event" button for creator (replaces `/p/[slug]/events/page.tsx` inline)
- `QATab.tsx` — same comment thread as PapersTab initially; can diverge later
- `DetailsTab.tsx` — abstract, DOI, source URL, PDF, published year, tags + `<PublicationMeta className="lg:hidden" />`
- `ReferencesTab.tsx` — placeholder with `source_url` external link

### Task 7 — `publication_comment` Table + Service Layer
**Files:**
- `supabase/migrations/20260302XXXXXX_publication_comment.sql` (new)
- `lib/supabase/publication-comments.ts` (new)
- `components/publication/PublicationCommentList.tsx` (new)
- `components/publication/PublicationCommentInput.tsx` (new)

#### DB schema
```sql
CREATE TABLE public.publication_comment (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id  uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  content         text        NOT NULL CHECK (char_length(content) <= 2000),
  parent_id       uuid        REFERENCES public.publication_comment(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  is_deleted      boolean     NOT NULL DEFAULT false
);

CREATE INDEX ON public.publication_comment (publication_id, created_at DESC);
CREATE INDEX ON public.publication_comment (parent_id);

CREATE TABLE public.publication_comment_vote (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid  NOT NULL REFERENCES public.publication_comment(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  vote_type   text  NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  UNIQUE (comment_id, user_id)
);
```

#### RLS policies
- `publication_comment`: public SELECT (where `is_deleted = false`); authenticated INSERT (own `author_id`); owner-only UPDATE/DELETE (soft-delete via `is_deleted`)
- `publication_comment_vote`: authenticated INSERT/DELETE (own `user_id`); public SELECT

#### Service layer — `lib/supabase/publication-comments.ts`
- `getPublicationComments(publicationId, userId)` — fetches root comments + nested replies + vote counts + caller's vote status
- `getPublicationCommentCount(publicationId)` — used to show count in tab label
- Returns `AppComment[]` (reuses existing type — same shape as `post_comment`)

#### Components
- `PublicationCommentInput.tsx` — wraps a new server action `createPublicationComment(publicationId, content, parentId?)`
- `PublicationCommentList.tsx` — renders `AppComment[]` with nested replies and vote buttons
- Both mirror existing `CommentInput` / `CommentList` but call the new table/action

#### Server action — `action/createPublicationComment.ts`
- Inserts into `publication_comment`
- Fire-and-forget email notification to publication creator (reuse `lib/email.ts` pattern)

### Task 8 — Page Layout Restructure
**File:** `app/(app)/p/[slug]/page.tsx`
- New layout:
  ```
  <PublicationBanner />
  <PublicationAISummary abstract={publication.abstract} />
  <PublicationTabs activeTab={tab} />
  <div className="flex gap-8">
    <main className="flex-1">
      {tab === 'papers' && <PapersTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'qa' && <QATab />}
      {tab === 'details' && <DetailsTab />}
      {tab === 'references' && <ReferencesTab />}
    </main>
    <aside className="hidden lg:block w-72 sticky top-4 self-start">
      <PublicationMeta publication={publication} />
    </aside>
  </div>
  ```
- Default tab: `papers`
- Remove standalone events/abstract/tags sections (all absorbed into tabs)

---

## 6. Dependency Order

```
Task 1 (DB: field_of_study)          ← independent, unblocks Task 2
Task 7 (DB: publication_comment)     ← independent, unblocks Task 6 (PapersTab/QATab)
Task 2 (Banner)                      ← depends on Task 1
Task 3 (Tabs)                        ← independent
Task 4 (PublicationMeta)             ← independent
Task 5 (AI Summary)                  ← independent
Task 6 (Tab panels)                  ← depends on Tasks 3 + 7
Task 8 (Page layout)                 ← depends on Tasks 2–7 all done
```

## 7. File Manifest

### New files
| File | Task |
|---|---|
| `supabase/migrations/20260302XXXXXX_publication_field_of_study.sql` | 1 |
| `supabase/migrations/20260302XXXXXX_publication_comment.sql` | 7 |
| `lib/supabase/publication-comments.ts` | 7 |
| `action/createPublicationComment.ts` | 7 |
| `components/publication/PublicationCommentList.tsx` | 7 |
| `components/publication/PublicationCommentInput.tsx` | 7 |
| `components/publication/PublicationTabs.tsx` | 3 |
| `components/publication/PublicationMeta.tsx` | 4 |
| `components/publication/PublicationAISummary.tsx` | 5 |
| `components/publication/tabs/PapersTab.tsx` | 6 |
| `components/publication/tabs/EventsTab.tsx` | 6 |
| `components/publication/tabs/QATab.tsx` | 6 |
| `components/publication/tabs/DetailsTab.tsx` | 6 |
| `components/publication/tabs/ReferencesTab.tsx` | 6 |

### Modified files
| File | Task | Change |
|---|---|---|
| `lib/supabase/types.ts` | 1 | Add `field_of_study?: string \| null` to `AppPublication` |
| `lib/supabase/mappers.ts` | 1 | Map `field_of_study` from DB row |
| `components/publication/PublicationBanner.tsx` | 2 | Full redesign |
| `app/(app)/p/[slug]/page.tsx` | 8 | Full restructure |
