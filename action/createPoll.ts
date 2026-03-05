'use server'

import { getUser } from '@/lib/supabase/user'
import { createPoll as createPollDb } from '@/lib/supabase/mutations'

export async function createPoll(params: {
  eventId: string
  question: string
  description?: string
  allowMultipleChoice?: boolean
  closesAt: string
  showResultsBeforeClose?: boolean
  options: string[]
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    if (!params.question?.trim()) return { error: 'Poll question is required' }
    if (params.options.filter((o) => o.trim()).length < 2) return { error: 'At least 2 options required' }
    if (!params.closesAt) return { error: 'Close date/time is required' }
    if (new Date(params.closesAt) <= new Date()) return { error: 'Close time must be in the future' }

    return createPollDb({
      ...params,
      creatorId: user._id,
      options: params.options.filter((o) => o.trim()),
    })
  } catch (err) {
    console.error('createPoll action error:', err)
    return { error: 'Failed to create poll' }
  }
}
