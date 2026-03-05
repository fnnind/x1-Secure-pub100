import Link from 'next/link'
import type { AppEvent } from '@/lib/supabase/types'

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

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  zoom: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  webinar: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  meetup: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  workshop: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  seminar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

interface Props {
  event: AppEvent
  publicationSlug?: string
}

function formatDateRange(ev: AppEvent): string {
  const start = ev.startDate ?? ev.eventDate
  const end = ev.endDate
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  if (end && end !== start) return `${fmt(start)} – ${fmt(end)}`
  return fmt(start)
}

export function EventCard({ event: ev, publicationSlug }: Props) {
  const href = publicationSlug
    ? `/p/${publicationSlug}/events/${ev._id}`
    : `/events/${ev._id}`

  const typeLabel = ev.eventTypeCustom ?? EVENT_TYPE_LABELS[ev.eventType] ?? 'Event'
  const typeColor = EVENT_TYPE_COLORS[ev.eventType] ?? EVENT_TYPE_COLORS.other
  const dateStr = formatDateRange(ev)
  const isPast = new Date(ev.eventDate) < new Date()

  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card dark:border-white/[0.06]"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
          {typeLabel}
        </span>
        {ev.isVirtual && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Virtual
          </span>
        )}
        {isPast && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            Past
          </span>
        )}
      </div>

      <h3 className="mb-1 text-sm font-bold text-foreground">{ev.title}</h3>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>{dateStr}</span>
        {ev.venue && !ev.isVirtual && (
          <span>
            {ev.venue}
            {ev.city && `, ${ev.city}`}
            {ev.country && `, ${ev.country}`}
          </span>
        )}
        {ev.timezone !== 'UTC' && <span className="font-mono">{ev.timezone}</span>}
      </div>

      {ev.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{ev.description}</p>
      )}

      {ev.recordedVideoUrl && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <span aria-hidden>🎬</span> Recording available
          </span>
        </div>
      )}
    </Link>
  )
}
