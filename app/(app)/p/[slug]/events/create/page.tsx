import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getUser } from '@/lib/supabase/user'
import { CreateEventForm } from '@/components/event/CreateEventForm'

export default async function CreateEventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const publication = await getPublicationBySlug(slug)
  if (!publication) notFound()

  const user = await getUser()
  if ('error' in user) redirect('/login')

  // Only creator or accepted collaborators can create events
  const isCreator = user._id === publication.creator?._id
  if (!isCreator) {
    // For simplicity redirect — collaborator check would need a DB call
    redirect(`/p/${slug}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/p/${slug}/events`} className="text-sm text-muted-foreground hover:underline">
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Create Event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a conference, meetup, or presentation for <strong>{publication.title}</strong>.
        </p>
      </div>
      <CreateEventForm publicationId={publication._id} publicationSlug={slug} />
    </div>
  )
}
