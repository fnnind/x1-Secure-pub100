import Link from 'next/link'
import type { AppEvent } from '@/lib/supabase/types'
import { EventCountdown } from './EventCountdown'
import { EventFavoriteButton } from './EventFavoriteButton'
import { ShareButton } from '@/components/ShareButton'

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: 'Conference',
  meetup: 'Meetup',
  presentation: 'Presentation',
  zoom: 'Zoom',
  webinar: 'Webinar',
  workshop: 'Workshop',
  symposium: 'Symposium',
  seminar: 'Seminar',
  poster_session: 'Poster Session',
  panel: 'Panel',
  other: 'Event',
}

interface Props {
  event: AppEvent
  publicationSlug?: string
  publicationTitle?: string
  userId?: string | null
  isFavorited?: boolean
}

function formatDateRange(ev: AppEvent): string {
  const start = ev.startDate ?? ev.eventDate
  const end = ev.endDate
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  if (end && end !== start) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start)
}

export function EventBanner({ event: ev, publicationSlug, publicationTitle, userId, isFavorited = false }: Props) {
  const isCreator = userId && ev.creator?._id === userId
  const typeLabel = ev.eventTypeCustom ?? EVENT_TYPE_LABELS[ev.eventType] ?? 'Event'
  const dateStr = formatDateRange(ev)

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-2 text-sm text-muted-foreground">
          {publicationSlug && publicationTitle ? (
            <>
              <Link href={`/p/${publicationSlug}`} className="hover:underline">
                ← {publicationTitle}
              </Link>
              <span className="mx-2">›</span>
              <Link href={`/p/${publicationSlug}/events`} className="hover:underline">
                Events
              </Link>
            </>
          ) : (
            <Link href="/events" className="hover:underline">
              ← Events
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {typeLabel}
              </span>
              {ev.isVirtual && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800">
                  Virtual
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-foreground">{ev.title}</h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{dateStr}</span>
              {ev.venue && (
                <span>
                  {ev.venue}
                  {ev.city && `, ${ev.city}`}
                  {ev.country && `, ${ev.country}`}
                </span>
              )}
              {ev.timezone !== 'UTC' && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{ev.timezone}</span>
              )}
            </div>

            {/* URLs */}
            <div className="flex flex-wrap gap-2">
              {ev.conferenceUrl && (
                <a
                  href={ev.conferenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  🌐 Conference URL
                </a>
              )}
              {ev.recordedVideoUrl && (
                <a
                  href={ev.recordedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  🎬 Recording
                </a>
              )}
              {ev.linkedUrl && (
                <a
                  href={ev.linkedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  🔗 Link
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <ShareButton
                path={ev.publicationId ? `/p/${publicationSlug}/events/${ev._id}` : `/events/${ev._id}`}
              />
              {userId && (
                <EventFavoriteButton eventId={ev._id} initialFavorited={isFavorited} />
              )}
              {isCreator && (
                <Link
                  href={ev.publicationId ? `/p/${publicationSlug}/events/${ev._id}/edit` : `/events/${ev._id}/edit`}
                  className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Edit Event
                </Link>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <EventCountdown eventDate={ev.eventDate} startDate={ev.startDate} endDate={ev.endDate} />
          </div>
        </div>
      </div>
    </section>
  )
}
