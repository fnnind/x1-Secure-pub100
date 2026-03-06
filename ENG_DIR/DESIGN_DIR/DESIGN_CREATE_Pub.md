# DESIGN: Create a Publication Feature

**Status:** Design / Pre-implementation
**Author:** Engineering
**Route pattern:** `/p/[pubSlug]`
**Mirrors:** "Create a SubXeuron" flow (`/x/[slug]`)

---

## 1. Overview

A **Publication** is an academic or research artifact (journal paper, preprint, conference paper, thesis, whitepaper, etc.) created by a researcher on the platform. The creator can invite other researchers as collaborators (with distinct roles). Publications and SubXeurons are first-class peers: either creator can cross-link one into the other after creation.

**Key design principles:**
- Mirror the SubXeuron creation UX (Dialog modal → form → server action → redirect to `/p/[slug]`)
- Publication is the parent of Events (see `DESIGN_EVENT.md`)
- Cross-links between a Publication and a SubXeuron are bidirectional and owned by whoever adds them
- All IDs use UUIDv7 once the uuid migration is applied (see `DESIGN_uuidv7.md`)

---

## 2. URL Structure

| URL | Description |
|-----|-------------|
| `/p/[pubSlug]` | Publication detail page |
| `/p/[pubSlug]/edit` | Edit publication (creator only) |
| `/p/[pubSlug]/events` | All events for this publication |
| `/p/[pubSlug]/collaborators` | Manage collaborators (creator only) |
| `/create-publication` | Create publication page (mirrors `/create-post`) |

---

## 3. Database Schema

### 3.1 `publication` table

```sql
CREATE TABLE IF NOT EXISTS public.publication (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),  -- replaced by uuidv7() after migration
  title              text        NOT NULL,
  slug               text        NOT NULL,
  description        text,
  abstract           text,                         -- academic-style abstract (plain text or markdown)
  creator_id         uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  body               jsonb,                         -- Portable Text / rich text body
  publication_type   text        NOT NULL DEFAULT 'preprint'
                                 CHECK (publication_type IN (
                                   'journal_article',
                                   'preprint',
                                   'conference_paper',
                                   'book_chapter',
                                   'thesis',
                                   'whitepaper',
                                   'technical_report',
                                   'other'
                                 )),
  status             text        NOT NULL DEFAULT 'published'
                                 CHECK (status IN ('draft', 'published', 'archived')),
  published_year     smallint,                      -- e.g. 2024
  doi                text,                          -- e.g. 10.1000/xyz123
  source_url         text,                          -- doi.org / arxiv.org / nature.com etc.
  pdf_url            text,                          -- S3 key / URL
  image_url          text,                          -- cover / hero image (S3)
  image_alt          text,
  is_reported        boolean     NOT NULL DEFAULT false,
  is_deleted         boolean     NOT NULL DEFAULT false,
  search_vector      tsvector,                      -- GIN index, synced by trigger
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz          DEFAULT now(),
  CONSTRAINT publication_slug_unique UNIQUE (slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS publication_slug_idx         ON public.publication (slug);
CREATE INDEX IF NOT EXISTS publication_creator_id_idx   ON public.publication (creator_id);
CREATE INDEX IF NOT EXISTS publication_created_at_idx   ON public.publication (created_at DESC);
CREATE INDEX IF NOT EXISTS publication_type_idx         ON public.publication (publication_type);
CREATE INDEX IF NOT EXISTS publication_search_vector_idx ON public.publication USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS publication_is_deleted_idx   ON public.publication (is_deleted) WHERE is_deleted = false;
```

**Notes:**
- `doi` is stored normalized (without `https://doi.org/` prefix) for deduplication; UI renders as a full URL
- `abstract` is separate from `body` so it can appear in search previews and event listings without rendering the full rich text
- `source_url` allows doi.org, arxiv.org, nature.com, pubmed.ncbi.nlm.nih.gov (expand allowed hosts relative to SubXeuron)

---

### 3.2 `publication_author` table

Ordered list of authors (may include off-platform researchers by name).

