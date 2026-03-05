import Link from 'next/link'
import { getAllEvents } from '@/lib/supabase/events'
import { getUser } from '@/lib/supabase/user'
import { EventCard } from '@/components/event/EventCard'

const TOP_N = 5

export default async function EventsLandingPage() {
  const [byCreated, byEventDate, user] = await Promise.all([
    getAllEvents({ limit: TOP_N, sortBy: 'created_at', ascending: false }),
    getAllEvents({ limit: TOP_N, sortBy: 'event_date', ascending: false }),
    getUser(),
  ])
  const isLoggedIn = !('error' in user)

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        {isLoggedIn ? (
          <Link
            href="/events/create"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Create event
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Sign in to create event
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by date (most recent)</h2>
        <ul className="space-y-2">
          {byCreated.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No events yet.
            </li>
          ) : (
            byCreated.map((ev) => (
              <li key={ev._id}>
                <EventCard event={ev} publicationSlug={ev.publicationSlug ?? undefined} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} by event date (soonest)</h2>
        <ul className="space-y-2">
          {byEventDate.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No events yet.
            </li>
          ) : (
            byEventDate.map((ev) => (
              <li key={ev._id}>
                <EventCard event={ev} publicationSlug={ev.publicationSlug ?? undefined} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Top {TOP_N} most recent</h2>
        <p className="mb-2 text-xs text-muted-foreground">Same as &quot;by date&quot; until upvotes/views are added.</p>
        <ul className="space-y-2">
          {byCreated.length === 0 ? (
            <li className="rounded-lg border border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
              No events yet.
            </li>
          ) : (
            byCreated.slice(0, TOP_N).map((ev) => (
              <li key={ev._id}>
                <EventCard event={ev} publicationSlug={ev.publicationSlug ?? undefined} />
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  )
}
