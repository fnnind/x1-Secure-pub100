import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getUserByUsername, getUser } from '@/lib/supabase/user'
import { getPublicationsByCreator } from '@/lib/supabase/publications'
import { getEventsCreatedByUser } from '@/lib/supabase/events'
import { toPublicImageUrl } from '@/lib/image'
import { UserCircle2, Settings } from 'lucide-react'
import type { UserCategory } from '@/lib/supabase/types'

const CATEGORY_LABELS: Record<UserCategory, string> = {
  researcher: 'Researcher',
  academic: 'Academic',
  industry_professional: 'Industry Professional',
  independent_scientist: 'Independent Scientist',
  builder: 'Builder',
  engineer: 'Engineer',
  professional: 'Professional',
  curiosity: 'Curious Mind',
  intellect: 'Intellect',
  other: 'Other',
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const [profile, currentUser] = await Promise.all([
    getUserByUsername(username),
    getUser(),
  ])
  if (!profile) notFound()

  const isOwner = !('error' in currentUser) && currentUser._id === profile._id
  const showExtended = isOwner || (profile.isProfilePublic ?? false)

  const [publications, events] = await Promise.all([
    getPublicationsByCreator(profile._id),
    getEventsCreatedByUser(profile._id),
  ])

  const avatarUrl = profile.imageUrl ? toPublicImageUrl(profile.imageUrl) : null
  const displayName = profile.nickname ?? profile.username

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
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
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            {profile.nickname && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            {showExtended && profile.firstName && (
              <p className="text-sm text-muted-foreground">
                {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            {showExtended && profile.category && (
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {CATEGORY_LABELS[profile.category]}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <Link
            href="/settings/profile"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Profile
          </Link>
        )}
      </div>

      {/* Extended fields — owner or public profile only */}
      {showExtended && (
        <div className="mb-8 space-y-4 rounded-xl border border-border bg-card p-6">
          {profile.innovationSummary && (
            <div>
              <h2 className="mb-1 text-sm font-semibold text-foreground">Innovation Summary</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.innovationSummary}</p>
            </div>
          )}
          {(profile.interests ?? []).length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Interests</h2>
              <div className="flex flex-wrap gap-1.5">
                {(profile.interests ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(profile.expertise ?? []).length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Expertise</h2>
              <div className="flex flex-wrap gap-1.5">
                {(profile.expertise ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publications */}
      <section className="mb-8">
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
                      <span className="capitalize">{pub.publicationType.replace(/_/g, ' ')}</span>
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

      {/* Events */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Events
          {events.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({events.length})
            </span>
          )}
        </h2>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            No events yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event._id}>
                <Link
                  href={
                    event.publicationSlug
                      ? `/p/${event.publicationSlug}/events/${event._id}`
                      : `/events/${event._id}`
                  }
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <p className="mb-1 text-sm font-semibold text-foreground leading-snug">
                    {event.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                    {event.city && (
                      <>
                        <span>·</span>
                        <span>{event.city}</span>
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