```sql
CREATE TABLE IF NOT EXISTS public.publication_author (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES public."user"(id) ON DELETE SET NULL,   -- NULL if author is off-platform
  author_name      text        NOT NULL,           -- display name (required even for on-platform users)
  affiliation      text,                           -- university / institution
  author_order     smallint    NOT NULL DEFAULT 1, -- 1 = first author, 2 = second, etc.
  is_corresponding boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pub_author_order_positive CHECK (author_order > 0)
);

CREATE INDEX IF NOT EXISTS pub_author_publication_id_idx ON public.publication_author (publication_id);
CREATE INDEX IF NOT EXISTS pub_author_user_id_idx        ON public.publication_author (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS pub_author_order_unique
  ON public.publication_author (publication_id, author_order);
```

**Notes:**
- `user_id` is nullable so creators can list co-authors who are not yet on the platform
- `author_name` is always populated (pre-filled from `user.username` if `user_id` is set)
- The creator is automatically inserted as the first author (order = 1) on creation

---

### 3.3 `publication_collaborator` table

Invitation and role management for researchers who can edit/contribute to the publication.

```sql
CREATE TABLE IF NOT EXISTS public.publication_collaborator (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  invited_by       uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  role             text        NOT NULL DEFAULT 'co-author'
                               CHECK (role IN ('co-author', 'reviewer', 'editor', 'contributor')),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at       timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz          DEFAULT now(),
  CONSTRAINT pub_collab_unique UNIQUE (publication_id, user_id)
);

CREATE INDEX IF NOT EXISTS pub_collab_publication_id_idx ON public.publication_collaborator (publication_id);
CREATE INDEX IF NOT EXISTS pub_collab_user_id_idx        ON public.publication_collaborator (user_id);
CREATE INDEX IF NOT EXISTS pub_collab_status_idx         ON public.publication_collaborator (status);
```

**Invitation flow:**
1. Creator searches for a username in the Collaborators panel
2. A row is inserted with `status = 'pending'`
3. The invited user sees a notification / pending invite in their profile
4. On accept → `status = 'accepted'`; on decline → `status = 'declined'`
5. Accepted collaborators can edit `body`, `abstract`, add authors, and upload files

---

### 3.4 `publication_subxeuron` table (cross-link junction)

Either the publication creator or the subxeuron moderator can link the two together.

```sql
CREATE TABLE IF NOT EXISTS public.publication_subxeuron (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid        NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  subxeuron_id     uuid        NOT NULL REFERENCES public.subxeuron(id) ON DELETE CASCADE,
  linked_by        uuid        NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pub_subx_unique UNIQUE (publication_id, subxeuron_id)
);

CREATE INDEX IF NOT EXISTS pub_subx_publication_id_idx ON public.publication_subxeuron (publication_id);
CREATE INDEX IF NOT EXISTS pub_subx_subxeuron_id_idx   ON public.publication_subxeuron (subxeuron_id);
```

**Authorization rule:**
- `linked_by` must be either:
  - the `creator_id` of the publication, OR
  - an `accepted` collaborator of the publication, OR
  - the `moderator_id` of the subxeuron
- Enforced in the Service Layer (not just RLS) to keep the logic readable

**UI input:** A text field that accepts either `/x/subxeuronSlug` or a full URL `https://xeuron.com/x/subxeuronSlug`. Similarly, in a SubXeuron edit panel, the moderator can paste `/p/pubSlug` to link a publication.

---

### 3.5 `publication_tag` table

Keyword/topic tags for discoverability and filtering.

```sql
CREATE TABLE IF NOT EXISTS public.publication_tag (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id   uuid  NOT NULL REFERENCES public.publication(id) ON DELETE CASCADE,
  tag              text  NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pub_tag_publication_id_idx ON public.publication_tag (publication_id);
CREATE INDEX IF NOT EXISTS pub_tag_tag_idx             ON public.publication_tag (tag);
```

---

## 4. Full-Text Search

Extend the existing `search_vector` pattern from SubXeuron/Post to Publication:

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION publication_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publication_search_vector_update
  BEFORE INSERT OR UPDATE OF title, abstract, description ON public.publication
  FOR EACH ROW EXECUTE FUNCTION publication_search_vector_trigger();
```

---

## 5. Row Level Security (RLS)

```sql
ALTER TABLE public.publication             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_author      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_collaborator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_subxeuron   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_tag         ENABLE ROW LEVEL SECURITY;

