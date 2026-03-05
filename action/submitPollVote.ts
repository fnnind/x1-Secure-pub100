'use server'

import { getUser } from '@/lib/supabase/user'
import { submitPollVote as submitPollVoteDb } from '@/lib/supabase/mutations'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { revalidatePath } from 'next/cache'

export async function submitPollVote(params: { pollId: string; optionIds: string[] }) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    if (!params.optionIds.length) return { error: 'Please select an option' }

    // 5 poll submissions per user per 60 s
    const allowed = await checkRateLimit(`poll_votes:${user._id}`, 60, 5)
    if (!allowed) return { error: 'Too many poll submissions. Please wait a moment.' }
    const result = await submitPollVoteDb({ pollId: params.pollId, optionIds: params.optionIds, userId: user._id })
    revalidatePath('/', 'layout')
    return result
  } catch (err) {
    console.error('submitPollVote action error:', err)
    return { error: 'Failed to submit vote' }
  }
}
