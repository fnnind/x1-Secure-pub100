import { searchSubxeurons } from '@/lib/supabase/subxeurons'
import { searchPublications } from '@/lib/supabase/publications'
import { searchSubxeuronsByTag, searchEventsByTag } from '@/lib/supabase/tags'
import { getSubxeuronsByIds } from '@/lib/supabase/subxeurons'
import { getEventsCreatedByUser } from '@/lib/supabase/events'
import Link from 'next/link'
import Image from 'next/image'
import { toPublicImageUrl } from '@/lib/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/server'
import { mapEvent } from '@/lib/supabase/mappers'

async function getEventsByIds(ids: string[]) {
  if (!ids.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select('id, title, slug, event_type, event_date, venue, city, country, is_virtual, is_deleted, publication_id, creator:user(id, username, email, image_url), publication:publication(slug)')
    .in('id', ids)
    .eq('is_deleted', false)
  if (!data?.length) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => mapEvent(r)).filter(Boolean)
}

async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>
}) {
  const { query } = await searchParams
  const q = query?.trim() ?? ''

  const [subxeurons, publications, subTagMatches, eventTagMatches] = await Promise.all([
    searchSubxeurons(q),
    searchPublications(q),
    q ? searchSubxeuronsByTag(q) : Promise.resolve([]),
    q ? searchEventsByTag(q) : Promise.resolve([]),
  ])

  // Merge FTS subxeuron results with tag-matched subxeurons (deduplicated)
  const subxeuronIds = new Set(subxeurons.map((s) => s._id))
  const extraSubIds = subTagMatches.map((m) => m.subxeuronId).filter((id) => !subxeuronIds.has(id))
  const extraSubs = extraSubIds.length ? await getSubxeuronsByIds(extraSubIds) : []
  const allSubxeurons = [...subxeurons, ...extraSubs]

  // Events from tag search
  const eventIds = eventTagMatches.map((m) => m.eventId)
  const tagEvents = eventIds.length ? await getEventsByIds(eventIds) : []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground">
          {q ? `Results for "${q}"` : 'Enter a query to search SubXeurons, Publications, and Events.'}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* SubXeurons */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            SubXeurons ({allSubxeurons.length})
          </h2>
          <ul className="space-y-2">
            {allSubxeurons.length === 0 ? (
              <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                {q ? 'No subxeurons found.' : 'Search to find subxeurons.'}
              </li>
            ) : (
              allSubxeurons.map((s) => (
                <li key={s._id} className="rounded-lg border border-border bg-card overflow-hidden">
                  <Link
                    href={`/x/${s.slug}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      {s.image_url && (
                        <AvatarImage src={toPublicImageUrl(s.image_url)} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {s.title?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{s.title}</div>
                      {s.description && (
                        <p className="truncate text-sm text-muted-foreground">{s.description}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Publications */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Publications ({publications.length})
          </h2>
          <ul className="space-y-2">
            {publications.length === 0 ? (
              <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                {q ? 'No publications found.' : 'Search to find publications.'}
              </li>
            ) : (
              publications.map((p) => (
                <li key={p._id} className="rounded-lg border border-border bg-card overflow-hidden">
                  <Link
                    href={`/p/${p.slug}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    {p.image_url ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={toPublicImageUrl(p.image_url)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold">
                        {p.title?.charAt(0) ?? '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{p.title}</div>
                      {(p.description ?? p.abstract) && (
                        <p className="truncate text-sm text-muted-foreground">
                          {p.description ?? p.abstract}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Events (tag-based) */}
        {q && (
          <section className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Events by tag ({tagEvents.length})
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tagEvents.length === 0 ? (
                <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                  No events found for that tag.
                </li>
              ) : (
                tagEvents.map((e) => {
                  if (!e) return null
                  const href = e.publicationSlug
                    ? `/p/${e.publicationSlug}/events/${e._id}`
                    : `/events/${e._id}`
                  return (
                    <li key={e._id} className="rounded-lg border border-border bg-card overflow-hidden">
                      <Link href={href} className="block p-4 transition-colors hover:bg-muted/50">
                        <div className="font-medium text-foreground">{e.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {e.venue ?? 'Virtual'}{e.city ? `, ${e.city}` : ''}{e.country ? `, ${e.country}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{e.eventDate}</p>
                      </Link>
                    </li>
                  )
                })
              )}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}

export default SearchPage
