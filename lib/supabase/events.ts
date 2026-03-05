import { createClient } from './server'
import { mapEvent } from './mappers'
import type { AppEvent } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

const eventSelect = `
  id, publication_id, title, slug, description,
  event_type, event_type_custom,
  venue, city, region, country, is_virtual,
  event_date, start_date, end_date, event_time, timezone,
  conference_url, recorded_video_url, linked_url,
  is_qa_locked, is_poll_locked, created_at,
  creator:user(id, username, email, image_url),
  publication:publication(slug, title),
  event_url(id, url_type, url, label, added_by_user:user(id, username, email, image_url))
`.trim()

export async function getEventsForPublication(publicationId: string): Promise<AppEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .eq('publication_id', publicationId)
    .eq('is_deleted', false)
    .order('event_date', { ascending: false })
  if (!data?.length) return []
  return (data as AnyRow[]).map((row) => mapEvent(row)!).filter(Boolean)
}

export async function getEventById(id: string): Promise<AppEvent | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  return mapEvent(data as AnyRow)
}

export async function getEventBySlug(publicationId: string, slug: string): Promise<AppEvent | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .eq('publication_id', publicationId)
    .eq('slug', slug)
    .eq('is_deleted', false)
    .maybeSingle()
  return mapEvent(data as AnyRow)
}

export async function getStandaloneEventBySlug(slug: string): Promise<AppEvent | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .is('publication_id', null)
    .eq('slug', slug)
    .eq('is_deleted', false)
    .maybeSingle()
  return mapEvent(data as AnyRow)
}

export async function searchEvents(searchTerm: string): Promise<AppEvent[]> {
  if (!searchTerm?.trim()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .eq('is_deleted', false)
    .textSearch('search_vector', searchTerm.trim(), { type: 'websearch', config: 'english' })
    .order('event_date', { ascending: false })
  if (!data?.length) return []
  return (data as AnyRow[]).map((row) => mapEvent(row)!).filter(Boolean)
}

/** Events created by the given user. Default sort: most recent (created_at desc). */
export async function getEventsCreatedByUser(userId: string): Promise<AppEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event')
    .select(eventSelect)
    .eq('creator_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (!data?.length) return []
  return (data as AnyRow[]).map((row) => mapEvent(row)!).filter(Boolean)
}

/** All non-deleted events for landing/listings. Optional limit and sort. */
export async function getAllEvents(options?: {
  limit?: number
  sortBy?: 'created_at' | 'event_date'
  ascending?: boolean
}): Promise<AppEvent[]> {
  const supabase = await createClient()
  const sortBy = options?.sortBy ?? 'created_at'
  const ascending = options?.ascending ?? false
  let query = supabase
    .from('event')
    .select(eventSelect)
    .eq('is_deleted', false)
    .order(sortBy, { ascending })
  if (options?.limit != null && options.limit > 0) {
    query = query.limit(options.limit)
  }
  const { data } = await query
  if (!data?.length) return []
  return (data as AnyRow[]).map((row) => mapEvent(row)!).filter(Boolean)
}