-- publication: anyone can read non-deleted; insert/update/delete = creator or accepted collaborator
CREATE POLICY "pub_select_visible"   ON public.publication FOR SELECT USING (is_deleted = false OR creator_id = auth.uid());
CREATE POLICY "pub_insert_own"       ON public.publication FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "pub_update_own"       ON public.publication FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "pub_delete_own"       ON public.publication FOR DELETE USING (auth.uid() = creator_id);

-- publication_collaborator: creator can manage invites; invited user can update their own status
CREATE POLICY "pub_collab_select"    ON public.publication_collaborator FOR SELECT USING (true);
CREATE POLICY "pub_collab_insert"    ON public.publication_collaborator FOR INSERT
  WITH CHECK (invited_by = auth.uid());
CREATE POLICY "pub_collab_update_status" ON public.publication_collaborator FOR UPDATE
  USING (user_id = auth.uid() OR invited_by = auth.uid());

-- Cross-link: anyone can read; insert restricted to creator/moderator (enforced in Service Layer)
CREATE POLICY "pub_subx_select"      ON public.publication_subxeuron FOR SELECT USING (true);
CREATE POLICY "pub_subx_insert"      ON public.publication_subxeuron FOR INSERT WITH CHECK (linked_by = auth.uid());
CREATE POLICY "pub_subx_delete"      ON public.publication_subxeuron FOR DELETE USING (linked_by = auth.uid());
```

---

## 6. TypeScript Types (App Layer)

Located in `lib/supabase/types.ts` — add alongside existing `AppSubxeuron`, `AppPost`:

```typescript
export type AppPublication = {
  _id: string
  title: string
  slug: string
  description?: string | null
  abstract?: string | null
  creator?: AppUser | null
  publicationType: PublicationType
  status: 'draft' | 'published' | 'archived'
  publishedYear?: number | null
  doi?: string | null
  source_url?: string | null
  pdf_url?: string | null
  image_url?: string | null
  image_alt?: string | null
  authors?: AppPublicationAuthor[]
  collaborators?: AppPublicationCollaborator[]
  linkedSubxeurons?: AppSubxeuron[]
  created_at?: string
}

export type PublicationType =
  | 'journal_article'
  | 'preprint'
  | 'conference_paper'
  | 'book_chapter'
  | 'thesis'
  | 'whitepaper'
  | 'technical_report'
  | 'other'

export type AppPublicationAuthor = {
  _id: string
  user?: AppUser | null
  authorName: string
  affiliation?: string | null
  authorOrder: number
  isCorresponding: boolean
}

