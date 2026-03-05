'use server'

import { getUser } from '@/lib/supabase/user'
import { addEventFavorite, removeEventFavorite, isEventFavoritedByUser } from '@/lib/supabase/event-favorites'

export type ToggleEventFavoriteResult =
  | { favorited: boolean }
  | { error: string }

export async function toggleEventFavorite(eventId: string): Promise<ToggleEventFavoriteResult> {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }

    const currently = await isEventFavoritedByUser(user._id, eventId)
    if (currently) {
      const result = await removeEventFavorite(user._id, eventId)
      return 'error' in result ? result : { favorited: false }
    }
    const result = await addEventFavorite(user._id, eventId)
    return 'error' in result ? result : { favorited: true }
  } catch (err) {
    console.error('toggleEventFavorite action error:', err)
    return { error: 'Failed to update favorite' }
  }
}
