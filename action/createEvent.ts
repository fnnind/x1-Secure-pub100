'use server'

import { getUser } from '@/lib/supabase/user'
import { createEvent as createEventDb } from '@/lib/supabase/mutations'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function createEvent(params: {
  publicationId?: string
  title: string
  slug?: string
  description?: string
  eventType: string
  eventTypeCustom?: string
  venue?: string
  city?: string
  region?: string
  country?: string
  isVirtual?: boolean
  eventDate: string
  startDate?: string
  endDate?: string
  eventTime?: string
  timezone?: string
  conferenceUrl?: string
  linkedUrl?: string
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }

    if (!params.title?.trim()) return { error: 'Title is required' }
    if (!params.eventDate) return { error: 'Event date is required' }
    if (!params.isVirtual && !params.venue?.trim()) return { error: 'Venue is required for in-person events' }

    const slug = params.slug?.trim() || generateSlug(params.title)

    return createEventDb({
      ...params,
      title: params.title.trim(),
      slug,
      creatorId: user._id,
    })
  } catch (err) {
    console.error('createEvent action error:', err)
    return { error: 'Failed to create event' }
  }
}
