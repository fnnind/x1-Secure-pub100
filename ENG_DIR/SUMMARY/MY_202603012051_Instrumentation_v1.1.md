⏺ Here's a summary of everything implemented for Feature v1.1:                                                                                 
                                                                                                                                               
  ---                                                                                                                                          
  ✅ Feature 1 — Default to Home                                                                                                               
                                                                                                                                               
  ┌────────────────────────────┬──────────────────────────────────────────────────────────────┐                                                
  │            File            │                            Change                            │                                                
  ├────────────────────────────┼──────────────────────────────────────────────────────────────┤                                                
  │ components/app-sidebar.tsx │ Logo <Link href=""> → <a href="https://www.xeuron.com">      │                                                
  ├────────────────────────────┼──────────────────────────────────────────────────────────────┤                                                
  │ app/not-found.tsx (new)    │ 404 page with 3-second countdown then redirect to xeuron.com │                                                
  └────────────────────────────┴──────────────────────────────────────────────────────────────┘                                                

  ---                                                                                                                                          
  ✅ Feature 2 — Instrumentation                                                                                                               
                                                                                                                                               
  ┌────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────┐   
  │                      File                      │                                        Purpose                                        │   
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤   
  │ supabase/migrations/20260301000000_...sql      │ page_view table (entity_type, entity_id, viewer_id) with RLS                          │
  │ (new)                                          │                                                                                       │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ app/api/track/route.ts (new)                   │ POST endpoint that records page views                                                 │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ components/shared/TrackView.tsx (new)          │ Client component — drop <TrackView entityType="publication" entityId={id} /> on any   │
  │                                                │ page                                                                                  │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ lib/supabase/analytics.ts (new)                │ `getPopularEntityIds(type, '24h'                                                      │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ app/(app)/popular/page.tsx (rewritten)         │ Period selector tabs (24h / 7d / 30d), ranked by real view counts with fallback to    │
  │                                                │ most-recent                                                                           │
  └────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────┘

  ---
  ✅ Feature 3 — Email Notifications

  ┌────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │              File              │                                                Purpose                                                │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ lib/email.ts (new)             │ sendEmail() via Resend REST API; buildCommentNotificationEmail(), buildAnswerNotificationEmail() with │
  │                                │  full HTML templates                                                                                  │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ action/createComment.ts        │ After comment insert, fire-and-forget email to post author                                            │
  │ (updated)                      │                                                                                                       │
  ├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ action/createAnswer.ts         │ After answer insert, fire-and-forget email to question author                                         │
  │ (updated)                      │                                                                                                       │
  └────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Requires .env.local:
  RESEND_API_KEY=re_...
  RESEND_FROM_EMAIL=Xeuron <noreply@xeuron.com>
  NEXT_PUBLIC_BASE_URL=https://www.xeuron.com

  ---
  ✅ Feature 4 — Word Tags for Search

  ┌────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                File                │                                              Purpose                                              │
  ├────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Migration (above)                  │ subxeuron_tag + event_tag tables with RLS                                                         │
  ├────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ lib/supabase/tags.ts (new)         │ addSubxeuronTag, addEventTag, removeSubxeuronTag, removeEventTag, searchSubxeuronsByTag,          │
  │                                    │ searchEventsByTag                                                                                 │
  ├────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ app/(app)/search/page.tsx          │ Merges FTS results with tag-matched subxeurons; adds third panel for Events-by-tag                │
  │ (updated)                          │                                                                                                   │
  └────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘

  To activate tags on creation, add tag inputs to CreateSubxeuronForm and CreateEventForm that call addSubxeuronTag / addEventTag after
  creation. The service layer is fully ready.

  Next step: Run pnpx supabase db push --include-all to apply the migration.
