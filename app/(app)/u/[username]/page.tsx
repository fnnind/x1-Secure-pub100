import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUserByUsername } from '@/lib/supabase/user'
import { getPublicationsByCreator } from '@/lib/supabase/publications'
import { toPublicImageUrl } from '@/lib/image'
import { UserCircle2 } from 'lucide-react'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const profile = await getUserByUsername(username)
  if (!profile) notFound()

  const publications = await getPublicationsByCreator(profile._id)

  const avatarUrl = profile.imageUrl ? toPublicImageUrl(profile.imageUrl) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={profile.username}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UserCircle2 className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">u/{profile.username}</h1>
        </div>
      </div>

      {/* Publications */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Publications
          {publications.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({publications.length})
            </span>
          )}
        </h2>

        {publications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            No publications yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {publications.map((pub) => (
              <li key={pub._id}>
                <Link
                  href={`/p/${pub.slug}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <p className="mb-1 text-sm font-semibold text-foreground leading-snug">
                    {pub.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {pub.publicationType && (
                      <span className="capitalize">
                        {pub.publicationType.replace(/_/g, ' ')}
                      </span>
                    )}
                    {pub.publishedYear && (
                      <>
                        <span>·</span>
                        <span>{pub.publishedYear}</span>
                      </>
                    )}
                    {pub.fieldOfStudy && (
                      <>
                        <span>·</span>
                        <span>{pub.fieldOfStudy}</span>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
