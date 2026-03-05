import { createClient } from './server'
import { mapPost } from './mappers'
import type { AppPost } from './types'

const postSelect = 'id, title, body, published_at, image_url, image_alt, is_deleted, author:user(id, username, email, image_url), subxeuron:subxeuron(id, title, slug, description, image_url, image_alt, created_at)'

export async function getPosts(): Promise<AppPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post')
    .select(postSelect)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
  if (!data?.length) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row) => mapPost(row as any)!)
}

export async function getPostById(postId: string): Promise<AppPost | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post')
    .select(postSelect)
    .eq('id', postId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapPost(data as any)
}

export async function getPostsForSubxeuron(id: string): Promise<AppPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post')
    .select(postSelect)
    .eq('subxeuron_id', id)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
  if (!data?.length) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return aggregateVotes(supabase, data.map((row) => mapPost(row as any)!))
}

async function aggregateVotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  posts: AppPost[]
): Promise<AppPost[]> {
  if (!posts.length) return posts
  const postIds = posts.map((p) => p._id)
  const { data: allVotes } = await supabase
    .from('vote')
    .select('post_id, vote_type')
    .in('post_id', postIds)
    .or('is_deleted.eq.false,is_deleted.is.null')

  const votesMap = new Map<string, { upvotes: number; downvotes: number }>()
  for (const v of allVotes ?? []) {
    const key = v.post_id as string
    if (!votesMap.has(key)) votesMap.set(key, { upvotes: 0, downvotes: 0 })
    const counts = votesMap.get(key)!
    if (v.vote_type === 'upvote') counts.upvotes++
    else if (v.vote_type === 'downvote') counts.downvotes++
  }
  for (const post of posts) {
    const counts = votesMap.get(post._id) ?? { upvotes: 0, downvotes: 0 }
    post.upvotes = counts.upvotes
    post.downvotes = counts.downvotes
    post.netScore = counts.upvotes - counts.downvotes
  }
  return posts
}

export async function getPostsForPublication(id: string): Promise<AppPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post')
    .select(postSelect)
    .eq('publication_id', id)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
  if (!data?.length) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return aggregateVotes(supabase, data.map((row) => mapPost(row as any)!))
}

export async function getPostsForEvent(id: string): Promise<AppPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post')
    .select(postSelect)
    .eq('event_id', id)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
  if (!data?.length) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return aggregateVotes(supabase, data.map((row) => mapPost(row as any)!))
}
