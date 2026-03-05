import { createClient } from './server'
import { mapComment } from './mappers'
import { getCommentVotes, getUserCommentVoteStatus } from './votes'
import type { AppComment } from './types'

const commentSelect = 'id, content, created_at, author:user(id, username, email, image_url)'

export async function getPostComments(
  postId: string,
  userId: string | null
): Promise<AppComment[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('comment')
    .select(commentSelect)
    .eq('post_id', postId)
    .is('parent_comment_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []
  const comments: AppComment[] = []
  for (const row of rows) {
    const votes = await getCommentVotes(row.id)
    const voteStatus = await getUserCommentVoteStatus(row.id, userId)
    const comment = mapComment(row, {
      ...votes,
      voteStatus,
    })
    if (comment) {
      comment.replies = await getCommentReplies(row.id, userId)
      comments.push(comment)
    }
  }
  comments.sort((a, b) => (b.votes.netScore ?? 0) - (a.votes.netScore ?? 0))
  return comments
}

export async function getCommentReplies(
  commentId: string,
  userId: string | null
): Promise<AppComment[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('comment')
    .select(commentSelect)
    .eq('parent_comment_id', commentId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []
  const comments: AppComment[] = []
  for (const row of rows) {
    const votes = await getCommentVotes(row.id)
    const voteStatus = await getUserCommentVoteStatus(row.id, userId)
    const comment = mapComment(row, { ...votes, voteStatus })
    if (comment) comments.push(comment)
  }
  comments.sort((a, b) => (b.votes.netScore ?? 0) - (a.votes.netScore ?? 0))
  return comments
}

export async function getCommentById(commentId: string): Promise<AppComment | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('comment')
    .select(commentSelect)
    .eq('id', commentId)
    .maybeSingle()
  if (!data) return null
  const votes = await getCommentVotes(data.id)
  return mapComment(data, { ...votes, voteStatus: null })
}