export type AppPublicationCollaborator = {
  _id: string
  user: AppUser
  invitedBy: AppUser
  role: 'co-author' | 'reviewer' | 'editor' | 'contributor'
  status: 'pending' | 'accepted' | 'declined'
  invitedAt: string
}
```

---

## 7. Service Layer

### Files to create (mirror SubXeuron pattern):

| File | Purpose |
|------|---------|
| `lib/supabase/publications.ts` | `getPublication(slug)`, `getPublications()`, `searchPublications()` |
| `lib/supabase/mutations.ts` | `createPublication()`, `updatePublication()`, `deletePublication()`, `inviteCollaborator()`, `respondToInvite()`, `linkPublicationToSubxeuron()` |
| `action/createPublication.ts` | Next.js Server Action wrapping `createPublication()` |
| `action/inviteCollaborator.ts` | Server Action for invite flow |
| `action/linkPublication.ts` | Server Action for cross-linking |

### `createPublication()` function signature:

```typescript
export async function createPublication(params: {
  title: string
  slug: string
  description?: string
  abstract?: string
  publicationType: PublicationType
  sourceUrl?: string
  doi?: string
  publishedYear?: number
  imageData?: ImageData     // base64 for S3 upload
  pdfUrl?: string           // already-uploaded S3 key
  creatorId: string
  initialAuthors?: Array<{
    userName: string
    affiliation?: string
    userId?: string
    isCorresponding?: boolean
  }>
}): Promise<{ publication: AppPublication } | { error: string }>
```

Steps inside `createPublication()`:
1. Validate slug uniqueness
2. Validate DOI format (if provided): matches `/^10\.\d{4,}(\.\d+)*\/\S+/`
3. Validate `sourceUrl` host if provided
4. Upload image to S3 if `imageData` provided
5. Insert into `publication`
6. Insert creator as `publication_author` (order = 1)
7. Insert any additional `initialAuthors` in order
8. Return mapped `AppPublication`

---

## 8. UI Components

### Files to create (mirror SubXeuron pattern):

| Component | Description |
|-----------|-------------|
| `components/publication/CreatePublicationButton.tsx` | Dialog trigger + form (mirrors `CreateSubXeuronButton`) |
| `components/publication/PublicationBanner.tsx` | Header banner for `/p/[slug]` page |
| `components/publication/PublicationCard.tsx` | Card for listing views |
| `components/publication/PublicationAuthors.tsx` | Ordered author list display |
| `components/publication/CollaboratorPanel.tsx` | Invite + manage collaborators |
| `components/publication/LinkSubxeuronPanel.tsx` | Cross-link input widget |
| `components/publication/PublicationCombobox.tsx` | Mirrors `SubxeuronCombobox` for selecting a pub when creating a post |

### Page routes to create:

```
app/(app)/p/[slug]/page.tsx           ← publication detail
app/(app)/p/[slug]/edit/page.tsx      ← edit (creator/collab only)
app/(app)/create-publication/page.tsx ← creation wizard
```

---

## 9. Create Publication Form Fields

| Field | Required | Validation |
|-------|----------|------------|
| Title | Yes | 3–200 chars |
| Slug | Yes | auto-generated from title; 3–60 chars; `[a-z0-9-]+`; unique |
| Publication Type | Yes | enum (dropdown) |
| Abstract | No | plain text, up to 2000 chars |
| Description | No | up to 500 chars |
| DOI | No | validated regex; normalized without `https://doi.org/` |
| Source URL | No | doi.org / arxiv.org / nature.com / pubmed.ncbi.nlm.nih.gov |
| Published Year | No | 4-digit year ≤ current year |
| PDF | No | ≤ 20MB, application/pdf |
| Cover Image | No | image/*, uploaded to S3 |
| Additional Authors | No | dynamic list: name + affiliation + optional @username |

---

## 10. Cross-Link Widget

**Placement:** Publication detail page sidebar, and SubXeuron detail page sidebar.

**Input accepts either:**
- `/x/subxeuronSlug` → parsed to look up the subxeuron by slug
- `https://xeuron.com/x/subxeuronSlug` → same
- `/p/pubSlug` → parsed to look up the publication by slug
- `https://xeuron.com/p/pubSlug` → same

**Server Action (`action/linkPublication.ts`):**
1. Parse the input to determine type (`x/` or `p/`) and slug
2. Verify the target entity exists
3. Verify the calling user is authorized (publication creator/collaborator or subxeuron moderator)
4. Insert into `publication_subxeuron`
5. Return the linked entity for optimistic UI update

---

## 11. Notifications (Future)

When a collaborator is invited, insert a record into a `notification` table (to be designed separately). For now, the invitation list is visible on the collaborator's profile page under "Pending Invitations".

---

## 12. Migration File Naming

Follow the established pattern:

```
supabase/migrations/20260222130000_create_publication_tables.sql
```

Contents: all DDL from sections 3.1–3.5, RLS from section 5, search trigger from section 4.

---

## 13. Open Questions / Decisions Needed

1. **Publication edit permissions:** Should accepted `co-author` collaborators be able to edit the full body, or only their author entry? Recommend: collaborators can edit body/abstract; only creator can change slug, type, or delete.
2. **DOI deduplication:** If a DOI already exists in the DB, should the system warn the user or block creation? Recommend: warn and link to the existing publication.
3. **Author ordering UI:** Drag-to-reorder list or manual number input? Recommend: drag-to-reorder (react-dnd or @dnd-kit).
4. **Off-platform author claiming:** If a user later signs up with a matching email, should they auto-claim authorship? Design a claim flow for v2.
5. **SubXeuron ↔ Publication link display:** Show linked publications in the SubXeuron sidebar? Yes — surface as "Related Publications" panel.
