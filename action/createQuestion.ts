'use server'

import { getUser } from '@/lib/supabase/user'
import { createQuestion as createQuestionDb } from '@/lib/supabase/mutations'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function createQuestion(params: { eventId: string; content: string }) {
  try {
    const user = await getUser()
    if ('error' in user) return { error: user.error }
    if (!params.content?.trim()) return { error: 'Question content is required' }

    // 10 questions per user per 60 s
    const allowed = await checkRateLimit(`questions:${user._id}`, 60, 10)
    if (!allowed) return { error: 'Too many questions. Please wait a moment.' }
    return createQuestionDb({ eventId: params.eventId, authorId: user._id, content: params.content.trim() })
  } catch (err) {
    console.error('createQuestion action error:', err)
    return { error: 'Failed to post question' }
  }
}
