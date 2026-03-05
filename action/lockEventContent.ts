'use server'

import { getUser } from '@/lib/supabase/user'
import { lockEventContent as lockEventContentDb } from '@/lib/supabase/mutations'

export async function lockEventContent(params: {
  eventId: string
  target: 'qa' | 'poll' | 'both'
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    return lockEventContentDb({ eventId: params.eventId, creatorId: user._id, target: params.target })
  } catch (err) {
    console.error('lockEventContent action error:', err)
    return { error: 'Failed to lock content' }
  }
}
