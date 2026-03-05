import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getEventById } from '@/lib/supabase/events'
import { getUser } from '@/lib/supabase/user'
import { EditEventForm } from '@/components/event/EditEventForm'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>
}) {
  const { slug, eventId } = await params

  const user = await getUser()
  if ('error' in user) redirect('/login')

  const [publication, event] = await Promise.all([
    getPublicationBySlug(slug),
    getEventById(eventId),
  ])

  if (!publication) notFound()
  if (!event || event.publicationId !== publication._id) notFound()

  // Only the event creator can edit
  if (event.creator?._id !== user._id) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/p/${slug}/events/${eventId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to event
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Edit Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      </div>
      <EditEventForm event={event} publicationSlug={slug} />
    </div>
  )
}
