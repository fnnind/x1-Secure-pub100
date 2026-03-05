import { createClient } from './server'
import { mapEventQuestion, mapEventAnswer } from './mappers'
import type { AppEventQuestion, AppEventAnswer } from './types'

type VoteMeta = { upvotes: number; downvotes: number; netScore: number; voteStatus: 'upvote' | 'downvote' | null }

function emptyVotes(): VoteMeta {
  return { upvotes: 0, downvotes: 0, netScore: 0, voteStatus: null }
}

/** Build a per-id VoteMeta map from a flat list of vote rows. */
function buildVoteMap(
  rows: Array<{ vote_type: string; user_id: string; [key: string]: unknown }>,
  idField: string,
  userId: string | null
): Map<string, VoteMeta> {
  const map = new Map<string, VoteMeta>()
  for (const row of rows) {
    const id = row[idField] as string
    if (!map.has(id)) map.set(id, emptyVotes())
    const meta = map.get(id)!
    if (row.vote_type === 'upvote') meta.upvotes++
    else if (row.vote_type === 'downvote') meta.downvotes++
    if (userId && row.user_id === userId) {
      meta.voteStatus = row.vote_type as VoteMeta['voteStatus']
    }
  }
  // Compute netScore now that all rows are counted
  for (const meta of map.values()) {
    meta.netScore = meta.upvotes - meta.downvotes
  }
  return map
}

export type QASortMode = 'top' | 'recent' | 'pinned'

export async function getQuestionsForEvent(
  eventId: string,
  userId: string | null,
  sort: QASortMode = 'top'
): Promise<AppEventQuestion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_question')
    .select('id, content, is_pinned, is_deleted, created_at, author:user(id, username, email, image_url)')
    .eq('event_id', eventId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: sort === 'recent' ? false : true })

  if (!data?.length) return []

  // Single batch query for all question votes
  const questionIds = data.map((r) => r.id)
  const { data: voteRows } = await supabase
    .from('event_question_vote')
    .select('question_id, vote_type, user_id')
    .in('question_id', questionIds)

  const voteMap = buildVoteMap(voteRows ?? [], 'question_id', userId)

  const filtered = data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row) => mapEventQuestion(row as any, voteMap.get(row.id) ?? emptyVotes()))
    .filter(Boolean) as AppEventQuestion[]

  if (sort === 'top') {
    filtered.sort((a, b) => b.votes.netScore - a.votes.netScore || a.createdAt.localeCompare(b.createdAt))
  } else if (sort === 'pinned') {
    filtered.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.votes.netScore - a.votes.netScore)
  }

  return filtered
}

export async function getAnswersForQuestion(
  questionId: string,
  userId: string | null
): Promise<AppEventAnswer[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_answer')
    .select('id, content, is_accepted, is_deleted, created_at, author:user(id, username, email, image_url)')
    .eq('question_id', questionId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (!data?.length) return []

  // Single batch query for all answer votes
  const answerIds = data.map((r) => r.id)
  const { data: voteRows } = await supabase
    .from('event_answer_vote')
    .select('answer_id, vote_type, user_id')
    .in('answer_id', answerIds)

  const voteMap = buildVoteMap(voteRows ?? [], 'answer_id', userId)

  return data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row) => mapEventAnswer(row as any, voteMap.get(row.id) ?? emptyVotes()))
    .filter(Boolean) as AppEventAnswer[]
}
