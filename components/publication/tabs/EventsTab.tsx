import Link from 'next/link'
import { getEventsForPublication } from '@/lib/supabase/events'
import { EventCard } from '@/components/event/EventCard'

interface Props {
  publicationId: string
  slug: string
  userId: string | null
  isCreator: boolean
}

export async function EventsTab({ publicationId, slug, isCreator }: Props) {
  const events = await getEventsForPublication(publicationId)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Events ({events.length})
        </h2>
        {isCreator && (
          <Link
            href={`/p/${slug}/events/create`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            + Add Event
          </Link>
        )}
      </div>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventCard key={ev._id} event={ev} publicationSlug={slug} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No events yet.{isCreator && ' Use "Add Event" to create the first one.'}
          </p>
        </div>
      )}
    </div>
  )
}
