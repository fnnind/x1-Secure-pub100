import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getEventById } from '@/lib/supabase/events'
import { getUser } from '@/lib/supabase/user'
import { getDefaultPollClosesAt } from '@/lib/utils/poll-defaults'
import { CreatePollForm } from '@/components/event/CreatePollForm'

export default async function CreatePollPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>
}) {
  const { slug, eventId } = await params

  const publication = await getPublicationBySlug(slug)
  if (!publication) notFound()

  const event = await getEventById(eventId)
  if (!event || event.publicationId !== publication._id) notFound()

  const user = await getUser()
  if ('error' in user) redirect('/login')
  if (user._id !== event.creator?._id) redirect(`/p/${slug}/events/${eventId}?tab=polls`)

  if (event.isPollLocked) {
    redirect(`/p/${slug}/events/${eventId}?tab=polls`)
  }

  const backHref = `/p/${slug}/events/${eventId}?tab=polls`
  const defaultClosesAt = getDefaultPollClosesAt(
    event.eventDate,
    event.eventTime ?? null,
    event.timezone
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to event
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Create poll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a poll for <strong>{event.title}</strong>.
        </p>
      </div>
      <CreatePollForm eventId={eventId} backHref={backHref} defaultClosesAt={defaultClosesAt} />
    </div>
  )
}
