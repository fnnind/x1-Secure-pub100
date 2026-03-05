import { createClient } from './server'
import { mapComment } from './mappers'
import type { AppComment, VoteCounts } from './types'

const commentSelect = 'id, content, created_at, author:user(id, username, email, image_url)'

// ─── Vote helpers ────────────────────────────────────────────────────────────

export async function getPubCommentVotes(commentId: string): Promise<VoteCounts> {
  const supabase = await createClient()
  const [{ count: up }, { count: dn }] = await Promise.all([
    supabase
      .from('publication_comment_vote')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('vote_type', 'upvote'),
    supabase
      .from('publication_comment_vote')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('vote_type', 'downvote'),
  ])
  const u = Number(up ?? 0)
  const d = Number(dn ?? 0)
  return { upvotes: u, downvotes: d, netScore: u - d }
}

export async function getUserPubCommentVoteStatus(
  commentId: string,
  userId: string | null
): Promise<'upvote' | 'downvote' | null> {
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('publication_comment_vote')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.vote_type as 'upvote' | 'downvote') ?? null
}

// ─── Vote mutations ───────────────────────────────────────────────────────────

export async function upvotePubComment(commentId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('publication_comment_vote')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'upvote') {
      await supabase
        .from('publication_comment_vote')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
      return
    }
    await supabase
      .from('publication_comment_vote')
      .update({ vote_type: 'upvote' })
      .eq('comment_id', commentId)
      .eq('user_id', userId)
    return
  }
  await supabase
    .from('publication_comment_vote')
    .insert({ comment_id: commentId, user_id: userId, vote_type: 'upvote' })
}

export async function downvotePubComment(commentId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('publication_comment_vote')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.vote_type === 'downvote') {
      await supabase
        .from('publication_comment_vote')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
      return
    }
    await supabase
      .from('publication_comment_vote')
      .update({ vote_type: 'downvote' })
      .eq('comment_id', commentId)
      .eq('user_id', userId)
    return
  }
  await supabase
    .from('publication_comment_vote')
    .insert({ comment_id: commentId, user_id: userId, vote_type: 'downvote' })
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

async function getPubCommentReplies(
  parentId: string,
  userId: string | null
): Promise<AppComment[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('publication_comment')
    .select(commentSelect)
    .eq('parent_id', parentId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
  if (!rows?.length) return []

  const comments: AppComment[] = []
  for (const row of rows) {
    const votes = await getPubCommentVotes(row.id)
    const voteStatus = await getUserPubCommentVoteStatus(row.id, userId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = mapComment(row as any, { ...votes, voteStatus })
    if (c) comments.push(c)
  }
  return comments
}

export async function getPublicationComments(
  publicationId: string,
  userId: string | null
): Promise<AppComment[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('publication_comment')
    .select(commentSelect)
    .eq('publication_id', publicationId)
    .is('parent_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []

  const comments: AppComment[] = []
  for (const row of rows) {
    const votes = await getPubCommentVotes(row.id)
    const voteStatus = await getUserPubCommentVoteStatus(row.id, userId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = mapComment(row as any, { ...votes, voteStatus })
    if (c) {
      c.replies = await getPubCommentReplies(row.id, userId)
      comments.push(c)
    }
  }
  comments.sort((a, b) => (b.votes.netScore ?? 0) - (a.votes.netScore ?? 0))
  return comments
}

export async function getPublicationCommentCount(publicationId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('publication_comment')
    .select('id', { count: 'exact', head: true })
    .eq('publication_id', publicationId)
    .eq('is_deleted', false)
  return count ?? 0
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function addPublicationComment(params: {
  publicationId: string
  authorId: string
  content: string
  parentId?: string | null
}): Promise<{ commentId: string } | { error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('publication_comment')
    .insert({
      publication_id: params.publicationId,
      author_id: params.authorId,
      content: params.content,
      parent_id: params.parentId ?? null,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { commentId: (data as { id: string }).id }
}
