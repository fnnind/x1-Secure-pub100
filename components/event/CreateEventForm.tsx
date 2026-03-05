'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createEvent } from '@/action/createEvent'

const EVENT_TYPES = [
  { value: 'conference', label: 'Conference' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'symposium', label: 'Symposium' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'poster_session', label: 'Poster Session' },
  { value: 'panel', label: 'Panel' },
  { value: 'other', label: 'Other (specify below)' },
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Vienna', 'Asia/Tokyo',
  'Asia/Singapore', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland',
]

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

interface Props {
  publicationId?: string
  publicationSlug?: string
}

export function CreateEventForm({ publicationId, publicationSlug }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('conference')
  const [eventTypeCustom, setEventTypeCustom] = useState('')
  const [isVirtual, setIsVirtual] = useState(false)
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [conferenceUrl, setConferenceUrl] = useState('')
  const [linkedUrl, setLinkedUrl] = useState('')

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!slugEdited) setSlug(generateSlug(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    if (!eventDate) { setError('Event date is required'); return }
    if (!isVirtual && !venue.trim()) { setError('Venue is required for in-person events'); return }
    if (isMultiDay && endDate && startDate && endDate < startDate) {
      setError('End date must be on or after start date')
      return
    }

    setIsLoading(true)
    try {
      const result = await createEvent({
        publicationId,
        title: title.trim(),
        slug: slug || undefined,
        description: description.trim() || undefined,
        eventType,
        eventTypeCustom: eventType === 'other' ? eventTypeCustom.trim() || undefined : undefined,
        isVirtual,
        venue: isVirtual ? (venue.trim() || 'Online') : venue.trim(),
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        eventDate,
        startDate: isMultiDay ? startDate || undefined : undefined,
        endDate: isMultiDay ? endDate || undefined : undefined,
        eventTime: eventTime || undefined,
        timezone,
        conferenceUrl: conferenceUrl.trim() || undefined,
        linkedUrl: linkedUrl.trim() || undefined,
      })

      if ('error' in result) { setError(result.error); return }
      if ('event' in result) {
        if (publicationSlug) {
          router.push(`/p/${publicationSlug}/events/${result.event._id}`)
        } else {
          router.push(`/events/${result.event._id}`)
        }
      }
    } catch {
      setError('Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Event Title *</label>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. ICRA 2026 — Presentation"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">URL Slug</label>
        <div className="flex items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
          <span className="mr-1 shrink-0 text-muted-foreground">…/events/</span>
          <input
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true) }}
            placeholder="auto-generated"
            className="flex-1 bg-transparent py-2 outline-none"
            maxLength={60}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Event Type *</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {eventType === 'other' && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Custom Type Label</label>
            <Input
              value={eventTypeCustom}
              onChange={(e) => setEventTypeCustom(e.target.value)}
              placeholder="e.g. Lab Demo"
              maxLength={50}
            />
          </div>
        )}
      </div>

      {/* Virtual toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isVirtual}
          onChange={(e) => setIsVirtual(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Virtual / Online event</span>
      </label>

      {/* Venue / location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Venue {isVirtual ? '(optional)' : '*'}
          </label>
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={isVirtual ? 'Zoom / Google Meet' : 'Austria Center Vienna'}
            required={!isVirtual}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Vienna" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Country</label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Austria" />
        </div>
      </div>

      {/* Date */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Event Date *</label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Start Time</label>
            <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isMultiDay}
            onChange={(e) => setIsMultiDay(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Multi-day event</span>
        </label>

        {isMultiDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date *</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this event…"
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Conference URL</label>
        <Input
          type="url"
          value={conferenceUrl}
          onChange={(e) => setConferenceUrl(e.target.value)}
          placeholder="https://2026.ieee-icra.org"
        />
      </div>

      {!publicationId && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Link URL (optional — /x/slug or /p/slug)</label>
          <Input
            value={linkedUrl}
            onChange={(e) => setLinkedUrl(e.target.value)}
            placeholder="/x/deep-learning or /p/my-paper"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !title.trim() || !eventDate}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5"
      >
        {isLoading ? 'Creating…' : 'Create Event'}
      </Button>
    </form>
  )
}
