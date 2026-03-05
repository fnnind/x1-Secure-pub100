'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateEvent } from '@/action/updateEvent'
import type { AppEvent } from '@/lib/supabase/types'

interface Props {
  event: AppEvent
  publicationSlug: string
}

export function EditEventForm({ event: e, publicationSlug }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(e.title)
  const [description, setDescription] = useState(e.description ?? '')
  const [venue, setVenue] = useState(e.venue ?? '')
  const [city, setCity] = useState(e.city ?? '')
  const [country, setCountry] = useState(e.country ?? '')
  const [conferenceUrl, setConferenceUrl] = useState(e.conferenceUrl ?? '')
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(e.recordedVideoUrl ?? '')

  const back = `/p/${publicationSlug}/events/${e._id}`

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    setIsLoading(true)
    try {
      const result = await updateEvent(e._id, {
        title: title.trim(),
        description: description.trim() || undefined,
        venue: venue.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        conferenceUrl: conferenceUrl.trim() || undefined,
        recordedVideoUrl: recordedVideoUrl.trim() || undefined,
      })
      if ('error' in result) { setError(result.error); return }
      router.push(back)
      router.refresh()
    } catch {
      setError('Failed to save changes')
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
          onChange={(ev) => setTitle(ev.target.value)}
          placeholder="e.g. ICRA 2026 — Presentation"
          maxLength={200}
          required
        />
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Type</label>
          <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground capitalize">
            {e.eventTypeCustom ?? e.eventType.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {e.eventDate}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Venue</label>
          <Input
            value={venue}
            onChange={(ev) => setVenue(ev.target.value)}
            placeholder={e.isVirtual ? 'Zoom / Google Meet' : 'Austria Center Vienna'}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">City</label>
          <Input value={city} onChange={(ev) => setCity(ev.target.value)} placeholder="Vienna" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Country</label>
          <Input value={country} onChange={(ev) => setCountry(ev.target.value)} placeholder="Austria" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          placeholder="Describe this event…"
          rows={4}
          maxLength={2000}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Conference URL</label>
        <Input
          type="url"
          value={conferenceUrl}
          onChange={(ev) => setConferenceUrl(ev.target.value)}
          placeholder="https://2026.ieee-icra.org"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Recorded Video URL</label>
        <Input
          type="url"
          value={recordedVideoUrl}
          onChange={(ev) => setRecordedVideoUrl(ev.target.value)}
          placeholder="https://youtube.com/watch?v=…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading || !title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isLoading ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(back)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
