import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { getEventById } from '@/lib/supabase/events'
import { getQuestionsForEvent, getAnswersForQuestion } from '@/lib/supabase/event-qa'
import { getPollsForEvent } from '@/lib/supabase/event-polls'
import { getPostsForEvent } from '@/lib/supabase/posts'
import { isEventFavoritedByUser } from '@/lib/supabase/event-favorites'
import { getUser } from '@/lib/supabase/user'
import { EventBanner } from '@/components/event/EventBanner'
import { QuestionInput } from '@/components/event/QuestionInput'
import { QuestionCard } from '@/components/event/QuestionCard'
import { PollCard } from '@/components/event/PollCard'
import Post from '@/components/post/Post'

const VALID_TABS = ['qa', 'polls', 'discussions', 'info'] as const
type EventTab = typeof VALID_TABS[number]

export default async function StandaloneEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { eventId } = await params
  const { tab: rawTab = 'qa' } = await searchParams
  const tab: EventTab = (VALID_TABS as readonly string[]).includes(rawTab) ? rawTab as EventTab : 'qa'

  const event = await getEventById(eventId)
  if (!event) notFound()

  // If event is linked to a publication, redirect to canonical URL under publication
  if (event.publicationSlug) {
    redirect(`/p/${event.publicationSlug}/events/${eventId}${tab !== 'qa' ? `?tab=${tab}` : ''}`)
  }

  const user = await getUser()
  const userId = 'error' in user ? null : user._id
  const isEventCreator = userId === event.creator?._id
  const isFavorited = userId ? await isEventFavoritedByUser(userId, eventId) : false

  const [questionsRaw, polls, discussionPosts] = await Promise.all([
    tab === 'qa' ? getQuestionsForEvent(eventId, userId) : Promise.resolve([]),
    tab === 'polls' ? getPollsForEvent(eventId, userId) : Promise.resolve([]),
    tab === 'discussions' ? getPostsForEvent(eventId) : Promise.resolve([]),
  ])

  const questions =
    tab === 'qa' && questionsRaw.length > 0
      ? await Promise.all(
          questionsRaw.map(async (q) => {
            const answers = await getAnswersForQuestion(q._id, userId)
            return { ...q, answers }
          })
        )
      : []

  return (
    <>
      <EventBanner
        event={event}
        publicationSlug={event.publicationSlug ?? undefined}
        publicationTitle={event.publicationTitle ?? undefined}
        userId={userId}
        isFavorited={isFavorited}
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {VALID_TABS.map((t) => (
            <a
              key={t}
              href={`?tab=${t}`}
              className={`flex-1 rounded-lg py-1.5 text-center text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'qa' ? 'Q&A' : t.charAt(0).toUpperCase() + t.slice(1)}
            </a>
          ))}
        </div>

        {tab === 'qa' && (
          <div className="space-y-4">
            {event.isQaLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                🔒 Q&A is locked for this event.
              </div>
            )}

            {!event.isQaLocked && userId && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Ask a Question</h3>
                <QuestionInput eventId={eventId} />
              </div>
            )}

            {!userId && !event.isQaLocked && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-indigo-500 hover:underline">Sign in</Link> to ask a question.
              </div>
            )}

            {questions.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">All questions</h2>
                <p className="text-sm text-muted-foreground">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} submitted. Vote up the ones you find most relevant.
                </p>
                <ul className="space-y-3">
                  {questions.map((q) => (
                    <li key={q._id}>
                      <QuestionCard
                        question={q}
                        userId={userId}
                        isQaLocked={event.isQaLocked}
                        eventId={eventId}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No questions yet. Be the first to ask!
              </p>
            )}

            {isEventCreator && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Creator Controls</h3>
                <div className="flex gap-2">
                  {!event.isQaLocked && (
                    <form action="/api/lock-event" method="post">
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="target" value="qa" />
                      <button
                        type="submit"
                        className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        🔒 Lock Q&A
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'polls' && (
          <div className="space-y-4">
            {event.isPollLocked && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                🔒 Polls are locked for this event.
              </div>
            )}

            {isEventCreator && !event.isPollLocked && (
              <a
                href={`/events/${eventId}/create-poll`}
                className="block rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/10 dark:text-indigo-400"
              >
                + Create Poll
              </a>
            )}

            {polls.length > 0 ? (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <PollCard key={poll._id} poll={poll} userId={userId} eventId={eventId} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No polls yet.{isEventCreator && ' Create one above.'}
              </p>
            )}
          </div>
        )}

        {tab === 'discussions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Discussion Posts ({discussionPosts.length})
              </h2>
              {userId && (
                <Link
                  href={`/create-post?event=${eventId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <PenLine size={12} className="text-cyan-600 dark:text-cyan-400" />
                  + Create Post
                </Link>
              )}
            </div>
            {discussionPosts.length > 0 ? (
              <div className="space-y-4">
                {discussionPosts.map((post) => (
                  <Post key={post._id} post={post} userId={userId} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No discussion posts yet.{userId ? ' Be the first to post!' : ''}
              </p>
            )}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-6">
            {event.description && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {event.description}
                </p>
              </section>
            )}

            {event.urls && event.urls.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Additional Links
                </h2>
                <ul className="space-y-2">
                  {event.urls.map((u) => (
                    <li key={u._id}>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-500 hover:underline"
                      >
                        {u.label ?? u.urlType} →
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Event Details
              </h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Type</dt>
                  <dd className="text-foreground capitalize">
                    {event.eventTypeCustom ?? event.eventType.replace('_', ' ')}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Format</dt>
                  <dd className="text-foreground">{event.isVirtual ? 'Virtual' : 'In-person'}</dd>
                </div>
                {event.venue && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Venue</dt>
                    <dd className="text-foreground">{event.venue}</dd>
                  </div>
                )}
                {(event.city || event.country) && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Location</dt>
                    <dd className="text-foreground">
                      {[event.city, event.country].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Timezone</dt>
                  <dd className="font-mono text-xs text-foreground">{event.timezone}</dd>
                </div>
                {event.creator && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Organizer</dt>
                    <dd>
                      <a href={`/u/${event.creator.username}`} className="text-indigo-500 hover:underline">
                        {event.creator.username}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
        )}
      </div>
    </>
  )
}
