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

  // 1. Fetch all top-level comments
  const { data: rows } = await supabase
    .from('comment')
    .select(commentSelect)
    .eq('post_id', postId)
    .is('parent_comment_id', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!rows?.length) return []

  const commentIds = rows.map((r) => r.id)

  // 2. Batch-fetch all direct replies for these top-level comments
  const { data: replyRows } = await supabase
    .from('comment')
    .select(commentSelect)
    .in('parent_comment_id', commentIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  // 3. Batch-fetch all votes for top-level comments + replies in a single query
  const allIds = [...commentIds, ...(replyRows ?? []).map((r) => r.id)]
  const { data: allVotes } = await supabase
    .from('vote')
    .select('comment_id, vote_type, user_id')
    .in('comment_id', allIds)
    .or('is_deleted.eq.false,is_deleted.is.null')

  // Build aggregation maps from the single votes query
  const upMap = new Map<string, number>()
  const downMap = new Map<string, number>()
  const userVoteMap = new Map<string, 'upvote' | 'downvote'>()
  for (const v of allVotes ?? []) {
    const cid = v.comment_id as string
    if (v.vote_type === 'upvote') upMap.set(cid, (upMap.get(cid) ?? 0) + 1)
    else if (v.vote_type === 'downvote') downMap.set(cid, (downMap.get(cid) ?? 0) + 1)
    if (userId && v.user_id === userId) userVoteMap.set(cid, v.vote_type as 'upvote' | 'downvote')
  }

  const makeVotes = (id: string) => {
    const u = upMap.get(id) ?? 0
    const d = downMap.get(id) ?? 0
    return { upvotes: u, downvotes: d, netScore: u - d, voteStatus: userVoteMap.get(id) ?? null }
  }

  // Group replies by their parent comment id
  const repliesByParent = new Map<string, AppComment[]>()
  for (const row of replyRows ?? []) {
    const reply = mapComment(row, makeVotes(row.id))
    if (!reply) continue
    const parentId = row.parent_comment_id as string
    if (!repliesByParent.has(parentId)) repliesByParent.set(parentId, [])
    repliesByParent.get(parentId)!.push(reply)
  }
  for (const replies of repliesByParent.values()) {
    replies.sort((a, b) => (b.votes.netScore ?? 0) - (a.votes.netScore ?? 0))
  }

  // Assemble top-level comments with pre-fetched replies
  const comments: AppComment[] = []
  for (const row of rows) {
    const comment = mapComment(row, makeVotes(row.id))
    if (!comment) continue
    comment.replies = repliesByParent.get(row.id) ?? []
    comments.push(comment)
  }
  comments.sort((a, b) => (b.votes.netScore ?? 0) - (a.votes.netScore ?? 0))
  return comments
}

// Kept as an export for backward compatibility; use comment.replies in components where possible.
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
