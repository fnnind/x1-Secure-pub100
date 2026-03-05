'use server'

import { getUser } from '@/lib/supabase/user'
import { updateEvent as updateEventDb } from '@/lib/supabase/mutations'

export async function updateEvent(
  eventId: string,
  params: {
    title: string
    description?: string
    venue?: string
    city?: string
    country?: string
    conferenceUrl?: string
    recordedVideoUrl?: string
  }
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await getUser()
    if ('error' in user) return { error: 'Not authenticated' }

    if (!params.title?.trim()) return { error: 'Title is required' }

    return await updateEventDb(eventId, user._id, {
      title: params.title.trim(),
      description: params.description?.trim(),
      venue: params.venue?.trim(),
      city: params.city?.trim(),
      country: params.country?.trim(),
      conferenceUrl: params.conferenceUrl?.trim() || undefined,
      recordedVideoUrl: params.recordedVideoUrl?.trim() || undefined,
    })
  } catch (err) {
    console.error('updateEvent action error:', err)
    return { error: 'Failed to update event' }
  }
}
