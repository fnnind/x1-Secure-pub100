'use server'

import { getUser } from '@/lib/supabase/user'
import { upvotePubComment, downvotePubComment } from '@/lib/supabase/publication-comments'

export async function votePubComment(
  commentId: string,
  voteType: 'upvote' | 'downvote'
): Promise<{ ok: true } | { error: string }> {
  const user = await getUser()
  if ('error' in user) return { error: user.error }

  if (voteType === 'upvote') {
    await upvotePubComment(commentId, user._id)
  } else {
    await downvotePubComment(commentId, user._id)
  }

  return { ok: true }
}
