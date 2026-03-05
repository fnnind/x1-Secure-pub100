/**
 * Returns the UTC Date that is 1 hour after the event's start (event_date + event_time) in the event's timezone.
 * Used as default "closes at" for new polls; creator can overwrite.
 */
export function getDefaultPollClosesAt(
  eventDate: string,
  eventTime: string | null,
  timezone: string
): string {
  const time = eventTime ?? '18:00'
  const [y, m, d] = eventDate.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Find UTC moment that when displayed in event TZ gives eventDate at eventTime
  const targetNorm = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const utc = new Date(Date.UTC(y, m - 1, d, hh - offsetHours, mm, 0, 0))
    const formatted = formatter.format(utc)
    const normalized = formatted.replace(/\//g, '-').replace(', ', 'T').replace(/\s/g, '')
    if (normalized.slice(0, 16) === targetNorm) {
      const oneHourLater = new Date(utc.getTime() + 60 * 60 * 1000)
      return oneHourLater.toISOString()
    }
  }

  // Fallback: treat as UTC, add 1 hour
  const fallback = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0))
  return new Date(fallback.getTime() + 60 * 60 * 1000).toISOString()
}
