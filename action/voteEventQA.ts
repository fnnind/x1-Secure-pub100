'use server'

import { getUser } from '@/lib/supabase/user'
import { voteOnQuestion, voteOnAnswer } from '@/lib/supabase/mutations'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { revalidatePath } from 'next/cache'

export async function voteQuestion(params: {
  questionId: string
  voteType: 'upvote' | 'downvote' | null
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    // shared 'votes' bucket: 30 per user per 60 s
    const allowed = await checkRateLimit(`votes:${user._id}`, 60, 30)
    if (!allowed) return { error: 'Too many votes. Please slow down.' }
    const result = await voteOnQuestion({ questionId: params.questionId, userId: user._id, voteType: params.voteType })
    revalidatePath('/', 'layout')
    return result
  } catch (err) {
    console.error('voteQuestion action error:', err)
    return { error: 'Failed to vote' }
  }
}

export async function voteAnswer(params: {
  answerId: string
  voteType: 'upvote' | 'downvote' | null
}) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    // shared 'votes' bucket: 30 per user per 60 s
    const allowed = await checkRateLimit(`votes:${user._id}`, 60, 30)
    if (!allowed) return { error: 'Too many votes. Please slow down.' }
    const result = await voteOnAnswer({ answerId: params.answerId, userId: user._id, voteType: params.voteType })
    revalidatePath('/', 'layout')
    return result
  } catch (err) {
    console.error('voteAnswer action error:', err)
    return { error: 'Failed to vote' }
  }
}
