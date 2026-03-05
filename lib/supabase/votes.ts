import { createClient } from './server'
import type { VoteCounts } from './types'
import { generateId } from '@/lib/utils/id'

export async function getPostVotes(postId: string): Promise<VoteCounts> {
  const supabase = await createClient()
  const { count: upvotes } = await supabase
    .from('vote')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .eq('vote_type', 'upvote')
  const { count: downvotes } = await supabase
    .from('vote')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .eq('vote_type', 'downvote')
  const u = Number(upvotes ?? 0)
  const d = Number(downvotes ?? 0)
  return { upvotes: u, downvotes: d, netScore: u - d }
}

export async function getUserPostVoteStatus(
  postId: string,
  userId: string | null
): Promise<'upvote' | 'downvote' | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('vote')
    .select('vote_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .maybeSingle()
  return (data?.vote_type as 'upvote' | 'downvote') ?? null
}

export async function getCommentVotes(commentId: string): Promise<VoteCounts> {
  const supabase = await createClient()
  const { count: upvotes } = await supabase
    .from('vote')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .eq('vote_type', 'upvote')
  const { count: downvotes } = await supabase
    .from('vote')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .eq('vote_type', 'downvote')
  const u = Number(upvotes ?? 0)
  const d = Number(downvotes ?? 0)
  return { upvotes: u, downvotes: d, netScore: u - d }
}

export async function getUserCommentVoteStatus(
  commentId: string,
  userId: string | null
): Promise<'upvote' | 'downvote' | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('vote')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .maybeSingle()
  return (data?.vote_type as 'upvote' | 'downvote') ?? null
}


// --- Mutations ---

export async function upvotePost(postId: string, userId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vote')
    .select('id, vote_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'upvote') {
      await supabase.from('vote').update({ is_deleted: true }).eq('id', existing.id)
      return
    }
    await supabase.from('vote').update({ vote_type: 'upvote', is_deleted: false }).eq('id', existing.id)
    return
  }
  await supabase.from('vote').insert({ id: generateId(), user_id: userId, post_id: postId, vote_type: 'upvote' })
}

export async function downvotePost(postId: string, userId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vote')
    .select('id, vote_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'downvote') {
      await supabase.from('vote').update({ is_deleted: true }).eq('id', existing.id)
      return
    }
    await supabase.from('vote').update({ vote_type: 'downvote', is_deleted: false }).eq('id', existing.id)
    return
  }
  await supabase.from('vote').insert({ id: generateId(), user_id: userId, post_id: postId, vote_type: 'downvote' })
}

export async function upvoteComment(commentId: string, userId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vote')
    .select('id, vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'upvote') {
      await supabase.from('vote').update({ is_deleted: true }).eq('id', existing.id)
      return
    }
    await supabase.from('vote').update({ vote_type: 'upvote', is_deleted: false }).eq('id', existing.id)
    return
  }
  await supabase.from('vote').insert({ id: generateId(), user_id: userId, comment_id: commentId, vote_type: 'upvote' })
}

export async function downvoteComment(commentId: string, userId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('vote')
    .select('id, vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'downvote') {
      await supabase.from('vote').update({ is_deleted: true }).eq('id', existing.id)
      return
    }
    await supabase.from('vote').update({ vote_type: 'downvote', is_deleted: false }).eq('id', existing.id)
    return
  }
  await supabase.from('vote').insert({ id: generateId(), user_id: userId, comment_id: commentId, vote_type: 'downvote' })
}
