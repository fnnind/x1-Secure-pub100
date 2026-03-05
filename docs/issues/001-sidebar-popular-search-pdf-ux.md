# Side menu consistency, Popular/Hot pages, unified search, and PDF link visibility

**Type:** Improvement / Feature  
**Priority:** Normal  
**Effort:** Medium (multi-touch)

**Progress:** 100% (4/4 complete)

---

## TL;DR

Four UX/UI improvements: (1) unify side menu styling for Create SubXeuron vs Create Publication; (2) implement Popular and Hot/Controversial pages with SubXeuron + Publication lists and pagination; (3) search both publications and subxeurons and show results in two side-by-side panels; (4) make PDF links stand out with a clearer icon and styling.

---

## 1. Side menu: inconsistent font/UI/theme for Create actions ✅

**Status:** Done. Both triggers use the same typography (text-sm font-medium), padding (p-5), icon size (h-4 w-4 mr-2), and theme-aware classes (text-foreground, hover:bg-sidebar-accent). Publication label set to "Create New Publication".

**Current:** ~~"Create a SubXeuron" (via `CreateSubXeuronButton`) and "Create New Publication" (via `CreatePublicationButton`) sit next to each other in the sidebar but use different fonts, UI elements, and color theme.~~

**Expected:** Both entries share the same typography, component pattern (e.g. both triggers or both links), and color theme so the sidebar feels consistent.

**Relevant files:**
- `components/app-sidebar.tsx` — layout of both buttons
- `components/header/CreateSubXeuronButton.tsx` — trigger styling/label
- `components/publication/CreatePublicationButton.tsx` — trigger styling/label

**Notes:** May require one to be refactored to match the other (e.g. same `SidebarMenuButton` usage, same text size/weight, same icon size/color).

---

## 2. Popular & Hot/Controversial pages: SubXeurons + Publications, two rows, pagination ✅

**Status:** Done. `/popular` and `/hot` both use a shared two-row layout (SubXeurons upper, Publications lower), paginated at 5 per page. Data layer: `getSubxeurons`/`getPublications` accept optional `{ page, pageSize }`; `getSubxeuronsCount`/`getPublicationsCount` added. Popular currently uses most recent (no popularity metric yet); Hot uses most recent.

**Current:** ~~Sidebar links to `/popular` and `/hot`; behavior of those routes is unclear or not implemented as described.~~

**Expected:**
- **Popular:** Returns most popular SubXeurons and most popular Publications. If there aren’t enough articles for “popular”, use most recent. Page layout: **two rows** — upper half = SubXeuron list, lower half = Publication list. Paginate each list (e.g. 5 entries per page).
- **Hot/Controversial:** Returns most recent (SubXeurons and/or Publications). Same layout: two rows, upper = SubXeurons, lower = Publications, paginated (e.g. 5 per page).

**Relevant files:**
- `components/app-sidebar.tsx` — links to `/popular`, `/hot`
- `app/(app)/popular/page.tsx` — to be created or updated
- `app/(app)/hot/page.tsx` — to be created or updated
- Data layer: SubXeuron and Publication listing/sorting (e.g. `lib/supabase/subxeurons.ts`, `lib/supabase/publications.ts` or equivalent) — may need “popular” and “recent” queries.

**Notes:** “Popular” needs a definition (e.g. by post count, votes, or recent activity). Hot/Controversial is specified as “most recent” here.

---

## 3. Search: publications + subxeurons, two panels ✅

**Status:** Done. Search page runs `searchSubxeurons` and `searchPublications` in parallel; results shown in two panels side-by-side (grid lg:grid-cols-2). Search form placeholder updated to “Search subXeurons & publications…”.

**Current:** ~~Search bar and search results likely target one entity type (e.g. subxeurons only) and a single list.~~

**Expected:** Search runs against **both** publications and subxeurons. Results page shows **two panels side-by-side** (e.g. SubXeurons list | Publications list) on the same `page.tsx`, consistent with the Popular/Hot layout idea.

**Relevant files:**
- `app/(app)/search/page.tsx` — results layout and query params
- Search form component (e.g. in sidebar or header) — ensure it submits to unified search
- `lib/supabase/subxeurons.ts` (e.g. `searchSubxeurons`) and publication search if it exists

**Notes:** Backend may need a combined search or two parallel queries; frontend merges into two panels.

---

## 4. PDF link: clearer icon and visibility ✅

**Status:** Done. Subxeuron banner (`app/(app)/x/[slug]/page.tsx`) and Publication banner (`PublicationBanner.tsx`) now use Lucide `FileText` icon and shared styling: `border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 focus:ring-2 focus:ring-primary/50` for visibility and accessibility.

**Current:** ~~PDF links use a text-style icon (e.g. 📄) and styling (e.g. `bg-gray-100 text-gray-700`) that gets lost with the current color theme and is hard to see.~~

**Expected:** Use a more visible, elegant PDF icon (e.g. Lucide `FileText` or a dedicated PDF icon) and adjust styles (e.g. contrast, border, or accent color) so the PDF link is clearly recognizable and accessible.

**Relevant files:**
- `app/(app)/x/[slug]/page.tsx` — SubXeuron PDF link in banner (around line 80–90)
- `components/publication/PublicationBanner.tsx` — Publication PDF link (around line 107–116)

**Notes:** Ensure focus states and contrast meet accessibility; consider dark mode if the app supports it.

---

## Labels (suggested)

- **Type:** `improvement`, `feature`
- **Priority:** `normal`
- **Effort:** `medium`
