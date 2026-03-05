import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPublicationBySlug } from '@/lib/supabase/publications'
import { getUser } from '@/lib/supabase/user'
import { EditPublicationForm } from '@/components/publication/EditPublicationForm'

export default async function EditPublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const user = await getUser()
  if ('error' in user) redirect('/login')

  const publication = await getPublicationBySlug(slug)
  if (!publication) notFound()

  // Only the creator can edit
  if (publication.creator?._id !== user._id) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/p/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to publication
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Edit Publication</h1>
      </div>
      <EditPublicationForm publication={publication} />
    </div>
  )
}
