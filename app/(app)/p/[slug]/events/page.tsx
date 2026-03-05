import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getEventsForPublication } from '@/lib/supabase/events'
import { getUser } from '@/lib/supabase/user'
import { EventCard } from '@/components/event/EventCard'

export default async function PublicationEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const publication = await getPublicationBySlug(slug)
  if (!publication) notFound()

  const user = await getUser()
  const userId = 'error' in user ? null : user._id
  const isCreator = userId === publication.creator?._id
  const events = await getEventsForPublication(publication._id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/p/${slug}`} className="text-sm text-muted-foreground hover:underline">
            ← {publication.title}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Events</h1>
        </div>
        {isCreator && (
          <Link
            href={`/p/${slug}/events/create`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Event
          </Link>
        )}
      </div>

      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map((ev) => (
            <EventCard key={ev._id} event={ev} publicationSlug={slug} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-muted-foreground">No events yet for this publication.</p>
          {isCreator && (
            <Link
              href={`/p/${slug}/events/create`}
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create First Event
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
